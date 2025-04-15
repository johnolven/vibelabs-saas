'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'pending' | 'canceled';
  startDate: string;
  endDate: string;
  price: number;
  features: string[];
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

interface Usage {
  type: string;
  current: number;
  limit: number;
  percentage: number;
}

interface Support {
  id: string;
  subject: string;
  date: string;
  status: 'open' | 'in-progress' | 'resolved';
}

export default function ClientDashboard() {
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usageStats, setUsageStats] = useState<Usage[]>([]);
  const [supportTickets, setSupportTickets] = useState<Support[]>([]);

  // Simular carga de datos
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simular petición a la API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Datos de ejemplo
        setClientName('Carlos Rodríguez');
        setCompanyName('TechSolutions SA');
        
        setSubscription({
          id: 'sub_12345',
          plan: 'Plan Empresarial',
          status: 'active',
          startDate: '2023-01-15',
          endDate: '2024-01-15',
          price: 99.99,
          features: [
            'Acceso ilimitado',
            '100 usuarios',
            'Soporte prioritario',
            'Copias de seguridad diarias',
            'API personalizada'
          ]
        });
        
        setInvoices([
          { id: 'inv_1', number: 'INV-2023-001', date: '2023-01-15', amount: 99.99, status: 'paid' },
          { id: 'inv_2', number: 'INV-2023-002', date: '2023-02-15', amount: 99.99, status: 'paid' },
          { id: 'inv_3', number: 'INV-2023-003', date: '2023-03-15', amount: 99.99, status: 'paid' },
          { id: 'inv_4', number: 'INV-2023-004', date: '2023-04-15', amount: 99.99, status: 'paid' },
          { id: 'inv_5', number: 'INV-2023-005', date: '2023-05-15', amount: 99.99, status: 'paid' },
          { id: 'inv_6', number: 'INV-2023-006', date: '2023-06-15', amount: 99.99, status: 'pending' },
        ]);
        
        setUsageStats([
          { type: 'Almacenamiento', current: 75, limit: 100, percentage: 75 },
          { type: 'Usuarios Activos', current: 42, limit: 100, percentage: 42 },
          { type: 'Proyectos', current: 8, limit: 10, percentage: 80 },
          { type: 'Ancho de Banda', current: 120, limit: 500, percentage: 24 },
        ]);
        
        setSupportTickets([
          { id: 'tck_1', subject: 'Problema con la integración API', date: '2023-06-18', status: 'in-progress' },
          { id: 'tck_2', subject: 'Solicitud de nueva función', date: '2023-06-10', status: 'open' },
          { id: 'tck_3', subject: 'Error en el panel de reportes', date: '2023-05-28', status: 'resolved' },
        ]);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Formatear fechas
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Formatear importes
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Renderizar badge de estado para invoices
  const renderInvoiceStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pagada</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pendiente</span>;
      case 'overdue':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Vencida</span>;
      default:
        return null;
    }
  };

  // Renderizar badge de estado para tickets
  const renderTicketStatus = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Abierto</span>;
      case 'in-progress':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">En Progreso</span>;
      case 'resolved':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Resuelto</span>;
      default:
        return null;
    }
  };

  // Renderizar indicador de uso
  const renderUsageBar = (usage: Usage) => {
    let barColor = 'bg-blue-500';
    
    if (usage.percentage > 90) {
      barColor = 'bg-red-500';
    } else if (usage.percentage > 75) {
      barColor = 'bg-yellow-500';
    } else if (usage.percentage > 50) {
      barColor = 'bg-green-500';
    }
    
    return (
      <div className="mt-1">
        <div className="flex justify-between text-xs mb-1">
          <span>{usage.current} de {usage.limit}</span>
          <span>{usage.percentage}%</span>
        </div>
        <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
          <div 
            className={`h-full ${barColor}`} 
            style={{ width: `${usage.percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Encabezado */}
          <section>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 rounded-xl p-6 shadow-sm"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Panel de Cliente</h1>
                  <div className="text-muted-foreground">
                    <p>{clientName}</p>
                    <p className="font-medium">{companyName}</p>
                  </div>
                </div>
                {subscription && (
                  <div className="bg-card/50 backdrop-blur-sm p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{subscription.plan}</h3>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Activo
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Renovación: {formatDate(subscription.endDate)}
                    </p>
                    <p className="font-medium">{formatCurrency(subscription.price)}/mes</p>
                  </div>
                )}
              </div>
            </motion.div>
          </section>

          {/* Sección principal */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Estadísticas de uso */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Uso del Servicio</h2>
              </div>
              <div className="p-4 space-y-4">
                {usageStats.map((stat) => (
                  <div key={stat.type} className="mb-3">
                    <h3 className="text-sm font-medium">{stat.type}</h3>
                    {renderUsageBar(stat)}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Características del plan */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Características del Plan</h2>
              </div>
              <div className="p-4">
                {subscription && (
                  <ul className="space-y-2">
                    {subscription.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/5">
                <a href="/dashboard/settings/billing" className="text-primary hover:underline text-sm font-medium flex items-center">
                  Gestionar suscripción
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </motion.div>

            {/* Tickets de soporte */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Soporte Técnico</h2>
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {supportTickets.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No hay tickets de soporte
                  </div>
                ) : (
                  supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 hover:bg-muted/10 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{ticket.subject}</h3>
                        {renderTicketStatus(ticket.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Creado el {formatDate(ticket.date)}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/5">
                <a href="/dashboard/support" className="text-primary hover:underline text-sm font-medium flex items-center">
                  Crear ticket
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </motion.div>

            {/* Facturas */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden col-span-2"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Facturas Recientes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/5 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Número</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Importe</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                          No hay facturas disponibles
                        </td>
                      </tr>
                    ) : (
                      invoices.slice(0, 5).map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-muted/5">
                          <td className="px-4 py-3">
                            {invoice.number}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(invoice.date)}
                          </td>
                          <td className="px-4 py-3">
                            {formatCurrency(invoice.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {renderInvoiceStatus(invoice.status)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="text-primary hover:underline text-sm">
                              Descargar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border bg-muted/5">
                <a href="/dashboard/payments/invoices" className="text-primary hover:underline text-sm font-medium flex items-center">
                  Ver todas las facturas
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </motion.div>

            {/* Enlaces rápidos */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Enlaces Rápidos</h2>
              </div>
              <div className="p-4 grid gap-3">
                <a 
                  href="/dashboard/analytics" 
                  className="flex items-center p-3 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Analytics</h3>
                    <p className="text-xs text-muted-foreground">Ver estadísticas de uso</p>
                  </div>
                </a>

                <a 
                  href="/dashboard/settings/profile" 
                  className="flex items-center p-3 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Perfil</h3>
                    <p className="text-xs text-muted-foreground">Gestiona tu cuenta</p>
                  </div>
                </a>

                <a 
                  href="/dashboard/settings/billing" 
                  className="flex items-center p-3 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Facturación</h3>
                    <p className="text-xs text-muted-foreground">Gestiona tu suscripción</p>
                  </div>
                </a>

                <a 
                  href="/dashboard/docs" 
                  className="flex items-center p-3 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Documentación</h3>
                    <p className="text-xs text-muted-foreground">Manuales y recursos</p>
                  </div>
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
} 