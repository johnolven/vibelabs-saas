import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import Newsletter from '@/models/Newsletter';
import NewsletterIssue from '@/models/NewsletterIssue';
import { generateNewsletterContent } from '@/lib/ai';
import { generateEmailHtml, generatePlainText } from '@/lib/newsletter-template';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = await verifyToken(token);
    await connectDB();

    const { id } = await params;
    const newsletter = await Newsletter.findOne({ _id: id, userId });

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter no encontrado' }, { status: 404 });
    }

    if (!newsletter.aiApiKey) {
      return NextResponse.json({ error: 'No hay API key configurada para este newsletter' }, { status: 400 });
    }

    // Generate content with AI
    const content = await generateNewsletterContent(newsletter);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${appUrl}/n/${newsletter.slug}/unsubscribe`;

    // Generate HTML and plain text
    const contentHtml = generateEmailHtml({
      newsletterName: newsletter.name,
      subject: content.subject,
      sections: content.sections,
      accentColor: newsletter.accentColor || '#6366f1',
      unsubscribeUrl,
      appUrl,
    });

    const contentText = generatePlainText({
      newsletterName: newsletter.name,
      subject: content.subject,
      sections: content.sections,
      unsubscribeUrl,
    });

    // Save issue
    const issue = await NewsletterIssue.create({
      newsletterId: newsletter._id,
      subject: content.subject,
      contentHtml,
      contentText,
      generatedAt: new Date(),
      status: 'draft',
    });

    // Update newsletter
    newsletter.lastGeneratedAt = new Date();
    await newsletter.save();

    return NextResponse.json(issue);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error generating newsletter:', message);

    if (message.includes('401') || message.includes('invalid') || message.includes('Incorrect API key')) {
      return NextResponse.json({ error: 'API key invalida. Verifica tu configuracion de IA.' }, { status: 400 });
    }

    return NextResponse.json({ error: `Error al generar: ${message}` }, { status: 500 });
  }
}
