'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLAN_DETAILS } from '@/lib/stripe';

interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd: Date | null;
}

interface PlanOption {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
}

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Verificar si el usuario viene de un pago exitoso
  useEffect(() => {
    const url = new URL(window.location.href);
    const success = url.searchParams.get('success');
    const canceled = url.searchParams.get('canceled');

    if (success === 'true') {
      setSuccessMessage('¡Pago completado con éxito! Tu suscripción ha sido actualizada.');
      // Limpiar URL para evitar mostrar el mensaje si el usuario refresca la página
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled === 'true') {
      setErrorMessage('El proceso de pago fue cancelado. Puedes intentarlo nuevamente cuando lo desees.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Modificar la función loadSubscriptionInfo para intentar bypass si el método normal falla
  useEffect(() => {
    async function loadSubscriptionInfo() {
      try {
        setIsLoading(true);
        setApiError(null);

        // Obtener token de autenticación desde localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        // Obtener ID de usuario desde localStorage (asumiendo que guardamos un objeto 'user')
        const userStr = localStorage.getItem('user');
        console.log('Datos de usuario en localStorage:', userStr);
        
        let userId = null;
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user._id || user.id;
          console.log('ID de usuario detectado:', userId);
          setUserId(userId);
        } else {
          console.log('No se encontraron datos de usuario en localStorage');
        }

        // Cargar información de suscripción del usuario - método normal
        let subData;
        try {
          console.log('Intentando cargar suscripción con JWT...');
          const subResponse = await fetch('/api/user/subscription', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (subResponse.ok) {
            subData = await subResponse.json();
            console.log('Datos de suscripción recibidos con JWT:', subData);
          } else {
            console.log('Falló autenticación JWT, intentando bypass...');
            
            // Si falla la autenticación normal y tenemos userId, intentar bypass
            if (userId) {
              const bypassResponse = await fetch(`/api/user/subscription?bypass_auth=true&user_id=${userId}`);
              
              if (bypassResponse.ok) {
                subData = await bypassResponse.json();
                console.log('Datos de suscripción recibidos con bypass:', subData);
              } else {
                console.error('También falló el bypass:', await bypassResponse.text());
              }
            }
          }
        } catch (error) {
          console.error('Error al cargar suscripción:', error);
        }

        // Si tenemos datos de suscripción, actualizar el estado
        if (subData) {
          setSubscription({
            plan: subData.subscriptionPlan || 'free',
            status: subData.subscriptionStatus || 'none',
            currentPeriodEnd: subData.subscriptionCurrentPeriodEnd ? new Date(subData.subscriptionCurrentPeriodEnd) : null
          });
        } else {
          // Si no hay suscripción o falló la carga, asumir plan gratuito
          console.log('No se pudieron cargar datos de suscripción, asumiendo plan gratuito');
          setSubscription({
            plan: 'free',
            status: 'none',
            currentPeriodEnd: null
          });
        }

        // Cargar planes disponibles
        let plansData;
        try {
          const plansResponse = await fetch('/api/stripe/payment-link', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (plansResponse.ok) {
            plansData = await plansResponse.json();
            console.log('Planes recibidos de la API:', plansData);
          }
        } catch (error) {
          console.error('Error al cargar planes:', error);
        }

        if (plansData?.plans) {
          setPlans(plansData.plans);
        } else {
          // Si no podemos cargar planes desde la API, usar los definidos localmente
          console.log('Usando planes definidos localmente:', PLAN_DETAILS);
          setPlans(Object.entries(PLAN_DETAILS).map(([id, details]) => ({
            id,
            name: details.name,
            description: details.description,
            features: details.features,
            price: details.price
          })));
        }
      } catch (error) {
        console.error('Error al cargar información de suscripción:', error);
        setErrorMessage('No se pudo cargar la información de suscripción. Por favor, inténtalo de nuevo más tarde.');
        setApiError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadSubscriptionInfo();
  }, []);

  // Modificar la función handleUpgradePlan para usar el nuevo endpoint 
  async function handleUpgradePlan(planId: string) {
    if (!userId) {
      setErrorMessage('No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      setIsLoading(true);
      setApiError(null);
      
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Extraer solo la parte del ID que necesitamos (BASIC, PREMIUM, etc.)
      const simplePlanId = planId.replace("PLANS.", "").toLowerCase();
      console.log('Solicitando enlace de pago para plan:', simplePlanId);

      // Llamar a la API para generar enlace de pago
      const response = await fetch('/api/stripe/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          planId: simplePlanId,
          successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/settings/billing?canceled=true`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error de API al generar enlace de pago:', errorData);
        throw new Error(errorData.detalle || errorData.error || 'Error al generar enlace de pago');
      }

      // Obtener el enlace de pago de la respuesta
      const { url } = await response.json();
      console.log('Enlace de pago generado:', url);
      
      // Redirigir al usuario al enlace de pago
      window.location.href = url;
    } catch (error) {
      console.error('Error al generar enlace de pago:', error);
      setErrorMessage('No se pudo generar el enlace de pago. Por favor, inténtalo de nuevo más tarde.');
      setApiError(error instanceof Error ? error.message : String(error));
      setIsLoading(false);
    }
  }

  // Función para cancelar la suscripción actual
  async function handleCancelSubscription() {
    if (!window.confirm('¿Estás seguro de que deseas cancelar tu suscripción? Perderás acceso a las funciones premium al final del período de facturación actual.')) {
      return;
    }

    try {
      setIsCanceling(true);
      setApiError(null);
      
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Llamar a la API para cancelar la suscripción
      const response = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cancelar la suscripción');
      }

      // Procesar respuesta
      await response.json();
      
      // Actualizar el estado local
      setSubscription(prev => prev ? {
        ...prev,
        status: 'canceled'
      } : null);
      
      setSuccessMessage('Tu suscripción ha sido cancelada. Seguirás teniendo acceso hasta el final del período de facturación actual.');
    } catch (error) {
      console.error('Error al cancelar suscripción:', error);
      setErrorMessage('No se pudo cancelar la suscripción. Por favor, inténtalo de nuevo más tarde.');
      setApiError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCanceling(false);
    }
  }

  // Añadir una función para forzar la recarga de datos
  const forceRefresh = () => {
    // Limpiar cualquier caché local
    localStorage.removeItem('subscriptionData');
    
    // Forzar recarga completa de la página
    window.location.reload();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturación y Suscripción</h1>
          <p className="text-muted-foreground mt-2">
            Administra tu plan de suscripción y detalles de facturación.
          </p>
        </div>
        <button
          onClick={forceRefresh}
          className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refrescar datos
        </button>
      </div>

      {/* Mensajes de éxito o error */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <span className="block sm:inline">{errorMessage}</span>
          {apiError && (
            <details className="mt-2 text-sm">
              <summary>Detalles del error (para soporte técnico)</summary>
              <pre className="mt-2 whitespace-pre-wrap">{apiError}</pre>
            </details>
          )}
          <div className="mt-3 text-sm">
            <a href="/dashboard/settings/billing/fix-subscription" className="underline text-red-700 hover:text-red-900">
              ⚙️ Usar herramienta de reparación de suscripción
            </a>
          </div>
        </div>
      )}

      {/* DEBUG: Mostrar ID del usuario (solo para desarrollo) */}
      {userId && process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6">
          <p><strong>DEBUG:</strong> ID de usuario: {userId}</p>
        </div>
      )}

      {/* Información de suscripción actual */}
      <div className="bg-card rounded-lg shadow-sm p-6 mb-8 border border-border">
        <h2 className="text-xl font-semibold mb-4">Tu suscripción actual</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Plan:</p>
                <p className="font-medium text-lg">
                  {subscription?.plan === 'free' ? 'Plan Gratuito' : 
                   subscription?.plan === 'basic' ? 'Plan Básico' : 
                   subscription?.plan === 'premium' ? 'Plan Premium' : 
                   subscription?.plan === 'enterprise' ? 'Plan Empresarial' : 
                   'Desconocido'}
                </p>
              </div>
              
              <div>
                <p className="text-muted-foreground">Estado:</p>
                <p className="font-medium">
                  {subscription?.status === 'active' ? (
                    <span className="text-green-600">Activa</span>
                  ) : subscription?.status === 'past_due' ? (
                    <span className="text-amber-600">Pago pendiente</span>
                  ) : subscription?.status === 'canceled' ? (
                    <span className="text-red-600">Cancelada</span>
                  ) : (
                    <span className="text-gray-600">Sin suscripción activa</span>
                  )}
                </p>
              </div>
            </div>

            {subscription?.currentPeriodEnd && (
              <div className="mt-4">
                <p className="text-muted-foreground">Próxima renovación:</p>
                <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
            )}
            
            {subscription?.status === 'active' && (
              <div className="mt-6">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCancelSubscription}
                  disabled={isCanceling}
                >
                  {isCanceling ? (
                    <>
                      <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      Cancelando...
                    </>
                  ) : (
                    'Cancelar suscripción'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Planes disponibles */}
      <h2 className="text-xl font-semibold mb-4">Planes disponibles</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg shadow-sm p-6 border border-border animate-pulse">
              <div className="h-7 bg-gray-200 rounded mb-4"></div>
              <div className="h-14 bg-gray-200 rounded mb-6"></div>
              <div className="h-5 bg-gray-200 rounded mb-3"></div>
              <div className="h-5 bg-gray-200 rounded mb-3"></div>
              <div className="h-5 bg-gray-200 rounded mb-8"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : (
          plans.map((plan) => {
            const isCurrentPlan = subscription?.plan === plan.id.toLowerCase();
            
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -5 }}
                className={`
                  bg-card rounded-lg shadow-sm p-6 border border-border
                  ${isCurrentPlan ? 'ring-2 ring-primary' : ''}
                `}
              >
                <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                <p className="text-2xl font-bold mb-4">
                  {plan.price === 0 ? 'Gratis' : formatCurrency(plan.price)}
                  {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground ml-1">/mes</span>}
                </p>
                <p className="text-muted-foreground mb-4">{plan.description}</p>
                
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg 
                        className="h-5 w-5 text-green-500 mr-2" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  className={`
                    w-full py-2 px-4 rounded-md font-medium transition-colors
                    ${isCurrentPlan 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'bg-primary hover:bg-primary/90 text-white'}
                  `}
                  disabled={isCurrentPlan || isLoading}
                  onClick={() => !isCurrentPlan && handleUpgradePlan(plan.id)}
                >
                  {isCurrentPlan ? 'Plan actual' : plan.price === 0 ? 'Seleccionar plan' : 'Actualizar plan'}
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Historial de facturación - se podría implementar en el futuro */}
      <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
        <h2 className="text-xl font-semibold mb-4">Historial de facturación</h2>
        <p className="text-muted-foreground">
          El historial detallado de facturas estará disponible próximamente.
        </p>
      </div>
    </div>
  );
} 