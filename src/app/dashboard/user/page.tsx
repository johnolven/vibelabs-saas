'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  participants: number;
}

interface Notification {
  id: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
}

export default function UserDashboard() {
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Simular carga de datos
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simular petición a la API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Datos de ejemplo
        setUserName('María González');
        
        setTasks([
          { id: '1', title: 'Completar informe semanal', dueDate: '2023-06-25T17:00:00', status: 'pending', priority: 'high' },
          { id: '2', title: 'Revisar documentación', dueDate: '2023-06-24T14:00:00', status: 'in-progress', priority: 'medium' },
          { id: '3', title: 'Actualizar perfil', dueDate: '2023-06-30T23:59:59', status: 'pending', priority: 'low' },
          { id: '4', title: 'Preparar presentación', dueDate: '2023-06-28T10:00:00', status: 'pending', priority: 'high' },
        ]);
        
        setMeetings([
          { id: '1', title: 'Reunión de equipo', date: '2023-06-23', time: '10:00', duration: 60, participants: 5 },
          { id: '2', title: 'Revisión de proyecto', date: '2023-06-27', time: '15:30', duration: 45, participants: 3 },
        ]);
        
        setNotifications([
          { id: '1', message: 'Nueva tarea asignada: Completar informe semanal', date: '2023-06-22T09:15:00', read: false, type: 'info' },
          { id: '2', message: 'Reunión de equipo programada para mañana', date: '2023-06-22T11:30:00', read: false, type: 'info' },
          { id: '3', message: 'La tarea "Revisar correos" ha sido completada', date: '2023-06-21T16:45:00', read: true, type: 'success' },
          { id: '4', message: 'Actualización de sistema programada para este fin de semana', date: '2023-06-20T14:20:00', read: true, type: 'warning' },
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

  // Calcular si una fecha está próxima (menos de 2 días)
  const isDateSoon = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  };

  // Calcular si una fecha está vencida
  const isDateOverdue = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    return date < now;
  };

  // Renderizar badge de prioridad
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Alta</span>;
      case 'medium':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Media</span>;
      case 'low':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Baja</span>;
      default:
        return null;
    }
  };

  // Renderizar badge de estado
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Pendiente</span>;
      case 'in-progress':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">En Progreso</span>;
      case 'completed':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completado</span>;
      default:
        return null;
    }
  };

  // Marcar notificación como leída
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  return (
    <div className="container mx-auto">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Bienvenida */}
          <section>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-xl p-6 shadow-sm"
            >
              <h1 className="text-2xl font-bold mb-2">¡Hola, {userName}!</h1>
              <p className="text-muted-foreground">
                Bienvenido/a a tu panel de control. Tienes {tasks.filter(t => t.status !== 'completed').length} tareas pendientes 
                y {meetings.length} reuniones programadas.
              </p>
            </motion.div>
          </section>

          {/* Sección principal */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Tareas */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden col-span-2"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Tareas Pendientes</h2>
              </div>
              <div className="divide-y divide-border">
                {tasks.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No tienes tareas pendientes
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="p-4 hover:bg-muted/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium mb-1">{task.title}</h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`${
                              isDateOverdue(task.dueDate) ? 'text-red-600' : 
                              isDateSoon(task.dueDate) ? 'text-yellow-600' : 
                              'text-muted-foreground'
                            }`}>
                              {isDateOverdue(task.dueDate) ? '¡Vencida!' : 'Vence'}: {formatDate(task.dueDate)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {renderPriorityBadge(task.priority)}
                          {renderStatusBadge(task.status)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/5">
                <a href="/dashboard/tasks" className="text-primary hover:underline text-sm font-medium flex items-center">
                  Ver todas las tareas
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </motion.div>

            {/* Notificaciones */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Notificaciones</h2>
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No tienes notificaciones
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-4 hover:bg-muted/10 transition-colors ${!notification.read ? 'bg-muted/5' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.type === 'info' ? 'bg-blue-500' :
                          notification.type === 'warning' ? 'bg-yellow-500' :
                          'bg-green-500'
                        } ${notification.read ? 'opacity-30' : ''}`}></div>
                        <div className="flex-1">
                          <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-muted-foreground'}`}>
                            {notification.message}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.date).toLocaleDateString('es', { 
                              day: 'numeric', 
                              month: 'short', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Reuniones */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden col-span-2 lg:col-span-2"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Próximas Reuniones</h2>
              </div>
              <div className="p-4 grid gap-4 md:grid-cols-2">
                {meetings.length === 0 ? (
                  <div className="col-span-2 p-6 text-center text-muted-foreground">
                    No tienes reuniones programadas
                  </div>
                ) : (
                  meetings.map(meeting => (
                    <div key={meeting.id} className="p-4 bg-muted/5 rounded-lg hover:bg-muted/10 transition-colors">
                      <h3 className="font-medium mb-2">{meeting.title}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {meeting.date}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {meeting.time} ({meeting.duration} min)
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {meeting.participants} participantes
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/5">
                <Link href="/dashboard/meetings" className="text-primary hover:underline text-sm font-medium flex items-center">
                  Ver todas las reuniones
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </motion.div>

            {/* Enlaces rápidos */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-card rounded-xl shadow-sm overflow-hidden"
            >
              <div className="border-b border-border p-4">
                <h2 className="text-xl font-semibold">Enlaces Rápidos</h2>
              </div>
              <div className="p-6 grid gap-3">
                <Link 
                  href="/dashboard/settings/profile" 
                  className="flex items-center p-3 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Mi Perfil</h3>
                    <p className="text-xs text-muted-foreground">Gestiona tu información</p>
                  </div>
                </Link>

                <Link 
                  href="/dashboard/calendar" 
                  className="flex items-center p-3 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Calendario</h3>
                    <p className="text-xs text-muted-foreground">Eventos y reuniones</p>
                  </div>
                </Link>

                <Link 
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
                    <p className="text-xs text-muted-foreground">Guías y recursos</p>
                  </div>
                </Link>

                <Link 
                  href="/dashboard/support" 
                  className="flex items-center p-3 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Soporte</h3>
                    <p className="text-xs text-muted-foreground">Obtén ayuda</p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
} 