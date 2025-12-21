import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PageView from '@/models/PageView';
import Document from '@/models/Document';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener estadísticas generales
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

    // Solo admin y founder pueden ver estadísticas
    if (!hasPermission(user.role, 'read_documents') || (user.role !== 'admin' && user.role !== 'founder')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver estadísticas' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir query de fecha
    const dateQuery: any = {};
    if (startDate) {
      dateQuery.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateQuery.createdAt = { ...dateQuery.createdAt, $lte: new Date(endDate) };
    }

    // Estadísticas de usuarios únicos
    const uniqueUsers = await PageView.distinct('userId', { ...dateQuery, userId: { $exists: true, $ne: null } });
    const uniqueEmails = await PageView.distinct('email', { ...dateQuery, email: { $exists: true, $ne: null } });
    const totalUniqueVisitors = new Set([...uniqueUsers.map((id: any) => id?.toString()), ...uniqueEmails]).size;

    // Estadísticas por sección
    const sectionStats = await PageView.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$section',
          totalViews: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueEmails: { $addToSet: '$email' }
        }
      },
      {
        $project: {
          section: '$_id',
          totalViews: 1,
          totalDuration: 1,
          uniqueVisitors: { $size: { $setUnion: ['$uniqueUsers', '$uniqueEmails'] } }
        }
      },
      { $sort: { totalViews: -1 } }
    ]);

    // Estadísticas de documentos más vistos
    const documentStats = await PageView.aggregate([
      { $match: { ...dateQuery, documentId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$documentId',
          totalViews: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueEmails: { $addToSet: '$email' }
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
          totalViews: 1,
          totalDuration: 1,
          uniqueVisitors: { $size: { $setUnion: ['$uniqueUsers', '$uniqueEmails'] } }
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 20 }
    ]);

    // Estadísticas de rutas más visitadas
    const pathStats = await PageView.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$path',
          totalViews: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueEmails: { $addToSet: '$email' }
        }
      },
      {
        $project: {
          path: '$_id',
          totalViews: 1,
          totalDuration: 1,
          uniqueVisitors: { $size: { $setUnion: ['$uniqueUsers', '$uniqueEmails'] } }
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 20 }
    ]);

    // Estadísticas de usuarios activos
    const userActivity = await PageView.aggregate([
      { $match: { ...dateQuery, userId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$userId',
          totalViews: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          sections: { $addToSet: '$section' },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          userRole: '$user.role',
          totalViews: 1,
          totalDuration: 1,
          sections: 1,
          lastActivity: 1
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 50 }
    ]);

    // Estadísticas de rutas por usuario
    const userPathStats = await PageView.aggregate([
      { $match: { ...dateQuery, userId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: {
            userId: '$userId',
            path: '$path'
          },
          totalViews: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          averageDuration: { $avg: { $ifNull: ['$duration', 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id.userId',
          userName: { $first: '$user.name' },
          userEmail: { $first: '$user.email' },
          paths: {
            $push: {
              path: '$_id.path',
              totalViews: '$totalViews',
              totalDuration: '$totalDuration',
              averageDuration: { $round: ['$averageDuration', 0] }
            }
          }
        }
      },
      {
        $project: {
          userId: { $toString: '$_id' },
          userName: 1,
          userEmail: 1,
          paths: {
            $sortArray: {
              input: '$paths',
              sortBy: { totalViews: -1 }
            }
          }
        }
      }
    ]);

    // Estadísticas generales
    const totalViews = await PageView.countDocuments(dateQuery);
    const totalDuration = await PageView.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$duration', 0] } }
        }
      }
    ]);

    return NextResponse.json({
      overview: {
        totalViews,
        totalDuration: totalDuration[0]?.total || 0,
        totalUniqueVisitors,
        averageDuration: totalViews > 0 ? Math.floor((totalDuration[0]?.total || 0) / totalViews) : 0
      },
      sectionStats,
      documentStats,
      pathStats,
      userActivity,
      userPathStats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}

