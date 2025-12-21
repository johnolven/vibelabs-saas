'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentPreviewProps {
  document: {
    _id: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
  };
  onClose: () => void;
}

export default function DocumentPreview({ document, onClose }: DocumentPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [viewDuration, setViewDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Iniciar tracking de vista
  useEffect(() => {
    const startView = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No hay token de autenticación');
          return;
        }

        const response = await fetch(`/api/documents/${document._id}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Error al iniciar vista');
        }

        const data = await response.json();
        setViewId(data.viewId);
        setStartTime(new Date(data.startTime));

        // Cargar preview
        const previewResponse = await fetch(`/api/documents/${document._id}/preview`, {
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

    startView();

    // Limpiar al desmontar
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [document._id]);

  // Actualizar duración cada segundo
  useEffect(() => {
    if (startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
        setViewDuration(duration);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTime]);

  // Finalizar tracking cuando se cierra
  const handleClose = async () => {
    if (viewId && startTime) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`/api/documents/${document._id}/view`, {
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

    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canPreviewInBrowser = () => {
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
    return previewableTypes.some(type => document.mimeType.toLowerCase().includes(type.toLowerCase()));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{document.originalName}</h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span>Tiempo de visualización: {formatDuration(viewDuration)}</span>
                  <span>•</span>
                  <span>{(document.fileSize / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="ml-4 p-2 hover:bg-muted rounded-lg transition-colors"
              title="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="text-center">
                  <svg className="w-16 h-16 text-destructive mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium text-destructive mb-2">Error al cargar preview</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            )}

            {previewUrl && !error && (
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
                      <a
                        href={`/api/documents/${document._id}`}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar archivo
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

