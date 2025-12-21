import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// GET: Obtener información del documento por enlace compartido
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    await connectDB();

    console.log('Buscando enlace compartido:', linkId);

    // Buscar documento con este linkId - usar $elemMatch para arrays anidados
    const document = await Document.findOne({
      shareLinks: {
        $elemMatch: {
          linkId: linkId
        }
      }
    });

    console.log('Documento encontrado:', document ? 'Sí' : 'No');

    if (!document) {
      // Intentar búsqueda alternativa
      const allDocs = await Document.find({ shareLinks: { $exists: true, $ne: [] } });
      console.log('Documentos con shareLinks:', allDocs.length);
      
      for (const doc of allDocs) {
        if (doc.shareLinks && doc.shareLinks.length > 0) {
          const found = doc.shareLinks.find((link: any) => {
            const linkIdStr = typeof link.linkId === 'object' ? link.linkId?.toString() : String(link.linkId);
            return linkIdStr === String(linkId);
          });
          if (found) {
            console.log('Enlace encontrado en documento alternativo:', doc._id);
            // Usar este documento
            const shareLink = found;
            
            // Verificar si el enlace ha expirado
            if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
              return NextResponse.json(
                { error: 'Este enlace ha expirado' },
                { status: 410 }
              );
            }

            // Verificar si requiere contraseña
            const { searchParams } = new URL(request.url);
            const password = searchParams.get('password');

            if (shareLink.password) {
              if (!password) {
                return NextResponse.json(
                  { 
                    error: 'Contraseña requerida',
                    requiresPassword: true
                  },
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
            let user = null;

            if (token) {
              try {
                const userId = await verifyToken(token);
                user = await User.findById(userId).select('name email');
              } catch (err) {
                // Token inválido, continuar como público
              }
            }

            // Retornar información del documento
            return NextResponse.json({
              document: {
                _id: doc._id,
                originalName: doc.originalName,
                fileSize: doc.fileSize,
                mimeType: doc.mimeType,
                description: doc.description,
                uploadedAt: doc.uploadedAt
              },
              shareLink: {
                linkId: shareLink.linkId,
                isPublic: shareLink.isPublic,
                viewCount: shareLink.viewCount || 0
              },
              user: user ? {
                _id: user._id,
                name: user.name,
                email: user.email
              } : null
            });
          }
        }
      }
      
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    const shareLink = document.shareLinks?.find(
      (link: any) => {
        const linkIdStr = typeof link.linkId === 'object' ? link.linkId?.toString() : String(link.linkId);
        const paramStr = String(linkId);
        console.log('Comparando linkId:', linkIdStr, 'con', paramStr, 'igual:', linkIdStr === paramStr);
        return linkIdStr === paramStr;
      }
    );

    console.log('ShareLink encontrado:', shareLink ? 'Sí' : 'No');
    console.log('Total shareLinks en documento:', document.shareLinks?.length || 0);
    if (document.shareLinks && document.shareLinks.length > 0) {
      console.log('LinkIds en documento:', document.shareLinks.map((l: any) => l.linkId));
    }

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Enlace no encontrado en el documento' },
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

    // Verificar si requiere contraseña
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');

    if (shareLink.password) {
      if (!password) {
        return NextResponse.json(
          { 
            error: 'Contraseña requerida',
            requiresPassword: true
          },
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
    let user = null;
    let userId = null;

    if (token) {
      try {
        userId = await verifyToken(token);
        user = await User.findById(userId).select('name email');
      } catch (err) {
        // Token inválido, continuar como público
      }
    }

    // Retornar información del documento (sin el archivo)
    return NextResponse.json({
      document: {
        _id: document._id,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        description: document.description,
        uploadedAt: document.uploadedAt
      },
      shareLink: {
        linkId: shareLink.linkId,
        isPublic: shareLink.isPublic,
        allowDownload: shareLink.allowDownload || false,
        viewCount: shareLink.viewCount || 0
      },
      user: user ? {
        _id: user._id,
        name: user.name,
        email: user.email
      } : null
    });
  } catch (error) {
    console.error('Error al obtener documento compartido:', error);
    return NextResponse.json(
      { error: 'Error al obtener documento compartido' },
      { status: 500 }
    );
  }
}

