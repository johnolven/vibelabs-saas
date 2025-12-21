'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface View {
  userId?: string;
  email?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  userName?: string;
  userEmail?: string;
}

interface ShareLink {
  linkId: string;
  isPublic: boolean;
  allowDownload: boolean;
  createdAt: string;
  viewCount: number;
  views: View[];
}

interface DocumentStats {
  viewCount: number;
  downloadCount: number;
  views: View[];
}

export default function DocumentStatsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<any>(null);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Cargar documento desde la lista de documentos
        const docsResponse = await fetch(`/api/documents?period=all`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          const foundDoc = docsData.documents?.find((doc: any) => doc._id === documentId);
          if (foundDoc) {
            setDocument(foundDoc);
          } else {
            // Si no se encuentra en la lista, intentar obtener solo los metadatos
            // Usar un query param para indicar que solo queremos metadatos
            const metaResponse = await fetch(`/api/documents/${documentId}?metadata=true`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (metaResponse.ok) {
              const contentType = metaResponse.headers.get('content-type');
              if (contentType?.includes('application/json')) {
                const metaData = await metaResponse.json();
                setDocument(metaData.document);
              }
            }
          }
        }

        // Cargar estadísticas del documento
        const statsResponse = await fetch(`/api/documents/${documentId}/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setDocumentStats(stats);
        }

        // Cargar enlaces compartidos y sus estadísticas
        const shareResponse = await fetch(`/api/documents/${documentId}/share`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (shareResponse.ok) {
          const shareData = await shareResponse.json();
          const links = shareData.shareLinks || [];
          
          // Cargar estadísticas de cada enlace
          const linksWithStats = await Promise.all(
            links.map(async (link: any) => {
              try {
                const linkStatsResponse = await fetch(`/api/share/${link.linkId}/stats`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (linkStatsResponse.ok) {
                  const linkStats = await linkStatsResponse.json();
                  return {
                    ...link,
                    viewCount: linkStats.viewCount || 0,
                    views: linkStats.views || []
                  };
                }
                return {
                  ...link,
                  viewCount: 0,
                  views: []
                };
              } catch (err) {
                console.error(`Error al cargar estadísticas del enlace ${link.linkId}:`, err);
                return {
                  ...link,
                  viewCount: 0,
                  views: []
                };
              }
            })
          );

          setShareLinks(linksWithStats);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setIsLoading(false);
      }
    };

    if (documentId) {
      loadData();
    }
  }, [documentId, router]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
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
          <Link
            href="/dashboard/admin/documents"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Volver a Documentos
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
            href="/dashboard/admin/documents"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Documentos
          </Link>
          <h1 className="text-3xl font-bold mb-2">Estadísticas del Documento</h1>
          <p className="text-muted-foreground">{document?.originalName || 'Cargando...'}</p>
        </div>

        {/* Estadísticas Generales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
        >
          <h2 className="text-xl font-semibold mb-4">Estadísticas en HiveFlow</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Vistas Totales</div>
              <div className="text-3xl font-bold">{documentStats?.viewCount || 0}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Descargas Totales</div>
              <div className="text-3xl font-bold">{documentStats?.downloadCount || 0}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Enlaces Compartidos</div>
              <div className="text-3xl font-bold">{shareLinks.length}</div>
            </div>
          </div>
        </motion.div>

        {/* Vistas del Documento Principal */}
        {documentStats && documentStats.views && documentStats.views.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Vistas en HiveFlow</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Usuario</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Fecha de Inicio</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {documentStats.views.map((view, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4">
                        {view.userName || view.userId || 'Usuario anónimo'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {view.userEmail || view.email || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(view.startTime)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                          {formatDuration(view.duration)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Estadísticas de Enlaces Compartidos */}
        {shareLinks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold">Enlaces Compartidos</h2>
            {shareLinks.map((link, linkIndex) => (
              <div
                key={link.linkId}
                className="bg-card rounded-lg shadow-lg border border-border p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Enlace #{linkIndex + 1}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className={`px-2 py-1 rounded text-xs ${link.isPublic ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {link.isPublic ? 'Público' : 'Privado'}
                      </span>
                      {link.allowDownload && (
                        <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-500">
                          Descarga habilitada
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        Creado: {formatDate(link.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{link.viewCount}</div>
                    <div className="text-sm text-muted-foreground">vistas</div>
                  </div>
                </div>

                {link.views && link.views.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Usuario/Email</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Fecha de Inicio</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Duración</th>
                        </tr>
                      </thead>
                      <tbody>
                        {link.views.map((view, viewIndex) => (
                          <tr key={viewIndex} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-3 px-4">
                              <div>
                                {view.userName && (
                                  <div className="font-medium">{view.userName}</div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                  {view.userEmail || view.email || 'Email no proporcionado'}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {formatDate(view.startTime)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                                {formatDuration(view.duration)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p>No hay vistas registradas para este enlace</p>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {shareLinks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg shadow-lg border border-border p-12 text-center"
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <p className="text-muted-foreground">No hay enlaces compartidos para este documento</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

