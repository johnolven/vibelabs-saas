import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Newsletter from '@/models/Newsletter';
import { verifyToken } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = await verifyToken(token);
    await connectDB();

    const newsletters = await Newsletter.find({ userId })
      .select('-aiApiKey')
      .sort({ createdAt: -1 });

    return NextResponse.json(newsletters);
  } catch (error) {
    if (error instanceof Error && error.message === 'Token invalido') {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al obtener newsletters' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = await verifyToken(token);
    await connectDB();

    const body = await req.json();
    const { name, slug, description, topic, frequency, style, accentColor, aiProvider, aiModel, aiApiKey } = body;

    if (!name || !slug || !description || !topic || !aiApiKey) {
      return NextResponse.json({ error: 'Campos requeridos: name, slug, description, topic, aiApiKey' }, { status: 400 });
    }

    const existing = await Newsletter.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un newsletter con ese slug' }, { status: 409 });
    }

    const encryptedKey = encrypt(aiApiKey);

    const newsletter = await Newsletter.create({
      userId,
      name,
      slug,
      description,
      topic,
      frequency: frequency || 'weekly',
      style: style || 'professional',
      accentColor: accentColor || '#6366f1',
      aiProvider: aiProvider || 'openai',
      aiModel: aiModel || 'gpt-4o-mini',
      aiApiKey: encryptedKey,
    });

    const result = newsletter.toObject();
    delete result.aiApiKey;

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Token invalido') {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
    }
    console.error('Error creating newsletter:', error);
    return NextResponse.json({ error: 'Error al crear newsletter' }, { status: 500 });
  }
}
