'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function UserStatisticsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = params.userId as string;
  
  usePageTracking({ section: 'statistics', metadata: { userId } });
  
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || ''
  });

  const loadUserDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }

      const response = await fetch(`/api/statistics/user/${userId}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar detalles del usuario');
      }

      const data = await response.json();
      setUserDetails(data);
    } catch (err) {
      console.error('Error al cargar detalles del usuario:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserDetails();
    }
  }, [userId, dateRange]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSectionLabel = (section: string) => {
    const labels: Record<string, string> = {
      'dashboard': 'Dashboard',
      'cap-table': 'Cap Table',
      'documents': 'Data Room',
      'updates': 'Monthly Updates',
      'metrics': 'Métricas',
      'users': 'Usuarios',
      'roles': 'Roles',
      'profile': 'Perfil',
      'statistics': 'Estadísticas'
    };
    return labels[section] || section;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !userDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card rounded-lg shadow-xl p-8 max-w-md w-full border border-border text-center">
          <svg className="w-16 h-16 text-destructive mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error || 'Usuario no encontrado'}</p>
          <Link
            href="/dashboard/admin/statistics"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Volver a Estadísticas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/admin/statistics"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Estadísticas
          </Link>
          <h1 className="text-3xl font-bold mb-2">Detalles de Usuario</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>{userDetails.user.name}</span>
            <span>•</span>
            <span>{userDetails.user.email}</span>
            <span>•</span>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
              {userDetails.user.role}
            </span>
          </div>
        </div>

        {/* Date Range Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg shadow-lg border border-border p-4 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full p-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Fecha Fin</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full p-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </motion.div>

        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
        >
          <div className="bg-card rounded-lg shadow-lg border border-border p-6">
            <div className="text-sm text-muted-foreground mb-1">Total Vistas</div>
            <div className="text-3xl font-bold">{userDetails.overview.totalViews}</div>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-6">
            <div className="text-sm text-muted-foreground mb-1">Tiempo Total</div>
            <div className="text-3xl font-bold">{formatDuration(userDetails.overview.totalDuration)}</div>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-6">
            <div className="text-sm text-muted-foreground mb-1">Tiempo Promedio</div>
            <div className="text-3xl font-bold">{formatDuration(userDetails.overview.averageDuration)}</div>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-6">
            <div className="text-sm text-muted-foreground mb-1">Secciones</div>
            <div className="text-3xl font-bold">{userDetails.overview.uniqueSections}</div>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-6">
            <div className="text-sm text-muted-foreground mb-1">Documentos</div>
            <div className="text-3xl font-bold">{userDetails.overview.uniqueDocuments}</div>
          </div>
        </motion.div>

        {/* Section Stats */}
        {userDetails.sectionStats && userDetails.sectionStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Estadísticas por Sección</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Sección</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Vistas</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Total</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {userDetails.sectionStats.map((stat: any, index: number) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4 font-medium">{getSectionLabel(stat.section)}</td>
                      <td className="py-3 px-4">{stat.totalViews}</td>
                      <td className="py-3 px-4">{formatDuration(stat.totalDuration)}</td>
                      <td className="py-3 px-4">{formatDuration(stat.averageDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Data Room Statistics */}
        {userDetails.dataRoomStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Estadísticas de Data Room</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Documentos Vistos</div>
                <div className="text-2xl font-bold">{userDetails.dataRoomStats.totalDocumentsViewed}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Vistas</div>
                <div className="text-2xl font-bold">{userDetails.dataRoomStats.totalDocumentViews}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Documentos Descargados</div>
                <div className="text-2xl font-bold">{userDetails.dataRoomStats.totalDownloads}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Descargas</div>
                <div className="text-2xl font-bold">
                  {userDetails.dataRoomStats.documentsDownloaded.reduce((sum: number, doc: any) => sum + (doc.downloadCount || 0), 0)}
                </div>
              </div>
            </div>

            {/* Documents Viewed */}
            {userDetails.dataRoomStats.documentsViewed && userDetails.dataRoomStats.documentsViewed.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Documentos Vistos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Documento</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Carpeta</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Vistas</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Total</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Promedio</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Última Vista</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.dataRoomStats.documentsViewed.map((doc: any, index: number) => (
                        <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium">{doc.documentName || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                              {doc.documentFolder || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">{doc.viewCount}</td>
                          <td className="py-3 px-4">{formatDuration(doc.totalDuration)}</td>
                          <td className="py-3 px-4">{formatDuration(doc.averageDuration)}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {doc.lastViewed ? formatDate(doc.lastViewed) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Documents Downloaded */}
            {userDetails.dataRoomStats.documentsDownloaded && userDetails.dataRoomStats.documentsDownloaded.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Documentos Descargados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Documento</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Carpeta</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Descargas</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Última Descarga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.dataRoomStats.documentsDownloaded.map((doc: any, index: number) => (
                        <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium">{doc.documentName || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                              {doc.documentFolder || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">{doc.downloadCount || 0}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {doc.lastDownloadedAt ? formatDate(doc.lastDownloadedAt) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Document Stats */}
        {userDetails.documentStats && userDetails.documentStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Documentos Vistos (Desde PageView)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Documento</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Carpeta</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Vistas</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Total</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Promedio</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Última Vista</th>
                  </tr>
                </thead>
                <tbody>
                  {userDetails.documentStats.map((stat: any, index: number) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4 font-medium">{stat.documentName || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {stat.documentFolder || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{stat.totalViews}</td>
                      <td className="py-3 px-4">{formatDuration(stat.totalDuration)}</td>
                      <td className="py-3 px-4">{formatDuration(stat.averageDuration)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(stat.lastViewed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Route Summary */}
        {userDetails.pathStats && userDetails.pathStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Resumen de Rutas Más Visitadas</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Frecuencia de visita de cada ruta, ordenadas de mayor a menor
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Ruta</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Frecuencia</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Total</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Promedio</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  {userDetails.pathStats.map((stat: any, index: number) => {
                    const totalViews = userDetails.overview.totalViews;
                    const percentage = totalViews > 0 ? ((stat.totalViews / totalViews) * 100).toFixed(1) : '0';
                    return (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="font-mono text-sm">{stat.path}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{stat.totalViews}</span>
                            <span className="text-xs text-muted-foreground">veces</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{formatDuration(stat.totalDuration)}</td>
                        <td className="py-3 px-4">{formatDuration(stat.averageDuration)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Activity History */}
        {userDetails.activityHistory && userDetails.activityHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Historial Completo de Actividad</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Fecha/Hora</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Ruta</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Sección</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Documento</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {userDetails.activityHistory.map((activity: any, index: number) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(activity.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{activity.path}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-muted rounded text-xs">
                          {getSectionLabel(activity.section)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {activity.documentName ? (
                          <div>
                            <div className="font-medium text-sm">{activity.documentName}</div>
                            {activity.documentFolder && (
                              <div className="text-xs text-muted-foreground">{activity.documentFolder}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {activity.isActive ? (
                          <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-sm">
                            En curso
                          </span>
                        ) : activity.isAbandoned ? (
                          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-sm" title="Sesión abandonada (sin finalizar correctamente)">
                            {formatDuration(activity.duration || 0)}*
                          </span>
                        ) : activity.duration && activity.duration > 0 ? (
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                            {formatDuration(activity.duration)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {(!userDetails.sectionStats || userDetails.sectionStats.length === 0) && 
         (!userDetails.documentStats || userDetails.documentStats.length === 0) && 
         (!userDetails.activityHistory || userDetails.activityHistory.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg shadow-lg border border-border p-12 text-center"
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-muted-foreground">No hay actividad registrada para este usuario en el período seleccionado</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

