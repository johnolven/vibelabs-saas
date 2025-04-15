import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Meeting from '@/models/Meeting';

export async function POST(req: Request) {
  try {
    const { meetingId, transcription, recordingUrl, status } = await req.json();

    // Conectar a la base de datos
    await connectDB();

    // Actualizar la reunión
    const meeting = await Meeting.findByIdAndUpdate(
      meetingId,
      {
        transcription,
        recordingUrl,
        status,
      },
      { new: true }
    );

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Reunión actualizada exitosamente',
      meeting
    });

  } catch (error) {
    console.error('Error al actualizar la reunión:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la reunión' },
      { status: 500 }
    );
  }
} 