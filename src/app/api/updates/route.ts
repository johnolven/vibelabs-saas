import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MonthlyUpdate from '@/models/MonthlyUpdate';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener updates (todos pueden leer según permisos)
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

    if (!hasPermission(user.role, 'read_updates')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver updates' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    let query: any = {};
    if (status) query.status = status;
    if (year) query.year = parseInt(year);

    const updates = await MonthlyUpdate.find(query)
      .populate('sentBy', 'name email')
      .populate('sentTo', 'name email')
      .sort({ year: -1, month: -1 });

    return NextResponse.json({ updates });
  } catch (error) {
    console.error('Error al obtener updates:', error);
    return NextResponse.json(
      { error: 'Error al obtener updates' },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo update (solo founders/admins)
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

    if (!hasPermission(user.role, 'write_updates')) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear updates' },
        { status: 403 }
      );
    }

    // Validar datos
    if (!data.title || !data.month || !data.year || !data.sections) {
      return NextResponse.json(
        { error: 'Título, mes, año y secciones son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un update para ese mes/año
    const existingUpdate = await MonthlyUpdate.findOne({
      month: data.month,
      year: data.year
    });

    if (existingUpdate && existingUpdate.status === 'sent') {
      return NextResponse.json(
        { error: 'Ya existe un update enviado para este mes/año' },
        { status: 400 }
      );
    }

    let update;
    if (existingUpdate) {
      // Actualizar existente
      existingUpdate.title = data.title;
      existingUpdate.sections = data.sections;
      existingUpdate.status = data.status || 'draft';
      existingUpdate.emailSubject = data.emailSubject;
      existingUpdate.emailBody = data.emailBody;
      await existingUpdate.save();
      update = existingUpdate;
    } else {
      // Crear nuevo
      update = await MonthlyUpdate.create({
        title: data.title,
        month: data.month,
        year: data.year,
        sections: data.sections,
        status: data.status || 'draft',
        sentBy: userId,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody
      });
    }

    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    console.error('Error al crear update:', error);
    return NextResponse.json(
      { error: 'Error al crear update' },
      { status: 500 }
    );
  }
}

