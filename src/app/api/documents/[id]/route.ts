import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission, canAccessFolder } from '@/lib/permissions';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';

// GET: Descargar documento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const document = await Document.findById(id).populate('uploadedBy', 'name email');
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos de acceso
    if (!hasPermission(user.role, 'read_documents')) {
      return NextResponse.json(
        { error: 'No tienes permiso para acceder a documentos' },
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

    // Si se solicita solo metadata, retornar JSON
    const { searchParams } = new URL(request.url);
    if (searchParams.get('metadata') === 'true') {
      return NextResponse.json({ document });
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

// PUT: Actualizar documento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { error: 'No tienes permiso para actualizar documentos' },
        { status: 403 }
      );
    }

    const document = await Document.findById(id);
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const folder = formData.get('folder') as string;
    const description = formData.get('description') as string;
    const accessLevel = formData.get('accessLevel') ? JSON.parse(formData.get('accessLevel') as string) : null;
    const file = formData.get('file') as File | null;
    const periodValue = formData.get('period') as string;
    const periodType = formData.get('periodType') as string;

    // Actualizar campos si se proporcionan
    if (folder && canAccessFolder(user.role, folder)) {
      document.folder = folder as any;
    }
    if (description !== null) {
      document.description = description;
    }
    if (accessLevel !== null && Array.isArray(accessLevel)) {
      document.accessLevel = accessLevel;
    }
    if (periodValue && periodType) {
      document.period = {
        type: periodType as 'month' | 'quarter' | 'year',
        value: periodValue
      };
    }

    // Si se sube un nuevo archivo, reemplazar el anterior
    if (file) {
      // Eliminar archivo anterior
      const oldFilePath = join(process.cwd(), document.filePath);
      if (existsSync(oldFilePath)) {
        await unlink(oldFilePath);
      }

      // Guardar nuevo archivo
      const uploadsDir = join(process.cwd(), 'uploads', document.folder);
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = join(uploadsDir, fileName);

      await writeFile(filePath, buffer);

      document.fileName = fileName;
      document.originalName = file.name;
      document.filePath = `/uploads/${document.folder}/${fileName}`;
      document.fileSize = file.size;
      document.mimeType = file.type;
      document.version += 1;
    }

    await document.save();

    const updatedDoc = await Document.findById(id)
      .populate('uploadedBy', 'name email');

    return NextResponse.json({ document: updatedDoc });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    return NextResponse.json(
      { error: 'Error al actualizar documento' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar documento (solo founders/admins)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const document = await Document.findById(id);
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

