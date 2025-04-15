import { NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe';
import connectDB from '@/lib/db';
import User from '@/models/User';

// Endpoint para actualizar información de suscripción sin verificación JWT
// NOTA: Este endpoint solo debe usarse temporalmente para solucionar problemas
export async function POST(request: Request) {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    const { userId, customerId, subscriptionId } = await request.json();
    
    // Validar datos
    if (!userId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de usuario' },
        { status: 400 }
      );
    }
    
    if (!customerId && !subscriptionId) {
      return NextResponse.json(
        { error: 'Se requiere customerId o subscriptionId' },
        { status: 400 }
      );
    }

    // Buscar usuario por ID
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`Actualizando suscripción para usuario: ${user.email}`);

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
          console.log('Price ID encontrado:', priceId);
          
          // Verificar contra los valores en .env
          console.log('Valores en .env:');
          console.log('STRIPE_PRICE_BASIC:', process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC);
          console.log('STRIPE_PRICE_PREMIUM:', process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM);
          console.log('STRIPE_PRICE_ENTERPRISE:', process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE);
          
          // Mapear el ID de precio a un plan
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC) {
            user.subscriptionPlan = 'basic';
            console.log('Plan básico asignado');
          } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM) {
            user.subscriptionPlan = 'premium';
            console.log('Plan premium asignado');
          } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE) {
            user.subscriptionPlan = 'enterprise';
            console.log('Plan empresarial asignado');
          } else {
            // Asignar por defecto el plan básico si no podemos determinar el plan
            user.subscriptionPlan = 'basic';
            console.log('No se pudo determinar el plan, asignando básico por defecto');
          }
        }
        
        // Fecha de finalización del período actual
        // @ts-expect-error - ignorar error de typings
        if (subscription.current_period_end) {
          // @ts-expect-error - ignorar error de typings
          user.subscriptionCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
          console.log(`Fecha de fin de período asignada: ${user.subscriptionCurrentPeriodEnd}`);
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
    console.log('Usuario actualizado y guardado correctamente');
    
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
      { 
        error: 'Error al sincronizar suscripción',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 