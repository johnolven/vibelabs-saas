import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

// Endpoint temporal para corregir el rol de usuarios que se registraron con Google
// y tienen potential_investor cuando deberían ser follower
export async function POST(req: Request) {
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

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Si el usuario tiene potential_investor y tiene googleId, cambiarlo a follower
    if (user.role === 'potential_investor' && user.googleId) {
      user.role = 'follower';
      await user.save();
      
      return NextResponse.json({
        message: 'Rol actualizado a follower',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    return NextResponse.json({
      message: 'No se requiere cambio de rol',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error al corregir rol:', error);
    return NextResponse.json(
      { error: 'Error al corregir rol' },
      { status: 500 }
    );
  }
}

