import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    // Conectar a la base de datos
    await connectDB();

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado' },
        { status: 400 }
      );
    }

    // Crear nuevo usuario con rol explícito
    const user = await User.create({
      name,
      email,
      password,
      role: 'user', // Establecer explícitamente como usuario regular
    });

    // Generar token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Retornar respuesta exitosa
    return NextResponse.json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // Incluir el rol en la respuesta
      }
    });

  } catch (error: unknown) {
    console.error('Error en el registro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en el servidor' },
      { status: 500 }
    );
  }
} 