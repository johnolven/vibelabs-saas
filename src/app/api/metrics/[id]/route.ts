import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Metric from '@/models/Metric';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener métrica específica
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

    if (!hasPermission(user.role, 'read_metrics')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver métricas' },
        { status: 403 }
      );
    }

    const metric = await Metric.findById(params.id).populate('createdBy', 'name email');

    if (!metric) {
      return NextResponse.json(
        { error: 'Métrica no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ metric });
  } catch (error) {
    console.error('Error al obtener métrica:', error);
    return NextResponse.json(
      { error: 'Error al obtener métrica' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar métrica o agregar valor
export async function PUT(
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
        { error: 'No tienes permiso para editar métricas' },
        { status: 403 }
      );
    }

    const metric = await Metric.findById(params.id);
    if (!metric) {
      return NextResponse.json(
        { error: 'Métrica no encontrada' },
        { status: 404 }
      );
    }

    // Si se envía un nuevo valor, agregarlo
    if (data.value !== undefined && data.date) {
      metric.values.push({
        date: new Date(data.date),
        value: data.value,
        notes: data.notes
      });
    } else {
      // Actualizar metadata de la métrica
      if (data.name) metric.name = data.name;
      if (data.description !== undefined) metric.description = data.description;
      if (data.targetValue !== undefined) metric.targetValue = data.targetValue;
      if (data.displayOrder !== undefined) metric.displayOrder = data.displayOrder;
      if (data.isActive !== undefined) metric.isActive = data.isActive;
    }

    await metric.save();

    return NextResponse.json({ metric });
  } catch (error) {
    console.error('Error al actualizar métrica:', error);
    return NextResponse.json(
      { error: 'Error al actualizar métrica' },
      { status: 500 }
    );
  }
}

// GET: Exportar métrica a CSV
export async function POST(
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

    if (!hasPermission(user.role, 'read_metrics')) {
      return NextResponse.json(
        { error: 'No tienes permiso para exportar métricas' },
        { status: 403 }
      );
    }

    const metric = await Metric.findById(params.id);
    if (!metric) {
      return NextResponse.json(
        { error: 'Métrica no encontrada' },
        { status: 404 }
      );
    }

    // Generar CSV
    const csvHeader = 'Date,Value,Notes\n';
    const csvRows = metric.values
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(v => {
        const date = v.date.toISOString().split('T')[0];
        const value = v.value.toString();
        const notes = v.notes ? `"${v.notes.replace(/"/g, '""')}"` : '';
        return `${date},${value},${notes}`;
      })
      .join('\n');

    const csv = csvHeader + csvRows;

    // Actualizar fecha de última exportación
    metric.lastExportedAt = new Date();
    await metric.save();

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${metric.name}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error al exportar métrica:', error);
    return NextResponse.json(
      { error: 'Error al exportar métrica' },
      { status: 500 }
    );
  }
}

