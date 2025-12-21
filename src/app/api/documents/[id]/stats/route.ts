import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener estadísticas del documento (vistas con información de usuarios)
export async function GET(
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

    const { id } = await params;
    const userId = await verifyToken(token);
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const document = await Document.findById(id);
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    if (!hasPermission(user.role, 'read_documents')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver documentos' },
        { status: 403 }
      );
    }

    // Obtener vistas con información de usuarios
    const viewsWithUsers = await Promise.all(
      (document.views || []).map(async (view: any) => {
        if (view.userId) {
          const viewUser = await User.findById(view.userId).select('name email');
          return {
            ...view.toObject(),
            userId: view.userId.toString(),
            userName: viewUser?.name || null,
            userEmail: viewUser?.email || null
          };
        }
        return {
          ...view.toObject(),
          userId: null,
          userName: null,
          userEmail: null
        };
      })
    );

    return NextResponse.json({
      views: viewsWithUsers,
      viewCount: document.viewCount || 0,
      downloadCount: document.downloadCount || 0
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}

