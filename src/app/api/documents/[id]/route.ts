import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET: Descargar documento
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

    // Verificar permisos de acceso
    if (!hasPermission(user.role, 'read_documents')) {
      return NextResponse.json(
        { error: 'No tienes permiso para descargar documentos' },
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

    // Leer archivo del sistema de archivos
    const filePath = join(process.cwd(), document.filePath);
    const fileBuffer = await readFile(filePath);

    // Actualizar audit log
    document.downloadCount += 1;
    document.lastDownloadedAt = new Date();
    document.lastDownloadedBy = userId;
    await document.save();

    // Retornar archivo
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.originalName}"`,
        'Content-Length': document.fileSize.toString()
      }
    });
  } catch (error) {
    console.error('Error al descargar documento:', error);
    return NextResponse.json(
      { error: 'Error al descargar documento' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar documento (solo founders/admins)
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

    if (!hasPermission(user.role, 'write_documents')) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar documentos' },
        { status: 403 }
      );
    }

    const document = await Document.findById(params.id);
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete
    document.isActive = false;
    await document.save();

    return NextResponse.json({ message: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    return NextResponse.json(
      { error: 'Error al eliminar documento' },
      { status: 500 }
    );
  }
}

