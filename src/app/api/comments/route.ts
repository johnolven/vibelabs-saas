import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Comment from '@/models/Comment';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { canComment } from '@/lib/permissions';

// GET: Obtener comentarios de un documento, update o métrica
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = await verifyToken(token);
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parentType = searchParams.get('parentType');
    const parentId = searchParams.get('parentId');
    const parentCommentId = searchParams.get('parentCommentId'); // Para respuestas

    if (!parentType || !parentId) {
      return NextResponse.json(
        { error: 'parentType y parentId son requeridos' },
        { status: 400 }
      );
    }

    let query: any = {
      parentType,
      parentId
    };

    if (parentCommentId) {
      query.parentCommentId = parentCommentId;
    } else {
      // Solo comentarios principales (sin parent)
      query.parentCommentId = { $exists: false };
    }

    const comments = await Comment.find(query)
      .populate('author', 'name email')
      .populate('parentCommentId')
      .sort({ createdAt: 1 });

    // Marcar como leídos para el usuario actual
    await Comment.updateMany(
      { _id: { $in: comments.map(c => c._id) }, readBy: { $ne: userId } },
      { $push: { readBy: userId } }
    );

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener comentarios' },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo comentario
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = await verifyToken(token);
    const data = await request.json();
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!canComment(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permiso para comentar' },
        { status: 403 }
      );
    }

    // Validar datos
    if (!data.content || !data.parentType || !data.parentId) {
      return NextResponse.json(
        { error: 'Contenido, parentType y parentId son requeridos' },
        { status: 400 }
      );
    }

    const comment = await Comment.create({
      content: data.content,
      author: userId,
      parentType: data.parentType,
      parentId: data.parentId,
      parentCommentId: data.parentCommentId || undefined,
      readBy: [userId] // El autor ya lo ha leído
    });

    // TODO: Enviar notificaciones por email a usuarios relevantes
    // Por ahora solo retornamos el comentario creado

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name email');

    return NextResponse.json({ comment: populatedComment }, { status: 201 });
  } catch (error) {
    console.error('Error al crear comentario:', error);
    return NextResponse.json(
      { error: 'Error al crear comentario' },
      { status: 500 }
    );
  }
}

