import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    await connectDB();

    const Newsletter = mongoose.models.Newsletter;
    if (!Newsletter) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    const newsletter = await Newsletter.findOne({ slug, isActive: true })
      .select('name slug description topic frequency style accentColor subscriberCount createdAt')
      .lean() as Record<string, unknown> | null;

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter no encontrado' }, { status: 404 });
    }

    // Get the latest sent issue
    const NewsletterIssue = mongoose.models.NewsletterIssue;
    let latestIssue = null;
    if (NewsletterIssue) {
      latestIssue = await NewsletterIssue.findOne({
        newsletterId: newsletter._id,
        status: 'sent',
      })
        .sort({ sentAt: -1 })
        .select('subject contentHtml sentAt')
        .lean();
    }

    return NextResponse.json({
      newsletter,
      latestIssue,
    });
  } catch (error) {
    console.error('Public newsletter error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
