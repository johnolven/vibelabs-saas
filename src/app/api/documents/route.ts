import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission, canAccessFolder } from '@/lib/permissions';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// GET: Listar documentos según permisos del usuario
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

    if (!hasPermission(user.role, 'read_documents')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver documentos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const period = searchParams.get('period');

    // Construir query según permisos
    let query: any = { isActive: true };

    // Filtrar por carpeta si se especifica
    if (folder && canAccessFolder(user.role, folder)) {
      query.folder = folder;
    } else if (folder && !canAccessFolder(user.role, folder)) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta carpeta' },
        { status: 403 }
      );
    }

    // Filtrar por período si se especifica (ignorar si es 'all')
    if (period && period !== 'all') {
      query['period.value'] = period;
    }

    // Filtrar documentos según nivel de acceso
    // Followers no tienen acceso a documentos
    if (user.role === 'follower') {
      return NextResponse.json(
        { error: 'No tienes permiso para ver documentos' },
        { status: 403 }
      );
    } else if (user.role === 'potential_investor') {
      query.accessLevel = { $in: ['public', 'potential_investor'] };
    } else if (user.role === 'investor') {
      query.accessLevel = { $in: ['public', 'investor', 'potential_investor'] };
    } else if (user.role === 'boardmember') {
      query.accessLevel = { $in: ['public', 'investor', 'boardmember', 'potential_investor'] };
    }
    // Founders y admins ven todo (no filtramos)

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 }
    );
  }
}

// POST: Subir nuevo documento
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
        { error: 'No tienes permiso para subir documentos' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string;
    const description = formData.get('description') as string;
    const accessLevel = JSON.parse(formData.get('accessLevel') as string || '[]');

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo es requerido' },
        { status: 400 }
      );
    }

    if (!folder || !canAccessFolder(user.role, folder)) {
      return NextResponse.json(
        { error: 'Carpeta inválida o sin permisos' },
        { status: 400 }
      );
    }

    // Crear directorio si no existe
    const uploadsDir = join(process.cwd(), 'uploads', folder);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    // Obtener período del request si está disponible
    const periodValue = formData.get('period') as string;
    const periodType = formData.get('periodType') as string;
    
    const periodData = periodValue && periodType ? {
      type: periodType as 'month' | 'quarter' | 'year',
      value: periodValue
    } : undefined;

    // Guardar metadata en BD
    const document = await Document.create({
      fileName,
      originalName: file.name,
      filePath: `/uploads/${folder}/${fileName}`,
      fileSize: file.size,
      mimeType: file.type,
      folder,
      description,
      uploadedBy: userId,
      accessLevel: accessLevel.length > 0 ? accessLevel : ['public'],
      period: periodData
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error al subir documento:', error);
    return NextResponse.json(
      { error: 'Error al subir documento' },
      { status: 500 }
    );
  }
}

