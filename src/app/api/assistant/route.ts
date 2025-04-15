import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Assistant from '@/models/Assistant';
import { verifyToken } from '@/lib/auth';

// GET - Obtener la configuración del asistente
export async function GET(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = await verifyToken(token);
    await connectDB();

    const assistant = await Assistant.findOne({ userId });
    if (!assistant) {
      // Si no existe, devolver un objeto vacío pero con estructura válida
      return NextResponse.json({
        name: '',
        objective: '',
        openingPhrase: '',
        knowledgeBase: '',
        links: ['']
      });
    }

    return NextResponse.json(assistant);
  } catch (error) {
    console.error('Error al obtener el asistente:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración del asistente' },
      { status: 500 }
    );
  }
}

// POST - Crear o actualizar la configuración del asistente
export async function POST(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = await verifyToken(token);
    const data = await req.json();

    await connectDB();

    // Validar los datos requeridos
    if (!data.name || !data.objective || !data.openingPhrase || !data.knowledgeBase) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Actualizar o crear nuevo
    const assistant = await Assistant.findOneAndUpdate(
      { userId },
      { 
        userId,
        name: data.name,
        objective: data.objective,
        openingPhrase: data.openingPhrase,
        knowledgeBase: data.knowledgeBase,
        links: data.links.filter((link: string) => link.trim() !== '') // Filtrar enlaces vacíos
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      message: 'Configuración del asistente guardada exitosamente',
      assistant
    });
  } catch (error) {
    console.error('Error al guardar el asistente:', error);
    return NextResponse.json(
      { error: 'Error al guardar la configuración del asistente' },
      { status: 500 }
    );
  }
} 