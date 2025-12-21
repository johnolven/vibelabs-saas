import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// POST: Iniciar vista de documento
export async function POST(
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

    const document = await Document.findById(params.id);
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

    // Verificar acceso específico al documento
    if (user.role !== 'founder' && user.role !== 'admin') {
      const hasAccess = document.accessLevel.some(level => {
        if (level === 'public') return true;
        if (level === 'potential_investor' && user.role === 'potential_investor') return true;
        if (level === 'investor' && ['investor', 'boardmember'].includes(user.role)) return true;
        if (level === 'boardmember' && user.role === 'boardmember') return true;
        return false;
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'No tienes acceso a este documento' },
          { status: 403 }
        );
      }
    }

    // Iniciar nueva vista
    const startTime = new Date();
    document.viewCount = (document.viewCount || 0) + 1;
    
    if (!document.views) {
      document.views = [];
    }
    
    document.views.push({
      userId: userId,
      startTime: startTime
    });

    await document.save();

    return NextResponse.json({
      success: true,
      viewId: document.views[document.views.length - 1]._id?.toString(),
      startTime: startTime
    });
  } catch (error) {
    console.error('Error al iniciar vista:', error);
    return NextResponse.json(
      { error: 'Error al iniciar vista' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar tiempo de visualización (cuando se cierra el preview)
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
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const document = await Document.findById(params.id);
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { viewId, startTime } = body;

    if (!viewId || !startTime) {
      return NextResponse.json(
        { error: 'viewId y startTime son requeridos' },
        { status: 400 }
      );
    }

    // Buscar la vista más reciente sin endTime para este usuario
    if (!document.views || document.views.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró la vista' },
        { status: 404 }
      );
    }

    // Encontrar la vista más reciente sin endTime para este usuario
    const view = document.views
      .filter((v: any) => v.userId.toString() === userId.toString() && !v.endTime)
      .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

    if (!view) {
      return NextResponse.json(
        { error: 'No se encontró la vista activa' },
        { status: 404 }
      );
    }

    const endTime = new Date();
    const startTimeDate = new Date(startTime);
    const duration = Math.floor((endTime.getTime() - startTimeDate.getTime()) / 1000); // en segundos

    view.endTime = endTime;
    view.duration = duration;

    await document.save();

    return NextResponse.json({
      success: true,
      duration: duration,
      endTime: endTime
    });
  } catch (error) {
    console.error('Error al actualizar vista:', error);
    return NextResponse.json(
      { error: 'Error al actualizar vista' },
      { status: 500 }
    );
  }
}

