import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Stripe from 'stripe';
import { getBaseUrl } from '@/lib/utils';

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

export async function POST(request: Request) {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Obtener datos del cuerpo de la solicitud
    const { userId, planId, successUrl, cancelUrl } = await request.json();
    
    console.log('Creando enlace de pago para:', { userId, planId });
    
    if (!userId || !planId) {
      return NextResponse.json(
        { error: 'userId y planId son requeridos' },
        { status: 400 }
      );
    }
    
    // Obtener detalles del usuario
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('Usuario no encontrado:', userId);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    console.log('Usuario encontrado:', user.email);
    
    // Determinar el priceId según el plan solicitado
    let priceId = '';
    if (planId === 'basic' || planId.toLowerCase().includes('basic')) {
      priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || '';
    } else if (planId === 'premium' || planId.toLowerCase().includes('premium')) {
      priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || '';
    } else if (planId === 'enterprise' || planId.toLowerCase().includes('enterprise')) {
      priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || '';
    }
    
    if (!priceId) {
      console.error('Plan no válido o sin ID de precio:', planId);
      return NextResponse.json(
        { error: 'Plan no válido o sin ID de precio en Stripe' },
        { status: 400 }
      );
    }
    
    console.log('PriceID identificado:', priceId);
    
    // URL de redirección
    const success = successUrl || `${getBaseUrl()}/dashboard/settings/billing?success=true`;
    const cancel = cancelUrl || `${getBaseUrl()}/dashboard/settings/billing?canceled=true`;
    
    // Asegurar que el usuario tiene un ID de cliente en Stripe
    let stripeCustomerId = user.stripeCustomerId;
    
    if (!stripeCustomerId) {
      console.log('Creando cliente de Stripe para:', user.email);
      // Crear un cliente en Stripe si no existe
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: user._id.toString() // Añadir el ID de usuario como metadato
          }
        });
        
        stripeCustomerId = customer.id;
        
        // Guardar el ID de cliente de Stripe en nuestra base de datos
        user.stripeCustomerId = stripeCustomerId;
        await user.save();
        
        console.log('Cliente de Stripe creado:', stripeCustomerId);
      } catch (stripeError) {
        console.error('Error al crear cliente en Stripe:', stripeError);
        return NextResponse.json(
          { error: 'Error al crear cliente en Stripe' },
          { status: 500 }
        );
      }
    } else {
      console.log('Cliente de Stripe existente:', stripeCustomerId);
    }
    
    // Intentar crear primero un checkout session (mejor experiencia de usuario)
    try {
      console.log('Creando sesión de pago para:', { stripeCustomerId, priceId });
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: success,
        cancel_url: cancel,
        metadata: {
          userId: user._id.toString()
        }
      });
      
      console.log('Sesión de checkout creada:', session.url);
      
      return NextResponse.json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (checkoutError) {
      console.error('Error al crear sesión de checkout:', checkoutError);
      
      // Si falla el checkout, intentar crear un enlace de pago
      try {
        console.log('Intentando crear enlace de pago como alternativa...');
        const paymentLink = await stripe.paymentLinks.create({
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          after_completion: {
            type: 'redirect',
            redirect: {
              url: success,
            },
          }
        });
        
        console.log('Enlace de pago creado como alternativa:', paymentLink.url);
        
        return NextResponse.json({
          url: paymentLink.url,
          paymentLinkId: paymentLink.id,
        });
      } catch (linkError) {
        console.error('Error al crear enlace de pago alternativo:', linkError);
        return NextResponse.json(
          { error: 'Error al crear enlace de pago' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error general al crear enlace de pago:', error);
    return NextResponse.json(
      { error: 'Error al crear el enlace de pago' },
      { status: 500 }
    );
  }
} 