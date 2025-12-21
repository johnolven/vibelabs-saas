'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePageTracking } from '@/hooks/usePageTracking';

interface SectionStat {
  section: string;
  totalViews: number;
  totalDuration: number;
  uniqueVisitors: number;
}

interface DocumentStat {
  documentId: string;
  documentName: string;
  documentFolder: string;
  totalViews: number;
  totalDuration: number;
  uniqueVisitors: number;
}

interface PathStat {
  path: string;
  totalViews: number;
  totalDuration: number;
  uniqueVisitors: number;
}

interface UserActivity {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  totalViews: number;
  totalDuration: number;
  sections: string[];
  lastActivity: string;
}

interface Overview {
  totalViews: number;
  totalDuration: number;
  totalUniqueVisitors: number;
  averageDuration: number;
}

export default function StatisticsPage() {
  usePageTracking({ section: 'statistics' });
  const router = useRouter();
  
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStat[]>([]);
  const [pathStats, setPathStats] = useState<PathStat[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const loadStatistics = async () => {
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

      const response = await fetch(`/api/statistics/overview?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const data = await response.json();
      setOverview(data.overview);
      setSectionStats(data.sectionStats || []);
      setDocumentStats(data.documentStats || []);
      setPathStats(data.pathStats || []);
      setUserActivity(data.userActivity || []);
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card rounded-lg shadow-xl p-8 max-w-md w-full border border-border text-center">
          <svg className="w-16 h-16 text-destructive mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Estadísticas Generales</h1>
          <p className="text-muted-foreground">Análisis completo de actividad y uso de la plataforma</p>
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
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
          >
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <div className="text-sm text-muted-foreground mb-1">Total de Vistas</div>
              <div className="text-3xl font-bold">{overview.totalViews.toLocaleString()}</div>
            </div>
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <div className="text-sm text-muted-foreground mb-1">Visitantes Únicos</div>
              <div className="text-3xl font-bold">{overview.totalUniqueVisitors.toLocaleString()}</div>
            </div>
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <div className="text-sm text-muted-foreground mb-1">Tiempo Total</div>
              <div className="text-3xl font-bold">{formatDuration(overview.totalDuration)}</div>
            </div>
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <div className="text-sm text-muted-foreground mb-1">Tiempo Promedio</div>
              <div className="text-3xl font-bold">{formatDuration(overview.averageDuration)}</div>
            </div>
          </motion.div>
        )}

        {/* Section Statistics */}
        {sectionStats.length > 0 && (
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
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Visitantes Únicos</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionStats.map((stat, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4 font-medium">{getSectionLabel(stat.section)}</td>
                      <td className="py-3 px-4">{stat.totalViews.toLocaleString()}</td>
                      <td className="py-3 px-4">{stat.uniqueVisitors}</td>
                      <td className="py-3 px-4">{formatDuration(stat.totalDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Document Statistics */}
        {documentStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Documentos Más Vistos</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Documento</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Carpeta</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Vistas</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Visitantes Únicos</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {documentStats.map((stat, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4 font-medium">{stat.documentName || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {stat.documentFolder}
                        </span>
                      </td>
                      <td className="py-3 px-4">{stat.totalViews.toLocaleString()}</td>
                      <td className="py-3 px-4">{stat.uniqueVisitors}</td>
                      <td className="py-3 px-4">{formatDuration(stat.totalDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Path Statistics */}
        {pathStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Rutas Más Visitadas</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Ruta</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Vistas</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Visitantes Únicos</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pathStats.map((stat, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono text-sm">{stat.path}</td>
                      <td className="py-3 px-4">{stat.totalViews.toLocaleString()}</td>
                      <td className="py-3 px-4">{stat.uniqueVisitors}</td>
                      <td className="py-3 px-4">{formatDuration(stat.totalDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* User Activity */}
        {userActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Actividad de Usuarios</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Usuario</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Rol</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Vistas</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tiempo Total</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Secciones</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Última Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {userActivity.map((user, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-border/50 hover:bg-muted/20 cursor-pointer"
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (dateRange.startDate) {
                          params.append('startDate', dateRange.startDate);
                        }
                        if (dateRange.endDate) {
                          params.append('endDate', dateRange.endDate);
                        }
                        router.push(`/dashboard/admin/statistics/user/${user.userId}?${params.toString()}`);
                      }}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{user.userName || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {user.userRole}
                        </span>
                      </td>
                      <td className="py-3 px-4">{user.totalViews.toLocaleString()}</td>
                      <td className="py-3 px-4">{formatDuration(user.totalDuration)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.sections.map((section, i) => (
                            <span key={i} className="px-2 py-1 bg-muted rounded text-xs">
                              {getSectionLabel(section)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(user.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

