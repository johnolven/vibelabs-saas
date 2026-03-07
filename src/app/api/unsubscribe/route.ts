import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { email, newsletterId } = await req.json();

    if (!email || !newsletterId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    await connectDB();

    const Subscriber = mongoose.models.Subscriber;
    const Newsletter = mongoose.models.Newsletter;
    if (!Subscriber || !Newsletter) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    const subscriber = await Subscriber.findOne({
      email: email.toLowerCase(),
      newsletterId,
      status: 'active',
    });

    if (!subscriber) {
      return NextResponse.json({ message: 'No se encontro suscripcion activa' });
    }

    subscriber.status = 'unsubscribed';
    await subscriber.save();

    await Newsletter.findByIdAndUpdate(newsletterId, { $inc: { subscriberCount: -1 } });

    return NextResponse.json({ message: 'Desuscrito exitosamente' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
