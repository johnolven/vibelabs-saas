import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Newsletter from '@/models/Newsletter';
import NewsletterIssue from '@/models/NewsletterIssue';
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
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const [issues, total] = await Promise.all([
      NewsletterIssue.find({ newsletterId: id })
        .select('-contentHtml -contentText')
        .sort({ generatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      NewsletterIssue.countDocuments({ newsletterId: id }),
    ]);

    return NextResponse.json({
      issues,
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
    return NextResponse.json({ error: 'Error al obtener issues' }, { status: 500 });
  }
}
