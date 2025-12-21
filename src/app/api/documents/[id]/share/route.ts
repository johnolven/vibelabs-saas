import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Document from '@/models/Document';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// POST: Crear enlace compartido
export async function POST(
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

    const document = await Document.findById(id);
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    if (!hasPermission(user.role, 'write_documents')) {
      return NextResponse.json(
        { error: 'No tienes permiso para compartir documentos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password, isPublic = true, expiresAt, allowDownload = false } = body;

    // Generar linkId único
    let linkId: string;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      linkId = randomBytes(16).toString('hex');
      // Buscar en todos los documentos con shareLinks
      const existingDoc = await Document.findOne({
        shareLinks: {
          $elemMatch: {
            linkId: linkId
          }
        }
      });
      if (!existingDoc) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      return NextResponse.json(
        { error: 'Error al generar linkId único' },
        { status: 500 }
      );
    }
    
    console.log('LinkId generado:', linkId);

    // Hashear contraseña si se proporciona
    let hashedPassword: string | undefined;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Construir el objeto shareLink sin campos undefined
    const shareLinkToPush: any = {
      linkId: String(linkId!),
      isPublic: Boolean(isPublic),
      allowDownload: Boolean(allowDownload),
      createdAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(userId),
      viewCount: 0,
      views: []
    };
    
    if (hashedPassword) {
      shareLinkToPush.password = hashedPassword;
    }
    
    if (expiresAt) {
      shareLinkToPush.expiresAt = new Date(expiresAt);
    }
    
    console.log('Creando shareLink con linkId:', shareLinkToPush.linkId);
    console.log('ShareLink a guardar:', JSON.stringify(shareLinkToPush, null, 2));

    // Método 1: Intentar con save() y markModified
    try {
      if (!document.shareLinks) {
        document.shareLinks = [];
      }
      
      document.shareLinks.push(shareLinkToPush);
      document.markModified('shareLinks');
      
      const savedDocument = await document.save();
      console.log('Método 1 (save): Total shareLinks:', savedDocument.shareLinks?.length || 0);
      
      // Verificar
      const verify1 = await Document.findById(id);
      if (verify1?.shareLinks && verify1.shareLinks.length > 0) {
        console.log('✓ Método 1 funcionó');
        const lastLink = verify1.shareLinks[verify1.shareLinks.length - 1];
        console.log('Último linkId guardado:', lastLink.linkId);
      } else {
        throw new Error('Método 1 no guardó correctamente');
      }
    } catch (method1Error: any) {
      console.log('Método 1 falló:', method1Error?.message);
      console.log('Intentando método 2: updateOne con $push...');
      
      // Método 2: Usar updateOne con $push
      try {
        const objectId = new mongoose.Types.ObjectId(id);
        
        const updateResult = await Document.updateOne(
          { _id: objectId },
          { 
            $push: { 
              shareLinks: shareLinkToPush
            } 
          }
        );
        
        console.log('Método 2 (updateOne):', {
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount
        });
        
        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const verify2 = await Document.findById(id);
        if (verify2?.shareLinks && verify2.shareLinks.length > 0) {
          console.log('✓ Método 2 funcionó. ShareLinks:', verify2.shareLinks.length);
        } else {
          throw new Error('Método 2 no guardó correctamente');
        }
      } catch (method2Error: any) {
        console.log('Método 2 falló:', method2Error?.message);
        console.log('Intentando método 3: $set con array completo...');
        
        // Método 3: Usar $set con el array completo
        try {
          const objectId = new mongoose.Types.ObjectId(id);
          const currentDoc = await Document.findById(id);
          
          if (currentDoc) {
            const allShareLinks = [...(currentDoc.shareLinks || []), shareLinkToPush];
            
            const updateResult = await Document.updateOne(
              { _id: objectId },
              { $set: { shareLinks: allShareLinks } }
            );
            
            console.log('Método 3 (updateOne $set):', {
              matched: updateResult.matchedCount,
              modified: updateResult.modifiedCount
            });
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const verify3 = await Document.findById(id);
            if (verify3?.shareLinks && verify3.shareLinks.length > 0) {
              console.log('✓ Método 3 funcionó. ShareLinks:', verify3.shareLinks.length);
            } else {
              throw new Error('Ningún método funcionó');
            }
          }
        } catch (method3Error: any) {
          console.error('Método 3 también falló:', method3Error?.message);
          throw new Error('No se pudo guardar el shareLink con ningún método');
        }
      }
    }
    
    // Verificación final
    const finalDoc = await Document.findById(id);
    console.log('Verificación final. ShareLinks:', finalDoc?.shareLinks?.length || 0);
    if (finalDoc?.shareLinks && finalDoc.shareLinks.length > 0) {
      const lastLink = finalDoc.shareLinks[finalDoc.shareLinks.length - 1];
      console.log('Último shareLink guardado:', {
        linkId: lastLink.linkId,
        hasPassword: !!lastLink.password,
        isPublic: lastLink.isPublic
      });
    }

    return NextResponse.json({
      success: true,
      shareLink: {
        linkId: shareLinkToPush.linkId,
        isPublic: shareLinkToPush.isPublic,
        hasPassword: !!hashedPassword,
        createdAt: shareLinkToPush.createdAt,
        expiresAt: shareLinkToPush.expiresAt,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareLinkToPush.linkId}`
      }
    });
  } catch (error) {
    console.error('Error al crear enlace compartido:', error);
    return NextResponse.json(
      { error: 'Error al crear enlace compartido' },
      { status: 500 }
    );
  }
}

// GET: Listar enlaces compartidos del documento
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

    const shareLinks = (document.shareLinks || []).map((link: any) => ({
      linkId: link.linkId,
      isPublic: link.isPublic,
      hasPassword: !!link.password,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      viewCount: link.viewCount || 0,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${link.linkId}`
    }));

    return NextResponse.json({ shareLinks });
  } catch (error) {
    console.error('Error al obtener enlaces compartidos:', error);
    return NextResponse.json(
      { error: 'Error al obtener enlaces compartidos' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar enlace compartido
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

    const document = await Document.findById(id);
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    if (!hasPermission(user.role, 'write_documents')) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar enlaces compartidos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json(
        { error: 'linkId es requerido' },
        { status: 400 }
      );
    }

    if (!document.shareLinks) {
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    document.shareLinks = document.shareLinks.filter(
      (link: any) => link.linkId !== linkId
    );

    await document.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar enlace compartido:', error);
    return NextResponse.json(
      { error: 'Error al eliminar enlace compartido' },
      { status: 500 }
    );
  }
}

