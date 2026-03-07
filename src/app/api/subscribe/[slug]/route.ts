import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalido' }, { status: 400 });
    }

    await connectDB();

    const Newsletter = mongoose.models.Newsletter;
    if (!Newsletter) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    const newsletter = await Newsletter.findOne({ slug, isActive: true });
    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter no encontrado' }, { status: 404 });
    }

    const Subscriber = mongoose.models.Subscriber;
    if (!Subscriber) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    // Check if already subscribed
    const existing = await Subscriber.findOne({ email: email.toLowerCase(), newsletterId: newsletter._id });
    if (existing) {
      if (existing.status === 'unsubscribed') {
        existing.status = 'active';
        existing.subscribedAt = new Date();
        await existing.save();
        await Newsletter.findByIdAndUpdate(newsletter._id, { $inc: { subscriberCount: 1 } });
        return NextResponse.json({ message: 'Re-suscrito exitosamente' });
      }
      return NextResponse.json({ message: 'Ya estas suscrito' });
    }

    await Subscriber.create({
      email: email.toLowerCase(),
      newsletterId: newsletter._id,
      status: 'active',
      subscribedAt: new Date(),
    });

    await Newsletter.findByIdAndUpdate(newsletter._id, { $inc: { subscriberCount: 1 } });

    return NextResponse.json({ message: 'Suscrito exitosamente' });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
