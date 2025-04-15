'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncSubscriptionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Extraer IDs de la URL si están presentes (para auto-rellenar)
  useEffect(() => {
    const url = new URL(window.location.href);
    const subId = url.searchParams.get('subscription_id');
    const custId = url.searchParams.get('customer_id');
    
    if (subId) setSubscriptionId(subId);
    if (custId) setCustomerId(custId);
  }, []);

  const handleSync = async () => {
    if (!subscriptionId && !customerId) {
      setError('Por favor, ingresa al menos un ID de suscripción o ID de cliente');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');
    setIsSuccess(false);

    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log('Token obtenido:', token.substring(0, 10) + '...');
      
      // También verificar que tenemos un usuario en localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        console.warn('No se encontró información del usuario en localStorage');
      } else {
        const user = JSON.parse(userStr);
        console.log('Usuario en localStorage:', user.email || user);
      }

      // Llamar a la API para sincronizar
      const response = await fetch('/api/stripe/sync-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: subscriptionId || undefined,
          customerId: customerId || undefined
        })
      });

      console.log('Respuesta de API status:', response.status);
      const data = await response.json();
      console.log('Respuesta de API:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Error al sincronizar suscripción');
      }

      setMessage('¡Suscripción sincronizada correctamente!');
      setIsSuccess(true);
      
      // Redirigir a la página de facturación después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard/settings/billing');
      }, 2000);
    } catch (error) {
      console.error('Error completo:', error);
      setError(error instanceof Error ? error.message : 'Error al sincronizar suscripción');
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener datos desde el log de errores de webhook
  const parseFromLogs = () => {
    try {
      const logText = prompt('Pega el log de error del webhook de Stripe:');
      if (!logText) return;

      // Buscar ID de cliente (cus_)
      const customerMatch = logText.match(/cus_[A-Za-z0-9]+/);
      if (customerMatch) {
        setCustomerId(customerMatch[0]);
      }

      // Buscar ID de suscripción (sub_)
      const subscriptionMatch = logText.match(/sub_[A-Za-z0-9]+/);
      if (subscriptionMatch) {
        setSubscriptionId(subscriptionMatch[0]);
      }
    } catch (error) {
      console.error('Error al analizar logs:', error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sincronizar Suscripción</h1>
        <p className="text-muted-foreground mt-2">
          Usa esta herramienta para sincronizar manualmente tu suscripción de Stripe con la base de datos.
        </p>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {message && (
        <div className={`bg-${isSuccess ? 'green' : 'blue'}-100 border border-${isSuccess ? 'green' : 'blue'}-400 text-${isSuccess ? 'green' : 'blue'}-700 px-4 py-3 rounded relative mb-6`}>
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
        <div className="space-y-4">
          <div>
            <label htmlFor="customerId" className="block text-sm font-medium mb-1">
              ID de Cliente de Stripe
            </label>
            <input
              id="customerId"
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="cus_xxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ejemplo: cus_S4XjBlsNBloDbg
            </p>
          </div>

          <div>
            <label htmlFor="subscriptionId" className="block text-sm font-medium mb-1">
              ID de Suscripción de Stripe
            </label>
            <input
              id="subscriptionId"
              type="text"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              placeholder="sub_xxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ejemplo: sub_1RAOdbB2rynSrTQdEagHly7p
            </p>
          </div>

          <div className="flex space-x-4 pt-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={isLoading || (!subscriptionId && !customerId)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isLoading ? 'Sincronizando...' : 'Sincronizar Suscripción'}
            </button>
            
            <button
              type="button"
              onClick={parseFromLogs}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Extraer IDs de Logs
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">¿Cómo encontrar estos IDs?</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Busca en los logs del servidor mensajes como: <code className="bg-gray-100 px-1 py-0.5 rounded">Usuario no encontrado para el customer_id: cus_XXXX</code></li>
          <li>O inicia sesión en tu <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">panel de Stripe</a> y busca tu suscripción.</li>
          <li>También puedes buscar en los correos electrónicos de confirmación de pago de Stripe.</li>
        </ol>
      </div>
    </div>
  );
} 