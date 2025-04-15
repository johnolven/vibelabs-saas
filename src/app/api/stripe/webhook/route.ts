// @ts-nocheck\n
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Stripe from 'stripe';

// Inicializar Stripe directamente en este archivo para evitar problemas
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

export async function POST(request: Request) {
  try {
    console.log('Webhook de Stripe recibido');
    
    // Obtener payload y firma
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Falta header de firma de Stripe');
      return NextResponse.json({ error: 'Falta firma de Stripe' }, { status: 400 });
    }

    // Verificar firma del webhook con tolerancia a errores
    let event;
    try {
      console.log('Verificando firma del webhook...');
      console.log('Longitud del payload:', body.length);
      console.log('Firma:', signature.substring(0, 20) + '...');
      console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'Configurado' : 'No configurado');
      
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
      
      console.log('Firma verificada correctamente, evento:', event.type);
    } catch (err) {
      console.error('Error al verificar firma del webhook:', err);
      
      // Intentar procesar el evento de todos modos para depuración (solo en desarrollo)
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Modo desarrollo: intentando procesar payload sin verificación...');
          const payload = JSON.parse(body);
          event = { 
            type: payload.type,
            data: { object: payload.data.object }
          };
          console.log('Evento parseado sin verificación:', event.type);
        } else {
          throw err;
        }
      } catch (parseError) {
        console.error('Error al parsear payload:', parseError);
        return NextResponse.json(
          { error: 'Error al verificar firma de webhook' },
          { status: 400 }
        );
      }
    }

    // Conectar a la base de datos
    await connectDB();

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Sesión de checkout completada:', session.id);
        
        // Intentar encontrar al usuario por customerId
        let user = await User.findOne({ stripeCustomerId: session.customer });
        
        // Si no se encuentra, buscar por email
        if (!user && session.customer_email) {
          console.log('Usuario no encontrado por customerId, buscando por email:', session.customer_email);
          user = await User.findOne({ email: session.customer_email });
          
          if (user) {
            console.log('Usuario encontrado por email:', user.email);
            // Actualizar el customerId en la base de datos
            user.stripeCustomerId = session.customer as string;
          }
        }
        
        // Si aún no lo encontramos, buscar en los metadata
        if (!user && session.metadata && session.metadata.userId) {
          console.log('Buscando por userId en metadata:', session.metadata.userId);
          user = await User.findById(session.metadata.userId);
          
          if (user) {
            console.log('Usuario encontrado por metadata userId:', user.email);
            user.stripeCustomerId = session.customer as string;
          }
        }
        
        // Para desarrollo, obtener detalles del customer para debug
        if (!user && process.env.NODE_ENV === 'development') {
          try {
            const customerDetails = await stripe.customers.retrieve(session.customer as string);
            
            // Tratando customerDetails como un objeto genérico
            const customerInfo = {
              email: typeof customerDetails === 'object' && 'email' in customerDetails ? customerDetails.email : 'N/A',
              name: typeof customerDetails === 'object' && 'name' in customerDetails ? customerDetails.name : 'N/A',
              metadata: typeof customerDetails === 'object' && 'metadata' in customerDetails ? customerDetails.metadata : {}
            };
            
            console.log('Detalles del cliente para depuración:', customerInfo);
            
            // Último intento: buscar usuario por email del cliente
            if (customerInfo.email && customerInfo.email !== 'N/A') {
              user = await User.findOne({ email: customerInfo.email });
              if (user) {
                console.log('Usuario encontrado por email del cliente:', user.email);
                user.stripeCustomerId = session.customer as string;
              }
            }
          } catch (error) {
            console.error('Error al obtener detalles del cliente:', error);
          }
        }
        
        if (!user) {
          console.error('USUARIO NO ENCONTRADO para la sesión:', session.id);
          console.error('Customer ID:', session.customer);
          console.error('Email:', session.customer_email);
          console.error('Metadata:', session.metadata);
          
          return NextResponse.json({ 
            received: true, 
            error: 'Usuario no encontrado',
            customer: session.customer,
            email: session.customer_email 
          }, { status: 200 }); // Devolvemos 200 para que Stripe no reintente
        }

        // Actualizar información de suscripción del usuario
        if (session.subscription) {
          user.subscriptionId = session.subscription as string;
          user.subscriptionStatus = 'active';
          
          // Obtener detalles de la suscripción para determinar el plan
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            
            // Obtener ID del precio para determinar el plan
            if (subscription.items.data[0]?.price?.id) {
              const priceId = subscription.items.data[0].price.id;
              
              // Mapear priceId a plan
              if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC) {
                user.subscriptionPlan = 'basic';
              } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM) {
                user.subscriptionPlan = 'premium';
              } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE) {
                user.subscriptionPlan = 'enterprise';
              }
              
              // Guardar fecha de fin del período
              if (subscription.current_period_end) {
                user.subscriptionCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
              }
            }
          } catch (error) {
            console.error('Error al obtener detalles de suscripción:', error);
          }
          
          await user.save();
          console.log(`Suscripción activada para el usuario ${user.email}, plan: ${user.subscriptionPlan}`);
        }
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Record<string, unknown>;
        console.log('Pago de factura exitoso:', invoice.id);
        
        // Si esto es para una suscripción
        if (invoice.subscription) {
          let user = await User.findOne({ subscriptionId: invoice.subscription });
          
          // Si no encontramos por subscriptionId, intentar por customerId
          if (!user && invoice.customer) {
            user = await User.findOne({ stripeCustomerId: invoice.customer });
          }
          
          if (user) {
            // Actualizar el estado de la suscripción y la fecha de finalización
            user.subscriptionStatus = 'active';
            
            // Si tenemos el período de facturación, actualizamos la fecha de finalización
            if ((invoice.lines as Record<string, unknown>)?.data?.[0]?.period?.end) {
              user.subscriptionCurrentPeriodEnd = new Date(((invoice.lines as Record<string, unknown>).data[0].period.end as number) * 1000);
            }
            
            await user.save();
            console.log(`Pago de factura exitoso para usuario ${user.email}`);
          } else {
            console.error('USUARIO NO ENCONTRADO para factura:', invoice.id);
            console.error('Customer ID:', invoice.customer);
            console.error('Subscription ID:', invoice.subscription);
          }
        }
        
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Record<string, unknown>;
        console.log('Pago de factura fallido:', invoice.id);
        
        // Si esto es para una suscripción
        if (invoice.subscription) {
          let user = await User.findOne({ subscriptionId: invoice.subscription });
          
          // Si no encontramos por subscriptionId, intentar por customerId
          if (!user && invoice.customer) {
            user = await User.findOne({ stripeCustomerId: invoice.customer });
          }
          
          if (user) {
            // Cambiar el estado a 'past_due' en lugar de cancelar inmediatamente
            user.subscriptionStatus = 'past_due';
            await user.save();
            console.log(`Pago de factura fallido para usuario ${user.email}`);
          } else {
            console.error('USUARIO NO ENCONTRADO para factura fallida:', invoice.id);
          }
        }
        
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Record<string, unknown>;
        console.log('Suscripción actualizada:', subscription.id);
        
        let user = await User.findOne({ subscriptionId: subscription.id });
        
        // Si no encontramos por subscriptionId, intentar por customerId
        if (!user && subscription.customer) {
          user = await User.findOne({ stripeCustomerId: subscription.customer });
          
          // Si lo encontramos por customerId, actualizar el subscriptionId
          if (user) {
            user.subscriptionId = subscription.id as string;
          }
        }
        
        if (user) {
          // Actualizar el estado de la suscripción
          user.subscriptionStatus = subscription.status;
          
          // Actualizar plan basado en precio
          if (subscription.items?.data[0]?.price?.id) {
            const priceId = subscription.items.data[0].price.id;
            
            // Mapear priceId a plan
            if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC) {
              user.subscriptionPlan = 'basic';
            } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM) {
              user.subscriptionPlan = 'premium';
            } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE) {
              user.subscriptionPlan = 'enterprise';
            }
          }
          
          // Actualizar la fecha de finalización del período actual
          if (subscription.current_period_end) {
            user.subscriptionCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
          }
          
          await user.save();
          console.log(`Suscripción actualizada para usuario ${user.email}: ${subscription.status}`);
        } else {
          console.error('USUARIO NO ENCONTRADO para actualización de suscripción:', subscription.id);
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Record<string, unknown>;
        console.log('Suscripción cancelada:', subscription.id);
        
        let user = await User.findOne({ subscriptionId: subscription.id });
        
        // Si no encontramos por subscriptionId, intentar por customerId
        if (!user && subscription.customer) {
          user = await User.findOne({ stripeCustomerId: subscription.customer });
        }
        
        if (user) {
          // Cambiar al plan gratuito
          user.subscriptionPlan = 'free';
          user.subscriptionStatus = 'canceled';
          
          await user.save();
          console.log(`Suscripción cancelada para usuario ${user.email}`);
        } else {
          console.error('USUARIO NO ENCONTRADO para cancelación de suscripción:', subscription.id);
        }
        
        break;
      }
      
      case 'payment_intent.succeeded': {
        console.log('Pago exitoso recibido (payment_intent)');
        break;
      }
      
      case 'payment_intent.payment_failed': {
        console.log('Pago fallido recibido (payment_intent)');
        break;
      }
      
      // Más casos según sea necesario para tu aplicación
      
      default:
        console.log(`Evento de Stripe no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    console.error('Error en webhook de Stripe:', error);
    return NextResponse.json(
      { error: 'Error en el webhook' },
      { status: 400 }
    );
  }
}

// Desactivar el bodyParser para recibir el cuerpo sin procesar
export const config = {
  api: {
    bodyParser: false,
  },
}; 