import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Meeting, { IMeeting } from '@/models/Meeting';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar el token y obtener el ID del usuario
    const userId = await verifyToken(token);

    // Conectar a la base de datos
    await connectDB();

    // Obtener todas las reuniones del usuario
    const meetings = await Meeting.find({ userId })
      .sort({ date: -1 })
      .lean();

    // Retornar las reuniones
    return NextResponse.json({
      meetings: meetings.map(meeting => ({
        id: (meeting as unknown as { _id: Types.ObjectId })._id.toString(),
        title: (meeting as unknown as IMeeting).title,
        date: (meeting as unknown as IMeeting).date,
        duration: (meeting as unknown as IMeeting).duration,
        status: (meeting as unknown as IMeeting).status,
        summary: (meeting as unknown as IMeeting).summary || '',
        assistantConfig: (meeting as unknown as IMeeting).assistantConfig
      }))
    });

  } catch (error) {
    console.error('Error al obtener las reuniones:', error);
    return NextResponse.json(
      { error: 'Error al obtener las reuniones' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar el token y obtener el ID del usuario
    const userId = await verifyToken(token);

    // Conectar a la base de datos
    await connectDB();

    // Obtener los datos de la reunión del cuerpo de la petición
    const meetingData = await req.json();

    // Crear la reunión con el ID del usuario
    const meeting = await Meeting.create({
      ...meetingData,
      userId,
      status: 'scheduled',
      assistantVoiceId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_VOICE_ID,
      transcription: []
    });

    // Retornar la reunión creada
    return NextResponse.json({
      id: meeting._id.toString(),
      title: meeting.title,
      date: meeting.date,
      duration: meeting.duration,
      status: meeting.status,
      assistantConfig: meeting.assistantConfig
    });

  } catch (error) {
    console.error('Error al crear la reunión:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear la reunión' },
      { status: 500 }
    );
  }
} 