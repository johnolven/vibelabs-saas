import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MonthlyUpdate from '@/models/MonthlyUpdate';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener un update específico
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

    if (!hasPermission(user.role, 'read_updates')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver updates' },
        { status: 403 }
      );
    }

    const update = await MonthlyUpdate.findById(params.id)
      .populate('sentBy', 'name email')
      .populate('sentTo', 'name email');

    if (!update) {
      return NextResponse.json(
        { error: 'Update no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ update });
  } catch (error) {
    console.error('Error al obtener update:', error);
    return NextResponse.json(
      { error: 'Error al obtener update' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar update
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

    if (!hasPermission(user.role, 'write_updates')) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar updates' },
        { status: 403 }
      );
    }

    const update = await MonthlyUpdate.findById(params.id);
    if (!update) {
      return NextResponse.json(
        { error: 'Update no encontrado' },
        { status: 404 }
      );
    }

    // No permitir editar updates ya enviados
    if (update.status === 'sent') {
      return NextResponse.json(
        { error: 'No se puede editar un update ya enviado' },
        { status: 400 }
      );
    }

    // Actualizar campos
    if (data.title) update.title = data.title;
    if (data.sections) update.sections = data.sections;
    if (data.status) update.status = data.status;
    if (data.emailSubject) update.emailSubject = data.emailSubject;
    if (data.emailBody) update.emailBody = data.emailBody;

    await update.save();

    return NextResponse.json({ update });
  } catch (error) {
    console.error('Error al actualizar update:', error);
    return NextResponse.json(
      { error: 'Error al actualizar update' },
      { status: 500 }
    );
  }
}

// POST: Enviar update por email (email blast)
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

    if (!hasPermission(user.role, 'send_updates')) {
      return NextResponse.json(
        { error: 'No tienes permiso para enviar updates' },
        { status: 403 }
      );
    }

    const update = await MonthlyUpdate.findById(params.id);
    if (!update) {
      return NextResponse.json(
        { error: 'Update no encontrado' },
        { status: 404 }
      );
    }

    if (update.status === 'sent') {
      return NextResponse.json(
        { error: 'Este update ya fue enviado' },
        { status: 400 }
      );
    }

    // Obtener lista de inversores (investors y boardmembers)
    const investors = await User.find({
      role: { $in: ['investor', 'boardmember'] },
      status: 'active'
    }).select('email name');

    // TODO: Implementar envío de emails real
    // Por ahora solo marcamos como enviado
    update.status = 'sent';
    update.sentAt = new Date();
    update.sentTo = investors.map(inv => inv._id);
    update.emailSentCount = investors.length;
    await update.save();

    // En producción, aquí se enviaría el email usando un servicio como SendGrid, Resend, etc.
    console.log(`Enviando update a ${investors.length} inversores`);

    return NextResponse.json({
      message: `Update enviado a ${investors.length} inversores`,
      update
    });
  } catch (error) {
    console.error('Error al enviar update:', error);
    return NextResponse.json(
      { error: 'Error al enviar update' },
      { status: 500 }
    );
  }
}

