import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// POST: Iniciar vista por enlace compartido
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    await connectDB();

    const body = await request.json();
    const { password, email } = body;

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

    // Verificar si el enlace ha expirado
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Este enlace ha expirado' },
        { status: 410 }
      );
    }

    // Verificar contraseña si es necesario
    if (shareLink.password) {
      if (!password) {
        return NextResponse.json(
          { error: 'Contraseña requerida' },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, shareLink.password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }
    }

    // Verificar si el usuario está logueado
    const token = request.headers.get('Authorization')?.split(' ')[1];
    let userId = null;
    let userEmail = null;

    if (token) {
      try {
        userId = await verifyToken(token);
        const user = await User.findById(userId).select('email');
        if (user) {
          userEmail = user.email;
        }
      } catch (err) {
        // Token inválido, continuar como público
      }
    }

    // Si es público y no está logueado, requerir email
    if (shareLink.isPublic && !userId && !email) {
      return NextResponse.json(
        { error: 'Email es requerido para acceder a este enlace' },
        { status: 400 }
      );
    }

    // Iniciar nueva vista
    const startTime = new Date();
    shareLink.viewCount = (shareLink.viewCount || 0) + 1;

    if (!shareLink.views) {
      shareLink.views = [];
    }

    shareLink.views.push({
      email: userId ? undefined : (email || userEmail),
      userId: userId || undefined,
      startTime: startTime
    });

    await document.save();

    const viewIndex = shareLink.views.length - 1;
    const viewId = shareLink.views[viewIndex]._id?.toString();

    return NextResponse.json({
      success: true,
      viewId,
      startTime: startTime
    });
  } catch (error) {
    console.error('Error al iniciar vista compartida:', error);
    return NextResponse.json(
      { error: 'Error al iniciar vista compartida' },
      { status: 500 }
    );
  }
}

// PUT: Finalizar vista por enlace compartido
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    await connectDB();

    const body = await request.json();
    const { viewId, startTime, password } = body;

    if (!viewId || !startTime) {
      return NextResponse.json(
        { error: 'viewId y startTime son requeridos' },
        { status: 400 }
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

    const shareLink = document.shareLinks?.find(
      (link: any) => {
        const linkIdStr = typeof link.linkId === 'object' ? link.linkId?.toString() : String(link.linkId);
        return linkIdStr === String(linkId);
      }
    );

    if (!shareLink || !shareLink.views || shareLink.views.length === 0) {
      return NextResponse.json(
        { error: 'Vista no encontrada' },
        { status: 404 }
      );
    }

    // Verificar contraseña si es necesario
    if (shareLink.password && password) {
      const isValid = await bcrypt.compare(password, shareLink.password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }
    }

    // Encontrar la vista más reciente sin endTime
    const view = shareLink.views
      .filter((v: any) => !v.endTime)
      .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

    if (!view) {
      return NextResponse.json(
        { error: 'No se encontró la vista activa' },
        { status: 404 }
      );
    }

    const endTime = new Date();
    const startTimeDate = new Date(startTime);
    const duration = Math.floor((endTime.getTime() - startTimeDate.getTime()) / 1000);

    view.endTime = endTime;
    view.duration = duration;

    // Marcar como modificado y guardar
    document.markModified('shareLinks');
    await document.save();

    return NextResponse.json({
      success: true,
      duration: duration,
      endTime: endTime
    });
  } catch (error) {
    console.error('Error al finalizar vista compartida:', error);
    return NextResponse.json(
      { error: 'Error al finalizar vista compartida' },
      { status: 500 }
    );
  }
}

