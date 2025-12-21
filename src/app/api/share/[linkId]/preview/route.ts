import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET: Obtener documento para preview por enlace compartido
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    await connectDB();

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
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');

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

    // Leer archivo del sistema de archivos
    const filePath = join(process.cwd(), document.filePath);
    const fileBuffer = await readFile(filePath);

    // Retornar archivo para preview (inline, no descarga)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `inline; filename="${document.originalName}"`,
        'Content-Length': document.fileSize.toString(),
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Error al obtener preview compartido:', error);
    return NextResponse.json(
      { error: 'Error al obtener preview compartido' },
      { status: 500 }
    );
  }
}

