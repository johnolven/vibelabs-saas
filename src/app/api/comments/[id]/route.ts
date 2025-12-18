import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Comment from '@/models/Comment';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { canComment } from '@/lib/permissions';

// PUT: Editar comentario
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const comment = await Comment.findById(params.id);
    if (!comment) {
      return NextResponse.json(
        { error: 'Comentario no encontrado' },
        { status: 404 }
      );
    }

    // Solo el autor puede editar
    if (comment.author.toString() !== userId.toString()) {
      return NextResponse.json(
        { error: 'Solo el autor puede editar este comentario' },
        { status: 403 }
      );
    }

    if (data.content) {
      comment.content = data.content;
      comment.isEdited = true;
      comment.editedAt = new Date();
    }

    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name email');

    return NextResponse.json({ comment: populatedComment });
  } catch (error) {
    console.error('Error al editar comentario:', error);
    return NextResponse.json(
      { error: 'Error al editar comentario' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar comentario
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const comment = await Comment.findById(params.id);
    if (!comment) {
      return NextResponse.json(
        { error: 'Comentario no encontrado' },
        { status: 404 }
      );
    }

    // Solo el autor o founders/admins pueden eliminar
    const isAuthor = comment.author.toString() === userId.toString();
    const isAdmin = ['founder', 'admin'].includes(user.role);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este comentario' },
        { status: 403 }
      );
    }

    await Comment.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Comentario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    return NextResponse.json(
      { error: 'Error al eliminar comentario' },
      { status: 500 }
    );
  }
}

