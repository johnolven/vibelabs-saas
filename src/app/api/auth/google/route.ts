import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import connectDB from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();

    // Verificar el token de Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('No se pudo verificar el token de Google');
    }

    const { email, name, sub: googleId } = payload;

    // Conectar a la base de datos
    await connectDB();

    // Buscar o crear el usuario
    let user = await User.findOne({ email });

    if (!user) {
      // Crear un nuevo usuario
      user = await User.create({
        name,
        email,
        googleId,
        // Generar una contraseña aleatoria para usuarios de Google
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Retornar respuesta exitosa
    return NextResponse.json({
      message: 'Autenticación con Google exitosa',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        status: user.status || 'active',
        subscriptionPlan: user.subscriptionPlan || 'free',
        subscriptionStatus: user.subscriptionStatus || 'none',
        subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
        subscriptionId: user.subscriptionId,
        stripeCustomerId: user.stripeCustomerId
      }
    });

  } catch (error) {
    console.error('Error en la autenticación con Google:', error);
    return NextResponse.json(
      { error: 'Error en la autenticación con Google' },
      { status: 500 }
    );
  }
} 