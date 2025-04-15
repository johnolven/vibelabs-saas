'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  summary?: string;
}

type ViewType = 'month' | 'week' | 'day';

export default function Calendar() {
  const router = useRouter();
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No autorizado');
        return;
      }

      const response = await fetch('/api/meetings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar las reuniones');
      }

      const data = await response.json();
      setMeetings(data.meetings);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar las reuniones');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para generar los días del mes actual
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Añadir días del mes anterior para completar la primera semana
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push({
        date: day,
        isCurrentMonth: false,
        meetings: getMeetingsForDate(day)
      });
    }
    
    // Añadir días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push({
        date: day,
        isCurrentMonth: true,
        meetings: getMeetingsForDate(day)
      });
    }
    
    // Añadir días del mes siguiente para completar la última semana
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      const day = new Date(year, month + 1, i);
      days.push({
        date: day,
        isCurrentMonth: false,
        meetings: getMeetingsForDate(day)
      });
    }
    
    return days;
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  // Función para obtener los días de la semana actual
  const getDaysInWeek = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push({
        date: day,
        meetings: getMeetingsForDate(day)
      });
    }

    return days;
  };

  // Función para obtener las horas del día
  const getHoursInDay = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const date = new Date(currentDate);
      date.setHours(i, 0, 0, 0);
      hours.push({
        date,
        meetings: meetings.filter(meeting => {
          const meetingDate = toLocalDate(meeting.date);
          return meetingDate.toDateString() === date.toDateString() && 
                 meetingDate.getHours() === i;
        })
      });
    }
    return hours;
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Función para formatear fecha ISO considerando zona horaria local
  const formatDateToLocalISO = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  // Función para convertir fecha ISO a local
  const toLocalDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
              <p className="text-gray-600">Gestiona tus eventos y reuniones</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['month', 'week', 'day'] as ViewType[]).map((viewType) => (
                  <motion.button
                    key={viewType}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView(viewType)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      view === viewType
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/dashboard/meetings/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Nueva Reunión
              </motion.button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700"
            >
              {error}
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (view === 'day') {
                    newDate.setDate(currentDate.getDate() - 1);
                  } else if (view === 'week') {
                    newDate.setDate(currentDate.getDate() - 7);
                  } else {
                    newDate.setMonth(currentDate.getMonth() - 1);
                  }
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <h2 className="text-xl font-semibold text-gray-900">
                {view === 'day' ? (
                  currentDate.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                ) : view === 'week' ? (
                  <>
                    {currentDate.toLocaleString('es-ES', { day: 'numeric' })} - {
                      new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })
                    }
                  </>
                ) : (
                  currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
                )}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (view === 'day') {
                    newDate.setDate(currentDate.getDate() + 1);
                  } else if (view === 'week') {
                    newDate.setDate(currentDate.getDate() + 7);
                  } else {
                    newDate.setMonth(currentDate.getMonth() + 1);
                  }
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              >
                Hoy
              </motion.button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {view === 'month' && (
              <>
                {/* Week days header */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="px-4 py-3 text-sm font-medium text-gray-700 text-center"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {getDaysInMonth().map((day, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      onClick={(e) => {
                        if (e.currentTarget === e.target || (e.target as HTMLElement).closest('.day-number')) {
                          const formattedDate = day.date.toISOString().slice(0, 16);
                          router.push(`/dashboard/meetings/new?date=${formattedDate}`);
                        }
                      }}
                      className={`min-h-[120px] bg-white p-2 transition-colors duration-200 ${
                        day.isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400 bg-gray-50'
                      } ${
                        day.date.toDateString() === new Date().toDateString()
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium day-number ${
                          day.date.toDateString() === new Date().toDateString()
                            ? 'text-blue-600'
                            : ''
                        }`}>
                          {day.date.getDate()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {day.meetings.map((meeting) => (
                          <Link 
                            key={meeting.id} 
                            href={`/dashboard/meetings/${meeting.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className="p-1 rounded-lg text-xs cursor-pointer"
                            >
                              <div className={`px-2 py-1 rounded-lg ${getStatusColor(meeting.status)}`}>
                                <div className="font-medium truncate">{meeting.title}</div>
                                <div className="text-xs">
                                  {new Date(meeting.date).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {view === 'week' && (
              <>
                {/* Week days header */}
                <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
                  <div className="px-4 py-3 text-sm font-medium text-gray-700 text-center">
                    Hora
                  </div>
                  {getDaysInWeek().map((day, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 text-sm font-medium text-gray-700 text-center"
                    >
                      <div>{weekDays[index]}</div>
                      <div className={`text-sm ${
                        day.date.toDateString() === new Date().toDateString()
                          ? 'text-blue-600 font-bold'
                          : ''
                      }`}>
                        {day.date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Week view grid */}
                <div className="relative">
                  {/* Horas */}
                  <div className="grid grid-cols-8 divide-x divide-gray-200">
                    {/* Columna de horas */}
                    <div className="divide-y divide-gray-200">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="h-20 p-2">
                          <div className="text-xs text-gray-500 text-right">
                            {`${i.toString().padStart(2, '0')}:00`}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Columnas de días */}
                    {getDaysInWeek().map((day, dayIndex) => (
                      <div 
                        key={dayIndex} 
                        className={`relative divide-y divide-gray-200 ${
                          day.date.toDateString() === new Date().toDateString()
                            ? 'bg-blue-50'
                            : 'bg-white'
                        }`}
                      >
                        {Array.from({ length: 24 }, (_, hour) => {
                          const hourDate = new Date(day.date);
                          hourDate.setHours(hour, 0, 0, 0);
                          
                          return (
                            <div 
                              key={hour}
                              className="h-20 relative"
                              onClick={(e) => {
                                if (e.currentTarget === e.target) {
                                  const formattedDate = formatDateToLocalISO(hourDate);
                                  router.push(`/dashboard/meetings/new?date=${formattedDate}`);
                                }
                              }}
                            >
                              {day.meetings
                                .filter(meeting => {
                                  const meetingDate = toLocalDate(meeting.date);
                                  return meetingDate.getHours() === hour;
                                })
                                .map((meeting) => {
                                  const meetingDate = toLocalDate(meeting.date);
                                  const endDate = new Date(meetingDate.getTime() + meeting.duration * 60000);
                                  
                                  return (
                                    <Link
                                      key={meeting.id}
                                      href={`/dashboard/meetings/${meeting.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute inset-x-0 z-10 mx-1"
                                      style={{
                                        top: `${(meetingDate.getMinutes() / 60) * 100}%`,
                                        height: `${(meeting.duration / 60) * 100}%`,
                                        minHeight: '20px',
                                        maxHeight: 'calc(100% - 4px)'
                                      }}
                                    >
                                      <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className="h-full"
                                      >
                                        <div className={`h-full px-2 py-1 rounded-lg ${getStatusColor(meeting.status)} overflow-hidden`}>
                                          <div className="font-medium text-xs truncate">
                                            {meeting.title}
                                          </div>
                                          <div className="text-xs">
                                            {meetingDate.toLocaleTimeString('es-ES', {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                            {' - '}
                                            {endDate.toLocaleTimeString('es-ES', {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </div>
                                        </div>
                                      </motion.div>
                                    </Link>
                                  );
                                })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {view === 'day' && (
              <>
                {/* Day header */}
                <div className="bg-gray-50 border-b border-gray-200 p-4 text-center">
                  <div className="text-lg font-medium text-gray-900">
                    {currentDate.toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>

                {/* Day view grid */}
                <div className="divide-y divide-gray-200">
                  {getHoursInDay().map((hour, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.01 }}
                      onClick={(e) => {
                        if (e.currentTarget === e.target || (e.target as HTMLElement).closest('.hour-row')) {
                          const date = new Date(currentDate);
                          date.setHours(hour.date.getHours(), 0, 0, 0);
                          const formattedDate = formatDateToLocalISO(date);
                          router.push(`/dashboard/meetings/new?date=${formattedDate}`);
                        }
                      }}
                      className={`p-4 bg-white flex items-start space-x-4 hour-row ${
                        hour.date.getHours() === new Date().getHours() &&
                        currentDate.toDateString() === new Date().toDateString()
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <div className="w-20 text-right text-sm text-gray-600">
                        {hour.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-1 min-h-[60px]">
                        {hour.meetings.map((meeting) => {
                          const meetingDate = toLocalDate(meeting.date);
                          const endDate = new Date(meetingDate.getTime() + meeting.duration * 60000);
                          
                          return (
                            <Link 
                              key={meeting.id} 
                              href={`/dashboard/meetings/${meeting.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="mb-2"
                              >
                                <div className={`px-3 py-2 rounded-lg ${getStatusColor(meeting.status)}`}>
                                  <div className="font-medium">{meeting.title}</div>
                                  <div className="text-xs">
                                    {meetingDate.toLocaleTimeString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                    {' - '}
                                    {endDate.toLocaleTimeString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 