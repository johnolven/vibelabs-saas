'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function DocumentPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  
  usePageTracking({ section: 'documents', documentId, metadata: { action: 'preview' } });
  
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cargar documento y iniciar tracking
  useEffect(() => {
    const loadDocument = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No hay token de autenticación');
          setIsLoading(false);
          return;
        }

        // Iniciar tracking de vista
        const viewResponse = await fetch(`/api/documents/${documentId}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!viewResponse.ok) {
          throw new Error('Error al iniciar vista');
        }

        const viewData = await viewResponse.json();
        setViewId(viewData.viewId);
        setStartTime(new Date(viewData.startTime));

        // Cargar información del documento desde la API de documentos
        const docResponse = await fetch(`/api/documents?period=all`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!docResponse.ok) {
          throw new Error('Error al cargar documento');
        }

        const { documents } = await docResponse.json();
        const doc = documents.find((d: any) => d._id === documentId);
        
        if (!doc) {
          throw new Error('Documento no encontrado');
        }

        setDocument(doc);

        // Cargar preview
        const previewResponse = await fetch(`/api/documents/${documentId}/preview`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!previewResponse.ok) {
          throw new Error('Error al cargar preview');
        }

        const blob = await previewResponse.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setIsLoading(false);
      }
    };

    loadDocument();

    // Limpiar al desmontar
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [documentId]);

  // Finalizar tracking cuando se sale de la página
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (viewId && startTime) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            // Usar sendBeacon para asegurar que se envíe incluso si la página se cierra
            await fetch(`/api/documents/${documentId}/view`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                viewId,
                startTime: startTime.toISOString()
              }),
              keepalive: true
            });
          }
        } catch (err) {
          console.error('Error al finalizar vista:', err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [viewId, startTime, documentId]);

  const handleBack = async () => {
    // Finalizar tracking antes de salir
    if (viewId && startTime) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`/api/documents/${documentId}/view`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              viewId,
              startTime: startTime.toISOString()
            })
          });
        }
      } catch (err) {
        console.error('Error al finalizar vista:', err);
      }
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    router.push('/dashboard/admin/documents');
  };

  const canPreviewInBrowser = () => {
    if (!document) return false;
    const previewableTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/html'
    ];
    return previewableTypes.some(type => document.mimeType?.toLowerCase().includes(type.toLowerCase()));
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) return;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document?.originalName || 'documento';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error al descargar:', err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
            title="Volver"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{document?.originalName || 'Cargando...'}</h1>
            {document && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>{(document.fileSize / 1024).toFixed(1)} KB</span>
                {document.viewCount !== undefined && (
                  <>
                    <span>•</span>
                    <span>{document.viewCount} vistas</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {document && (
            <>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar
              </button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <svg className="w-16 h-16 text-destructive mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium text-destructive mb-2">Error al cargar preview</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        )}

        {previewUrl && !error && document && (
          <>
            {canPreviewInBrowser() ? (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                title={document.originalName}
              />
            ) : (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center max-w-md">
                  <svg className="w-20 h-20 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Vista previa no disponible</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Este tipo de archivo no se puede previsualizar en el navegador.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar archivo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

