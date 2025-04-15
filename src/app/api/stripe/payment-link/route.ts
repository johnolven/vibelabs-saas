import { NextResponse } from 'next/server';
import { PLAN_DETAILS, getStripeInstance, createStripeCustomer } from '@/lib/stripe';
import connectDB from '@/lib/db';
import User from '@/models/User';

// Verificar autenticación y extraer token
async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  
  // En una implementación real, verificaríamos el JWT aquí
  // Por simplicidad, solo verificamos que existe un token
  if (!token) {
    return null;
  }
  
  return token;
}

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const token = await verifyAuth(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Conectar a la base de datos
    await connectDB();
    
    // Obtener datos del cuerpo de la solicitud
    const { userId, planId, successUrl, cancelUrl } = await request.json();
    
    console.log('Datos recibidos:', { userId, planId, successUrl, cancelUrl });
    
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
    
    // Verificar que el plan existe
    const normalizedPlanId = planId.toLowerCase();
    console.log('Buscando plan con ID normalizado:', normalizedPlanId);
    
    // Buscar plan por coincidencia exacta primero
    let planDetails = Object.entries(PLAN_DETAILS).find(
      ([id]) => id.toLowerCase() === normalizedPlanId
    )?.[1];
    
    // Si no se encuentra por ID exacto, buscar por nombre
    if (!planDetails) {
      planDetails = Object.values(PLAN_DETAILS).find(
        plan => plan.name.toLowerCase().includes(normalizedPlanId) || 
                normalizedPlanId.includes(plan.name.toLowerCase())
      );
    }
    
    if (!planDetails || !planDetails.priceId) {
      console.error('Plan no válido o sin ID de precio:', planId);
      console.error('Planes disponibles:', Object.keys(PLAN_DETAILS));
      return NextResponse.json(
        { 
          error: 'Plan no válido o sin ID de precio en Stripe', 
          planProporcionado: planId,
          planesDisponibles: Object.keys(PLAN_DETAILS),
          valoresPlan: planDetails
        },
        { status: 400 }
      );
    }
    
    console.log('Plan encontrado:', planDetails.name, 'con priceId:', planDetails.priceId);
    
    // Asegurar que el usuario tiene un ID de cliente en Stripe
    let stripeCustomerId = user.stripeCustomerId;
    
    if (!stripeCustomerId) {
      console.log('Creando cliente de Stripe para:', user.email);
      // Crear un cliente en Stripe si no existe
      try {
        const customer = await createStripeCustomer({
          email: user.email,
          name: user.name,
        });
        
        stripeCustomerId = customer.id;
        
        // Guardar el ID de cliente de Stripe en nuestra base de datos
        user.stripeCustomerId = stripeCustomerId;
        await user.save();
        
        console.log('Cliente de Stripe creado:', stripeCustomerId);
      } catch (stripeError) {
        console.error('Error al crear cliente en Stripe:', stripeError);
        return NextResponse.json(
          { 
            error: 'Error al crear cliente en Stripe',
            detalle: stripeError instanceof Error ? stripeError.message : 'Error desconocido'
          },
          { status: 500 }
        );
      }
    } else {
      console.log('Cliente de Stripe existente:', stripeCustomerId);
    }
    
    // Crear enlace de pago con Stripe directamente usando la instancia del servidor
    try {
      console.log('Creando enlace de pago para:', stripeCustomerId, 'con priceId:', planDetails.priceId);
      
      // Obtener la instancia de Stripe del servidor
      const stripe = getStripeInstance();
      
      // Crear enlace de pago directamente con la API de Stripe
      const paymentLink = await stripe!.paymentLinks.create({
        line_items: [
          {
            price: planDetails.priceId,
            quantity: 1,
          },
        ],
        after_completion: {
          type: 'redirect',
          redirect: {
            url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
          },
        }
      });
      
      console.log('Enlace de pago creado:', paymentLink.url);
      
      return NextResponse.json({
        url: paymentLink.url,
        paymentLinkId: paymentLink.id,
      });
    } catch (stripeError) {
      console.error('Error detallado al crear enlace de pago en Stripe:', stripeError);
      return NextResponse.json(
        { 
          error: 'Error al crear el enlace de pago', 
          detalle: stripeError instanceof Error ? stripeError.message : 'Error desconocido'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error general al crear enlace de pago:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear el enlace de pago',
        detalle: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Ruta para obtener detalles de los planes disponibles
export async function GET() {
  try {
    const plans = Object.entries(PLAN_DETAILS).map(([id, details]) => ({
      id,
      name: details.name,
      description: details.description,
      features: details.features,
      price: details.price,
      // No enviamos el priceId al cliente por seguridad
    }));
    
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    return NextResponse.json(
      { error: 'Error al obtener los planes disponibles' },
      { status: 500 }
    );
  }
} 