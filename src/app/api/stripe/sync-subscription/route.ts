import { NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe';
import connectDB from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

// Verificar token y obtener usuario
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está definido');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    await connectDB();
    
    const user = await User.findById(decoded.id);
    return user;
  } catch (error) {
    console.error('Error validando token:', error);
    return null;
  }
}

// Endpoint para actualizar información de suscripción
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'));
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { customerId, subscriptionId } = await request.json();
    
    // Validar datos
    if (!customerId && !subscriptionId) {
      return NextResponse.json(
        { error: 'Se requiere customerId o subscriptionId' },
        { status: 400 }
      );
    }

    const stripe = getStripeInstance();
    
    // Si tenemos el ID de cliente de Stripe, lo guardamos
    if (customerId) {
      // Verificar que el cliente existe en Stripe
      try {
        const customer = await stripe!.customers.retrieve(customerId);
        if (customer.deleted) {
          return NextResponse.json(
            { error: 'El cliente de Stripe ha sido eliminado' },
            { status: 400 }
          );
        }
        user.stripeCustomerId = customerId;
        console.log(`ID de cliente de Stripe actualizado para ${user.email}: ${customerId}`);
      } catch (error) {
        console.error('Error al recuperar cliente de Stripe:', error);
        return NextResponse.json(
          { error: 'Cliente no encontrado en Stripe' },
          { status: 400 }
        );
      }
    }

    // Si tenemos el ID de suscripción, actualizar información
    if (subscriptionId) {
      try {
        const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
        
        user.subscriptionId = subscriptionId;
        user.subscriptionStatus = subscription.status as string;
        
        // Obtener información del plan
        if (subscription.items?.data[0]?.price?.id) {
          const priceId = subscription.items.data[0].price.id;
          // Mapear el ID de precio a un plan
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC) {
            user.subscriptionPlan = 'basic';
          } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM) {
            user.subscriptionPlan = 'premium';
          } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE) {
            user.subscriptionPlan = 'enterprise';
          }
        }
        
        // Fecha de finalización del período actual
        // @ts-expect-error - ignorar error de typings
        if (subscription.current_period_end) {
          // @ts-expect-error - ignorar error de typings
          user.subscriptionCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
        }
        
        console.log(`Información de suscripción actualizada para ${user.email}: ${subscription.status}`);
      } catch (error) {
        console.error('Error al recuperar suscripción de Stripe:', error);
        return NextResponse.json(
          { error: 'Suscripción no encontrada en Stripe' },
          { status: 400 }
        );
      }
    }
    
    // Guardar cambios
    await user.save();
    
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      }
    });
  } catch (error) {
    console.error('Error al sincronizar suscripción:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar suscripción' },
      { status: 500 }
    );
  }
}

// Endpoint para buscar suscripción por correo
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'));
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Solo administradores pueden buscar suscripciones
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }
    
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Se requiere el correo electrónico' },
        { status: 400 }
      );
    }
    
    // Buscar usuario por correo
    const targetUser = await User.findOne({ email });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Buscar cliente en Stripe por correo
    const stripe = getStripeInstance();
    const customers = await stripe!.customers.list({
      email,
      limit: 1
    });
    
    if (customers.data.length === 0) {
      return NextResponse.json({
        user: {
          id: targetUser._id,
          email: targetUser.email,
          name: targetUser.name,
          stripeCustomerId: targetUser.stripeCustomerId,
          subscriptionId: targetUser.subscriptionId,
          subscriptionPlan: targetUser.subscriptionPlan,
          subscriptionStatus: targetUser.subscriptionStatus,
        },
        stripeCustomer: null
      });
    }
    
    const stripeCustomer = customers.data[0];
    
    // Buscar suscripciones
    const subscriptions = await stripe!.subscriptions.list({
      customer: stripeCustomer.id
    });
    
    return NextResponse.json({
      user: {
        id: targetUser._id,
        email: targetUser.email,
        name: targetUser.name,
        stripeCustomerId: targetUser.stripeCustomerId,
        subscriptionId: targetUser.subscriptionId,
        subscriptionPlan: targetUser.subscriptionPlan,
        subscriptionStatus: targetUser.subscriptionStatus,
      },
      stripeCustomer: {
        id: stripeCustomer.id,
        subscriptions: subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          // @ts-expect-error - ignorar error de typings
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          priceId: sub.items.data[0]?.price.id
        }))
      }
    });
  } catch (error) {
    console.error('Error al buscar suscripción:', error);
    return NextResponse.json(
      { error: 'Error al buscar suscripción' },
      { status: 500 }
    );
  }
} 