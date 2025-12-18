import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Metric from '@/models/Metric';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener todas las métricas
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

    if (!hasPermission(user.role, 'read_metrics')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver métricas' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query: any = {};
    if (type) query.type = type;
    if (activeOnly) query.isActive = true;

    const metrics = await Metric.find(query)
      .populate('createdBy', 'name email')
      .sort({ displayOrder: 1, createdAt: -1 });

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error al obtener métricas:', error);
    return NextResponse.json(
      { error: 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}

// POST: Crear nueva métrica
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
    const data = await request.json();
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!hasPermission(user.role, 'write_metrics')) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear métricas' },
        { status: 403 }
      );
    }

    // Validar datos
    if (!data.name || !data.type || !data.unit) {
      return NextResponse.json(
        { error: 'Nombre, tipo y unidad son requeridos' },
        { status: 400 }
      );
    }

    const metric = await Metric.create({
      name: data.name,
      type: data.type,
      unit: data.unit,
      description: data.description,
      targetValue: data.targetValue,
      displayOrder: data.displayOrder || 0,
      createdBy: userId,
      values: []
    });

    return NextResponse.json({ metric }, { status: 201 });
  } catch (error) {
    console.error('Error al crear métrica:', error);
    return NextResponse.json(
      { error: 'Error al crear métrica' },
      { status: 500 }
    );
  }
}

