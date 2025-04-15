import Stripe from 'stripe';
import { getBaseUrl } from './utils';

// Tipos de planes disponibles
export const PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
};

// Detalles de los planes (accesibles tanto en cliente como servidor)
export const PLAN_DETAILS = {
  free: {
    name: 'Plan Gratuito',
    description: 'Funcionalidades básicas para comenzar',
    features: ['Acceso básico al dashboard', 'Hasta 5 tareas', '1 asistente virtual'],
    price: 0,
    priceId: '', // No tiene precio en Stripe
  },
  basic: {
    name: 'Plan Básico',
    description: 'Para profesionales individuales',
    features: ['Todo lo del plan gratuito', 'Hasta 100 tareas', '3 asistentes virtuales', 'Soporte por email'],
    price: 1000, // $10.00
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || '',
  },
  premium: {
    name: 'Plan Premium',
    description: 'Para equipos pequeños',
    features: ['Todo lo del plan básico', 'Tareas ilimitadas', '10 asistentes virtuales', 'Soporte prioritario'],
    price: 2500, // $25.00
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || '',
  },
  enterprise: {
    name: 'Plan Empresarial',
    description: 'Para grandes empresas',
    features: ['Todo lo del plan premium', 'Personalizaciones', 'Soporte 24/7', 'API dedicada'],
    price: 5000, // $50.00
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || '',
  },
};

// Verificar si estamos en el servidor
const isServer = typeof window === 'undefined';

// Solo inicializar el cliente Stripe en el servidor
let stripe: Stripe | null = null;

if (isServer) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  });
}

// Función para obtener el cliente Stripe (solo usar en el servidor)
export function getStripeInstance() {
  if (!isServer) {
    throw new Error('Esta función solo debe ser llamada desde el servidor');
  }
  return stripe;
}

// Las siguientes funciones solo funcionan en el servidor

// Crear enlace de suscripción
export async function createSubscriptionCheckoutSession({
  customerId,
  priceId,
  successUrl = `${getBaseUrl()}/dashboard/settings/billing?success=true`,
  cancelUrl = `${getBaseUrl()}/dashboard/settings/billing?canceled=true`,
}: {
  customerId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  if (!isServer) {
    throw new Error('Esta función solo debe ser llamada desde el servidor');
  }

  if (!priceId) {
    throw new Error('PriceId es requerido para crear una sesión de checkout');
  }

  const session = await stripe!.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

// Crear enlace de pago de suscripción
export async function createSubscriptionPaymentLink({
  priceId,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _customerId,
  successUrl = `${getBaseUrl()}/dashboard/settings/billing?success=true`,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _cancelUrl = `${getBaseUrl()}/dashboard/settings/billing?canceled=true`,
}: {
  priceId: string;
  _customerId?: string;
  successUrl?: string;
  _cancelUrl?: string;
}) {
  if (!isServer) {
    throw new Error('Esta función solo debe ser llamada desde el servidor');
  }

  if (!priceId) {
    throw new Error('PriceId es requerido para crear un enlace de pago');
  }

  const paymentLinkData: Partial<Stripe.PaymentLinkCreateParams> = {
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    after_completion: {
      type: 'redirect',
      redirect: {
        url: successUrl,
      },
    },
  };

  // Nota: En versiones recientes de la API de Stripe, esto se maneja de manera diferente
  const paymentLink = await stripe!.paymentLinks.create(paymentLinkData as Stripe.PaymentLinkCreateParams);

  // Si se proporcionó un customerId, lo manejaremos de otra manera
  // posiblemente con metadatos o a través del webhook

  return paymentLink;
}

// Recuperar información del cliente
export async function getStripeCustomer(customerId: string) {
  if (!isServer) {
    throw new Error('Esta función solo debe ser llamada desde el servidor');
  }

  if (!customerId) return null;
  
  try {
    const customer = await stripe!.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer;
  } catch (error) {
    console.error('Error al recuperar cliente de Stripe:', error);
    return null;
  }
}

// Crear un nuevo cliente en Stripe
export async function createStripeCustomer({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  if (!isServer) {
    throw new Error('Esta función solo debe ser llamada desde el servidor');
  }

  const customer = await stripe!.customers.create({
    email,
    name,
  });

  return customer;
}

// Cancelar una suscripción
export async function cancelSubscription(subscriptionId: string) {
  if (!isServer) {
    throw new Error('Esta función solo debe ser llamada desde el servidor');
  }

  if (!subscriptionId) {
    throw new Error('ID de suscripción requerido para cancelar');
  }

  return await stripe!.subscriptions.cancel(subscriptionId);
}

// Verificar si el webhook es válido
export function validateStripeWebhook(
  payload: string | Buffer,
  signature: string
) {
  if (!isServer) {
    throw new Error('Esta función solo debe ser llamada desde el servidor');
  }

  try {
    return stripe!.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error) {
    console.error('Error al validar webhook de Stripe:', error);
    throw error;
  }
} 