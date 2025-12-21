import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Version from '@/models/Version';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener versiones de una entidad
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

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const periodValue = searchParams.get('period');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType y entityId son requeridos' },
        { status: 400 }
      );
    }

    let query: any = {
      entityType,
      entityId
    };

    if (periodValue) {
      query['period.value'] = periodValue;
    }

    const versions = await Version.find(query)
      .populate('createdBy', 'name email')
      .sort({ version: -1 })
      .limit(50);

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error al obtener versiones:', error);
    return NextResponse.json(
      { error: 'Error al obtener versiones' },
      { status: 500 }
    );
  }
}

// POST: Crear nueva versión
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
        { error: 'No tienes permiso para crear versiones' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { entityType, entityId, changes, period, metadata } = data;

    if (!entityType || !entityId || !changes) {
      return NextResponse.json(
        { error: 'entityType, entityId y changes son requeridos' },
        { status: 400 }
      );
    }

    // Obtener siguiente versión
    const VersionModel = Version as any;
    const nextVersion = await VersionModel.getNextVersion(entityType, entityId);

    const version = await Version.create({
      entityType,
      entityId,
      version: nextVersion,
      changes,
      period,
      createdBy: userId,
      metadata
    });

    // Generar label de versión
    const versionDoc = await Version.findById(version._id);
    if (versionDoc) {
      const versionLabel = (versionDoc as any).generateVersionLabel();
      versionDoc.versionLabel = versionLabel;
      await versionDoc.save();
    }

    const populatedVersion = await Version.findById(version._id)
      .populate('createdBy', 'name email');

    return NextResponse.json({ version: populatedVersion }, { status: 201 });
  } catch (error) {
    console.error('Error al crear versión:', error);
    return NextResponse.json(
      { error: 'Error al crear versión' },
      { status: 500 }
    );
  }
}


