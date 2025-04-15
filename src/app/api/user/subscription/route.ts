import { NextResponse } from 'next/server';
import { cancelSubscription } from '@/lib/stripe';
import connectDB from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

// Verificar token y obtener usuario
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Header de autorización no válido o faltante:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está definido');
    }
    
    console.log('Intentando verificar token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    console.log('Token verificado correctamente, ID:', decoded.id);
    
    await connectDB();
    
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('Usuario no encontrado en la base de datos para ID:', decoded.id);
      return null;
    }
    
    console.log('Usuario encontrado:', user.email);
    return user;
  } catch (error) {
    console.error('Error validando token:', error);
    return null;
  }
}

// Obtener información de suscripción sin verificación de token (solo para depuración)
export async function GET(request: Request) {
  try {
    // Intentar primero con autenticación normal
    const user = await getUserFromToken(request.headers.get('authorization'));
    
    // Si no hay usuario autenticado, intentar con userId en query params (solo para depuración)
    if (!user) {
      const url = new URL(request.url);
      const bypassAuth = url.searchParams.get('bypass_auth');
      const userId = url.searchParams.get('user_id');
      
      if (bypassAuth === 'true' && userId) {
        console.log('Bypass de autenticación habilitado, buscando usuario por ID:', userId);
        
        await connectDB();
        const userByUserId = await User.findById(userId);
        
        if (!userByUserId) {
          console.log('Usuario no encontrado por ID:', userId);
          return NextResponse.json(
            { error: 'Usuario no encontrado' },
            { status: 404 }
          );
        }
        
        console.log('Usuario encontrado por bypass:', userByUserId.email);
        
        // Devolver datos de suscripción
        return NextResponse.json({
          subscriptionId: userByUserId.subscriptionId,
          subscriptionStatus: userByUserId.subscriptionStatus,
          subscriptionPlan: userByUserId.subscriptionPlan,
          subscriptionCurrentPeriodEnd: userByUserId.subscriptionCurrentPeriodEnd,
          stripeCustomerId: userByUserId.stripeCustomerId
        });
      }
      
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Devolver datos de suscripción del usuario autenticado
    return NextResponse.json({
      subscriptionId: user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      stripeCustomerId: user.stripeCustomerId
    });
  } catch (error) {
    console.error('Error al obtener datos de suscripción:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de suscripción' },
      { status: 500 }
    );
  }
}

// Cancelar suscripción
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'));
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const { action } = await request.json();
    
    // Verificar acción solicitada
    if (action === 'cancel' && user.subscriptionId) {
      // Cancelar suscripción en Stripe
      await cancelSubscription(user.subscriptionId);
      
      // Actualizar datos en nuestra base de datos
      user.subscriptionStatus = 'canceled';
      await user.save();
      
      return NextResponse.json({
        success: true,
        message: 'Suscripción cancelada correctamente'
      });
    }
    
    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error al procesar acción de suscripción:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
} 