import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Newsletter from '@/models/Newsletter';
import NewsletterIssue from '@/models/NewsletterIssue';
import Subscriber from '@/models/Subscriber';
import { verifyToken } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = await verifyToken(token);
    const { id } = await params;
    await connectDB();

    const newsletter = await Newsletter.findOne({ _id: id, userId }).select('-aiApiKey');
    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter no encontrado' }, { status: 404 });
    }

    const [issueCount, activeSubscribers] = await Promise.all([
      NewsletterIssue.countDocuments({ newsletterId: id }),
      Subscriber.countDocuments({ newsletterId: id, status: 'active' }),
    ]);

    return NextResponse.json({
      ...newsletter.toObject(),
      issueCount,
      activeSubscribers,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Token invalido') {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al obtener newsletter' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = await verifyToken(token);
    const { id } = await params;
    await connectDB();

    const newsletter = await Newsletter.findOne({ _id: id, userId });
    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { name, slug, description, topic, frequency, style, accentColor, isActive, aiProvider, aiModel, aiApiKey } = body;

    if (slug && slug !== newsletter.slug) {
      const existing = await Newsletter.findOne({ slug, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ error: 'Ya existe un newsletter con ese slug' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (topic !== undefined) updateData.topic = topic;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (style !== undefined) updateData.style = style;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (aiProvider !== undefined) updateData.aiProvider = aiProvider;
    if (aiModel !== undefined) updateData.aiModel = aiModel;
    if (aiApiKey) updateData.aiApiKey = encrypt(aiApiKey);

    const updated = await Newsletter.findByIdAndUpdate(id, updateData, { new: true }).select('-aiApiKey');

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Token invalido') {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
    }
    console.error('Error updating newsletter:', error);
    return NextResponse.json({ error: 'Error al actualizar newsletter' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = await verifyToken(token);
    const { id } = await params;
    await connectDB();

    const newsletter = await Newsletter.findOne({ _id: id, userId });
    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter no encontrado' }, { status: 404 });
    }

    await Promise.all([
      Newsletter.findByIdAndDelete(id),
      NewsletterIssue.deleteMany({ newsletterId: id }),
      Subscriber.deleteMany({ newsletterId: id }),
    ]);

    return NextResponse.json({ message: 'Newsletter eliminado' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Token invalido') {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al eliminar newsletter' }, { status: 500 });
  }
}
