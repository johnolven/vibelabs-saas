import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PageView from '@/models/PageView';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

// POST: Iniciar una vista de página
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { path, section, documentId, metadata } = body;
    
    // Intentar obtener usuario del token
    let userId = null;
    let email = null;
    
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (token) {
      try {
        userId = await verifyToken(token);
        const user = await User.findById(userId).select('email');
        if (user) {
          email = user.email;
        }
      } catch (err) {
        // Token inválido, continuar sin usuario
      }
    }
    
    // Si no hay usuario pero hay email en el body (para enlaces públicos)
    if (!userId && body.email) {
      email = body.email;
    }
    
    const pageView = new PageView({
      userId: userId || undefined,
      email: email || undefined,
      path,
      section,
      documentId: documentId || undefined,
      startTime: new Date(),
      metadata: metadata || {}
    });
    
    await pageView.save();
    
    return NextResponse.json({
      success: true,
      viewId: pageView._id.toString()
    });
  } catch (error) {
    console.error('Error al iniciar vista de página:', error);
    return NextResponse.json(
      { error: 'Error al iniciar vista de página' },
      { status: 500 }
    );
  }
}

// PUT: Finalizar una vista de página
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { viewId } = body;
    
    if (!viewId) {
      return NextResponse.json(
        { error: 'viewId es requerido' },
        { status: 400 }
      );
    }
    
    const pageView = await PageView.findById(viewId);
    if (!pageView) {
      return NextResponse.json(
        { error: 'Vista no encontrada' },
        { status: 404 }
      );
    }
    
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - pageView.startTime.getTime()) / 1000);
    
    pageView.endTime = endTime;
    pageView.duration = duration;
    
    await pageView.save();
    
    return NextResponse.json({
      success: true,
      duration
    });
  } catch (error) {
    console.error('Error al finalizar vista de página:', error);
    return NextResponse.json(
      { error: 'Error al finalizar vista de página' },
      { status: 500 }
    );
  }
}

