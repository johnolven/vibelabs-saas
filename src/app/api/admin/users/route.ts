import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Obtener todos los usuarios (sólo para administradores)
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
    
    // Verificar si el usuario es administrador
    const adminUser = await User.findById(userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de administrador' },
        { status: 403 }
      );
    }
    
    // Obtener todos los usuarios
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Transformar los datos para ajustarse a la interfaz de la aplicación
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || 'user', // Default to 'user' if not specified
      createdAt: user.createdAt.toISOString(),
      status: user.status || 'active', // Default to 'active' if not specified
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : undefined
    }));
    
    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario (sólo administradores)
export async function POST(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const adminId = await verifyToken(token);
    const data = await req.json();
    await connectDB();
    
    // Verificar si el usuario es administrador
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de administrador' },
        { status: 403 }
      );
    }
    
    // Validar datos
    if (!data.name?.trim() || !data.email?.trim()) {
      return NextResponse.json(
        { error: 'Nombre y correo electrónico son requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado' },
        { status: 400 }
      );
    }
    
    // Generar contraseña temporal si no se proporcionó
    if (!data.password) {
      data.password = Math.random().toString(36).slice(-8);
    }
    
    // Crear el nuevo usuario
    const newUser = new User({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'user',
      status: data.status || 'active'
    });
    
    await newUser.save();
    
    // Retornar el usuario creado (sin la contraseña)
    const createdUser = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role || 'user',
      createdAt: newUser.createdAt.toISOString(),
      status: newUser.status || 'active'
    };
    
    return NextResponse.json(createdUser, { status: 201 });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar usuario (sólo administradores)
export async function PUT(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const adminId = await verifyToken(token);
    const data = await req.json();
    await connectDB();
    
    // Verificar si el usuario es administrador
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de administrador' },
        { status: 403 }
      );
    }
    
    // Validar datos
    if (!data.id || !data.name?.trim() || !data.email?.trim()) {
      return NextResponse.json(
        { error: 'ID, nombre y correo electrónico son requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar si el email ya existe para otro usuario
    const existingUser = await User.findOne({
      email: data.email,
      _id: { $ne: data.id }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está en uso por otro usuario' },
        { status: 400 }
      );
    }
    
    // Preparar datos de actualización
    const updateData: {
      name: string;
      email: string;
      role: string;
      status: string;
      password?: string;
    } = {
      name: data.name,
      email: data.email,
      role: data.role || 'user',
      status: data.status || 'active'
    };
    
    // Si se proporcionó nueva contraseña, hashearla
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }
    
    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      data.id,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Retornar usuario actualizado
    const formattedUser = {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role || 'user',
      createdAt: updatedUser.createdAt.toISOString(),
      status: updatedUser.status || 'active',
      lastLogin: updatedUser.lastLogin ? updatedUser.lastLogin.toISOString() : undefined
    };
    
    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario (sólo administradores)
export async function DELETE(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Obtener el ID del usuario a eliminar de la URL
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Se requiere ID de usuario' },
        { status: 400 }
      );
    }

    const adminId = await verifyToken(token);
    await connectDB();
    
    // Verificar si el usuario es administrador
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de administrador' },
        { status: 403 }
      );
    }
    
    // Evitar que un administrador se elimine a sí mismo
    if (adminId.toString() === userId) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propio usuario' },
        { status: 400 }
      );
    }
    
    // Eliminar usuario
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Usuario eliminado correctamente' 
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
} 