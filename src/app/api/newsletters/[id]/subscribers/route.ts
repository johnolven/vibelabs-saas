import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Newsletter from '@/models/Newsletter';
import Subscriber from '@/models/Subscriber';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status');

    const query: Record<string, unknown> = { newsletterId: id };
    if (status) query.status = status;

    const [subscribers, total] = await Promise.all([
      Subscriber.find(query)
        .sort({ subscribedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Subscriber.countDocuments(query),
    ]);

    return NextResponse.json({
      subscribers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Token invalido') {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al obtener suscriptores' }, { status: 500 });
  }
}
