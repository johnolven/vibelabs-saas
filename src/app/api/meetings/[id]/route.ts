import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Meeting, { IMeeting } from '@/models/Meeting';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
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

    // Obtener la reunión
    const meeting = await Meeting.findOne({
      _id: new Types.ObjectId(id),
      userId
    }).lean() as (IMeeting & { _id: Types.ObjectId }) | null;

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Retornar la reunión
    return NextResponse.json({
      id: meeting._id.toString(),
      title: meeting.title,
      date: meeting.date,
      duration: meeting.duration,
      status: meeting.status,
      summary: meeting.summary || '',
      assistantConfig: meeting.assistantConfig
    });

  } catch (error) {
    console.error('Error al obtener la reunión:', error);
    return NextResponse.json(
      { error: 'Error al obtener la reunión' },
      { status: 500 }
    );
  }
} 