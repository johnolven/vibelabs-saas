import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PageView from '@/models/PageView';
import Document from '@/models/Document';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import mongoose from 'mongoose';

// GET: Obtener estadísticas detalladas de un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const currentUserId = await verifyToken(token);
    await connectDB();

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Solo admin y founder pueden ver estadísticas
    if (!hasPermission(currentUser.role, 'read_documents') || (currentUser.role !== 'admin' && currentUser.role !== 'founder')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver estadísticas' },
        { status: 403 }
      );
    }

    // Obtener información del usuario objetivo
    const targetUser = await User.findById(targetUserId).select('name email role');
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario objetivo no encontrado' },
        { status: 404 }
      );
    }

    const targetUserEmail = targetUser.email;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir query de fecha
    const dateQuery: any = { 
      userId: mongoose.Types.ObjectId.isValid(targetUserId) 
        ? new mongoose.Types.ObjectId(targetUserId) 
        : targetUserId 
    };
    if (startDate) {
      dateQuery.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateQuery.createdAt = { ...dateQuery.createdAt, $lte: new Date(endDate) };
    }

    // Obtener todas las vistas del usuario
    const allViews = await PageView.find(dateQuery)
      .populate('documentId', 'originalName folder mimeType')
      .sort({ createdAt: -1 });

    // Estadísticas por sección
    const sectionStats = await PageView.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$section',
          totalViews: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          averageDuration: { $avg: { $ifNull: ['$duration', 0] } }
        }
      },
      {
        $project: {
          section: '$_id',
          totalViews: 1,
          totalDuration: 1,
          averageDuration: { $round: ['$averageDuration', 0] }
        }
      },
      { $sort: { totalViews: -1 } }
    ]);

    // Estadísticas de documentos desde PageView
    const documentStats = await PageView.aggregate([
      { $match: { ...dateQuery, documentId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$documentId',
          totalViews: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          averageDuration: { $avg: { $ifNull: ['$duration', 0] } },
          lastViewed: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'documents',
          localField: '_id',
          foreignField: '_id',
          as: 'document'
        }
      },
      { $unwind: { path: '$document', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          documentId: '$_id',
          documentName: '$document.originalName',
          documentFolder: '$document.folder',
          documentMimeType: '$document.mimeType',
          totalViews: 1,
          totalDuration: 1,
          averageDuration: { $round: ['$averageDuration', 0] },
          lastViewed: 1
        }
      },
      { $sort: { totalViews: -1 } }
    ]);

    // Estadísticas de Data Room: documentos vistos y descargados por este usuario
    const userObjectId = mongoose.Types.ObjectId.isValid(targetUserId) 
      ? new mongoose.Types.ObjectId(targetUserId) 
      : targetUserId;

    // Obtener todos los documentos con sus vistas, descargas y share links
    const allDocuments = await Document.find({}).select('originalName folder viewCount downloadCount views lastDownloadedBy lastDownloadedAt shareLinks');
    
    // Filtrar documentos que el usuario ha visto (directamente o desde share links)
    const documentsWithUserViews = allDocuments.filter((doc: any) => {
      let hasView = false;
      
      // Verificar vistas directas del documento
      if (doc.views && doc.views.length > 0) {
        hasView = doc.views.some((v: any) => {
          const viewUserId = v.userId?.toString();
          const matchesUser = viewUserId === targetUserId;
          if (!matchesUser) return false;
          
          if (startDate || endDate) {
            const viewDate = new Date(v.startTime);
            if (startDate && viewDate < new Date(startDate)) return false;
            if (endDate && viewDate > new Date(endDate)) return false;
          }
          return true;
        });
      }
      
      // Verificar vistas desde share links (por userId o email)
      if (!hasView && doc.shareLinks && doc.shareLinks.length > 0) {
        hasView = doc.shareLinks.some((link: any) => {
          if (!link.views || link.views.length === 0) return false;
          return link.views.some((v: any) => {
            const viewUserId = v.userId?.toString();
            const viewEmail = v.email;
            const matchesUser = viewUserId === targetUserId || viewEmail === targetUserEmail;
            if (!matchesUser) return false;
            
            if (startDate || endDate) {
              const viewDate = new Date(v.startTime);
              if (startDate && viewDate < new Date(startDate)) return false;
              if (endDate && viewDate > new Date(endDate)) return false;
            }
            return true;
          });
        });
      }
      
      return hasView;
    });

    // Filtrar documentos que el usuario ha descargado (directamente o desde share links)
    const documentsDownloaded = allDocuments.filter((doc: any) => {
      let hasDownload = false;
      
      // Verificar descargas directas
      if (doc.lastDownloadedBy) {
        const downloadUserId = doc.lastDownloadedBy.toString();
        if (downloadUserId === targetUserId) {
          if (startDate || endDate) {
            if (!doc.lastDownloadedAt) return false;
            const downloadDate = new Date(doc.lastDownloadedAt);
            if (startDate && downloadDate < new Date(startDate)) return false;
            if (endDate && downloadDate > new Date(endDate)) return false;
          }
          hasDownload = true;
        }
      }
      
      // Nota: Las descargas desde share links no se rastrean actualmente por usuario/email
      // Solo se incrementa downloadCount del share link, pero no se guarda quién descargó
      // Esto requeriría modificar el modelo para rastrear descargas por usuario/email en share links
      
      return hasDownload;
    });

    // Procesar estadísticas de documentos vistos (directas + share links)
    const dataRoomStats = {
      documentsViewed: documentsWithUserViews.map((doc: any) => {
        // Vistas directas del documento
        const directViews = doc.views?.filter((v: any) => {
          const viewUserId = v.userId?.toString();
          const matchesUser = viewUserId === targetUserId;
          if (!matchesUser) return false;
          
          if (startDate || endDate) {
            const viewDate = new Date(v.startTime);
            if (startDate && viewDate < new Date(startDate)) return false;
            if (endDate && viewDate > new Date(endDate)) return false;
          }
          return true;
        }) || [];
        
        // Vistas desde share links
        const shareLinkViews: any[] = [];
        if (doc.shareLinks && doc.shareLinks.length > 0) {
          doc.shareLinks.forEach((link: any) => {
            if (link.views && link.views.length > 0) {
              link.views.forEach((v: any) => {
                const viewUserId = v.userId?.toString();
                const viewEmail = v.email;
                const matchesUser = viewUserId === targetUserId || viewEmail === targetUserEmail;
                if (matchesUser) {
                  if (startDate || endDate) {
                    const viewDate = new Date(v.startTime);
                    if (startDate && viewDate < new Date(startDate)) return;
                    if (endDate && viewDate > new Date(endDate)) return;
                  }
                  shareLinkViews.push(v);
                }
              });
            }
          });
        }
        
        // Combinar todas las vistas
        const allUserViews = [...directViews, ...shareLinkViews];
        
        const totalDuration = allUserViews.reduce((sum: number, v: any) => 
          sum + (v.duration || 0), 0
        );
        const averageDuration = allUserViews.length > 0 
          ? Math.floor(totalDuration / allUserViews.length) 
          : 0;

        return {
          documentId: doc._id.toString(),
          documentName: doc.originalName,
          documentFolder: doc.folder,
          viewCount: allUserViews.length,
          totalDuration,
          averageDuration,
          lastViewed: allUserViews.length > 0 
            ? allUserViews.sort((a: any, b: any) => 
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
              )[0].startTime
            : null
        };
      }),
      documentsDownloaded: documentsDownloaded.map((doc: any) => ({
        documentId: doc._id.toString(),
        documentName: doc.originalName,
        documentFolder: doc.folder,
        downloadCount: doc.downloadCount,
        lastDownloadedAt: doc.lastDownloadedAt
      })),
      totalDocumentsViewed: documentsWithUserViews.length,
      totalDocumentViews: documentsWithUserViews.reduce((sum: number, doc: any) => {
        // Vistas directas
        const directViews = doc.views?.filter((v: any) => {
          const viewUserId = v.userId?.toString();
          const matchesUser = viewUserId === targetUserId;
          if (!matchesUser) return false;
          
          if (startDate || endDate) {
            const viewDate = new Date(v.startTime);
            if (startDate && viewDate < new Date(startDate)) return false;
            if (endDate && viewDate > new Date(endDate)) return false;
          }
          return true;
        }) || [];
        
        // Vistas desde share links
        let shareLinkViewsCount = 0;
        if (doc.shareLinks && doc.shareLinks.length > 0) {
          doc.shareLinks.forEach((link: any) => {
            if (link.views && link.views.length > 0) {
              shareLinkViewsCount += link.views.filter((v: any) => {
                const viewUserId = v.userId?.toString();
                const viewEmail = v.email;
                const matchesUser = viewUserId === targetUserId || viewEmail === targetUserEmail;
                if (!matchesUser) return false;
                
                if (startDate || endDate) {
                  const viewDate = new Date(v.startTime);
                  if (startDate && viewDate < new Date(startDate)) return false;
                  if (endDate && viewDate > new Date(endDate)) return false;
                }
                return true;
              }).length;
            }
          });
        }
        
        return sum + directViews.length + shareLinkViewsCount;
      }, 0),
      totalDownloads: documentsDownloaded.length
    };

    // Estadísticas por ruta (solo para este usuario)
    const pathStats = await PageView.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$path',
          totalViews: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          averageDuration: { $avg: { $ifNull: ['$duration', 0] } }
        }
      },
      {
        $project: {
          path: '$_id',
          totalViews: 1,
          totalDuration: 1,
          averageDuration: { $round: ['$averageDuration', 0] }
        }
      },
      { $sort: { totalViews: -1 } }
    ]);
    
    console.log('PathStats para usuario:', targetUserId, 'Resultados:', pathStats.length);

    // Historial completo de actividad
    const now = new Date();
    const MAX_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas en milisegundos (sesión máxima razonable)
    const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutos en milisegundos (si no hay actividad, considerar inactiva)
    
    const activityHistory = allViews.map((view: any) => {
      const startTime = new Date(view.startTime);
      const endTime = view.endTime ? new Date(view.endTime) : null;
      const timeSinceStart = now.getTime() - startTime.getTime();
      
      // Calcular duración si no existe pero hay endTime
      let duration = view.duration;
      if (!duration && endTime) {
        duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      }
      
      // Determinar si la sesión está realmente activa o es una sesión abandonada
      let isActive = false;
      let isAbandoned = false;
      
      if (!endTime) {
        // Si no hay endTime, verificar si es una sesión reciente o abandonada
        if (timeSinceStart > MAX_SESSION_DURATION) {
          // Sesión muy antigua (más de 8 horas), considerarla abandonada
          isAbandoned = true;
          // Calcular duración máxima razonable
          duration = Math.floor(MAX_SESSION_DURATION / 1000);
        } else if (timeSinceStart > INACTIVE_THRESHOLD) {
          // Sesión inactiva por más de 30 minutos, probablemente abandonada
          isAbandoned = true;
          // Calcular duración hasta el umbral de inactividad
          duration = Math.floor(INACTIVE_THRESHOLD / 1000);
        } else {
          // Sesión reciente, podría estar activa
          isActive = true;
        }
      }
      
      return {
        id: view._id.toString(),
        path: view.path,
        section: view.section,
        documentId: view.documentId?._id?.toString(),
        documentName: view.documentId?.originalName,
        documentFolder: view.documentId?.folder,
        startTime: view.startTime,
        endTime: view.endTime,
        duration: duration,
        isActive: isActive, // Solo true si es realmente activa (reciente y sin endTime)
        isAbandoned: isAbandoned, // True si es una sesión abandonada
        metadata: view.metadata,
        createdAt: view.createdAt
      };
    });

    // Estadísticas generales del usuario
    const totalViews = allViews.length;
    const totalDuration = allViews.reduce((sum: number, view: any) => sum + (view.duration || 0), 0);
    const averageDuration = totalViews > 0 ? Math.floor(totalDuration / totalViews) : 0;
    const uniqueSections = [...new Set(allViews.map((view: any) => view.section))];
    const uniqueDocuments = [...new Set(allViews.filter((view: any) => view.documentId).map((view: any) => view.documentId?._id?.toString()))];

    return NextResponse.json({
      user: {
        _id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      },
      overview: {
        totalViews,
        totalDuration,
        averageDuration,
        uniqueSections: uniqueSections.length,
        uniqueDocuments: uniqueDocuments.length
      },
      sectionStats,
      documentStats,
      pathStats,
      activityHistory,
      dataRoomStats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del usuario' },
      { status: 500 }
    );
  }
}

