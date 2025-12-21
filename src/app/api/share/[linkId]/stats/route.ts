import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener estadísticas del enlace compartido
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
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

    // Buscar documento con este linkId
    const document = await Document.findOne({
      shareLinks: {
        $elemMatch: {
          linkId: linkId
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos (solo el creador del enlace o admins pueden ver estadísticas)
    const shareLink = document.shareLinks?.find(
      (link: any) => {
        const linkIdStr = typeof link.linkId === 'object' ? link.linkId?.toString() : String(link.linkId);
        return linkIdStr === String(linkId);
      }
    );

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    // Solo el creador del enlace o admins pueden ver estadísticas
    if (shareLink.createdBy.toString() !== userId.toString() && !hasPermission(user.role, 'read_documents')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver estas estadísticas' },
        { status: 403 }
      );
    }

    // Obtener vistas con información de usuarios
    const viewsWithUsers = await Promise.all(
      (shareLink.views || []).map(async (view: any) => {
        let userName = null;
        let userEmail = null;
        
        if (view.userId) {
          const viewUser = await User.findById(view.userId).select('name email');
          if (viewUser) {
            userName = viewUser.name;
            userEmail = viewUser.email;
          }
        }

        return {
          ...view.toObject(),
          userId: view.userId ? view.userId.toString() : null,
          userName: userName,
          userEmail: userEmail,
          email: view.email || userEmail || null
        };
      })
    );

    return NextResponse.json({
      linkId: shareLink.linkId,
      viewCount: shareLink.viewCount || 0,
      views: viewsWithUsers,
      createdAt: shareLink.createdAt,
      expiresAt: shareLink.expiresAt
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del enlace:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del enlace' },
      { status: 500 }
    );
  }
}

