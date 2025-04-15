import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Obtener el perfil del usuario
export async function GET(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = await verifyToken(token);
    await connectDB();

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role || 'user',
      status: user.status || 'active',
      subscriptionPlan: user.subscriptionPlan || 'free',
      subscriptionStatus: user.subscriptionStatus || 'none',
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      subscriptionId: user.subscriptionId,
      stripeCustomerId: user.stripeCustomerId
    });

  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    return NextResponse.json(
      { error: 'Error al obtener el perfil' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar el perfil del usuario
export async function PUT(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = await verifyToken(token);
    const data = await req.json();
    await connectDB();

    // Validar los datos
    if (!data.name?.trim() || !data.email?.trim()) {
      return NextResponse.json(
        { error: 'Nombre y correo electrónico son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el correo ya está en uso por otro usuario
    const existingUser = await User.findOne({
      email: data.email,
      _id: { $ne: userId }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está en uso' },
        { status: 400 }
      );
    }

    interface UpdateUserData {
      name: string;
      email: string;
      password?: string;
    }

    // Preparar los datos a actualizar
    const updateData: UpdateUserData = {
      name: data.name,
      email: data.email
    };

    // Si se proporcionó contraseña, actualizarla
    if (data.currentPassword && data.newPassword) {
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      // Verificar la contraseña actual
      const isValidPassword = await user.comparePassword(data.currentPassword);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Contraseña actual incorrecta' },
          { status: 400 }
        );
      }

      // Validar la nueva contraseña
      if (data.newPassword.length < 8) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
          { status: 400 }
        );
      }

      // Hashear la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.newPassword, salt);
    }

    // Actualizar el usuario
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      role: updatedUser.role || 'user',
      status: updatedUser.status || 'active',
      subscriptionPlan: updatedUser.subscriptionPlan || 'free',
      subscriptionStatus: updatedUser.subscriptionStatus || 'none',
      subscriptionCurrentPeriodEnd: updatedUser.subscriptionCurrentPeriodEnd,
      subscriptionId: updatedUser.subscriptionId,
      stripeCustomerId: updatedUser.stripeCustomerId
    });

  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el perfil' },
      { status: 500 }
    );
  }
} 