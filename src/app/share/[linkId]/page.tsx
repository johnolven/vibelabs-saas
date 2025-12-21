'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function SharedDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const linkId = params.linkId as string;
  
  const [document, setDocument] = useState<any>(null);
  const [shareLink, setShareLink] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [requiresEmail, setRequiresEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar token y cargar documento
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        let headers: HeadersInit = {};
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          setIsAuthenticated(true);
        }

        const response = await fetch(`/api/share/${linkId}`, {
          headers
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          if (response.status === 401 && errorData.requiresPassword) {
            setRequiresPassword(true);
            setIsLoading(false);
            return;
          }
          
          throw new Error(errorData.error || 'Error al cargar documento');
        }

        const data = await response.json();
        setDocument(data.document);
        setShareLink(data.shareLink);
        
        // Si es público y no está logueado, requerir email
        if (data.shareLink.isPublic && !data.user) {
          setRequiresEmail(true);
          setIsLoading(false);
          return;
        }

        // Iniciar tracking de vista (sin contraseña en la carga inicial)
        await startView(data.user?.email);
      } catch (err) {
        console.error('Error en loadDocument:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setIsLoading(false);
      }
    };

    if (linkId) {
      loadDocument();
    }
  }, [linkId]);

  const startView = async (userEmail?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      let headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/share/${linkId}/view`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          password: password || undefined,
          email: userEmail || email || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'Contraseña requerida' || errorData.error === 'Contraseña incorrecta') {
          setRequiresPassword(true);
          setIsLoading(false);
          setError(errorData.error === 'Contraseña incorrecta' ? 'Contraseña incorrecta' : null);
          return;
        }
        if (errorData.error === 'Email es requerido para acceder a este enlace') {
          setRequiresEmail(true);
          setIsLoading(false);
          return;
        }
        throw new Error(errorData.error || 'Error al iniciar vista');
      }

      const data = await response.json();
      setViewId(data.viewId);
      setStartTime(new Date(data.startTime));

      // Si no tenemos el documento, obtenerlo ahora que tenemos acceso
      if (!document) {
        const docParams = new URLSearchParams();
        if (password) {
          docParams.append('password', password);
        }
        
        const docResponse = await fetch(`/api/share/${linkId}?${docParams.toString()}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (docResponse.ok) {
          const docData = await docResponse.json();
          setDocument(docData.document);
          if (docData.shareLink) {
            setShareLink(docData.shareLink);
          }
          console.log('Documento obtenido después de validar contraseña:', docData.document.originalName);
        } else {
          console.error('Error al obtener documento después de validar contraseña:', docResponse.status);
        }
      }

      // Cargar preview
      const previewParams = new URLSearchParams();
      if (password) {
        previewParams.append('password', password);
      }

      const previewResponse = await fetch(`/api/share/${linkId}/preview?${previewParams.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!previewResponse.ok) {
        const errorData = await previewResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cargar preview');
      }

      const blob = await previewResponse.blob();
      const url = URL.createObjectURL(blob);
      
      console.log('Preview cargado exitosamente, tamaño:', blob.size, 'tipo:', blob.type);
      
      // Asegurar que tenemos el documento antes de mostrar el preview
      let finalDocument = document;
      if (!finalDocument) {
        const docParams = new URLSearchParams();
        if (password) {
          docParams.append('password', password);
        }
        
        const docResponse = await fetch(`/api/share/${linkId}?${docParams.toString()}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (docResponse.ok) {
          const docData = await docResponse.json();
          finalDocument = docData.document;
          setDocument(finalDocument);
          if (docData.shareLink) {
            setShareLink(docData.shareLink);
          }
          console.log('Documento obtenido finalmente:', finalDocument.originalName);
        }
      }
      
      // Actualizar estados en el orden correcto
      setRequiresPassword(false);
      setRequiresEmail(false);
      setPreviewUrl(url);
      setIsLoading(false);
      
      console.log('Estados actualizados: previewUrl establecido, isLoading = false');
      console.log('Document disponible:', !!finalDocument);
      console.log('PreviewUrl disponible:', !!url);
      
      // Forzar re-render si es necesario
      if (!finalDocument) {
        console.warn('ADVERTENCIA: No se pudo obtener el documento, pero el preview está disponible');
      }
    } catch (err) {
      console.error('Error en startView:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsLoading(false);
      setRequiresPassword(false);
    }
  };

  // Finalizar tracking cuando se sale
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (viewId && startTime) {
        try {
          const token = localStorage.getItem('token');
          let headers: HeadersInit = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          await fetch(`/api/share/${linkId}/view`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              viewId,
              startTime: startTime.toISOString(),
              password: password || undefined
            }),
            keepalive: true
          });
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
  }, [viewId, startTime, linkId, password]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor ingresa la contraseña');
      return;
    }
    await startView();
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      startView(email);
    } else {
      setError('Por favor ingresa un email válido');
    }
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

  // No mostrar loading si ya tenemos el preview o si requiere password/email
  if (isLoading && !previewUrl && !requiresPassword && !requiresEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-lg shadow-xl p-8 max-w-md w-full border border-border"
        >
          <h1 className="text-2xl font-semibold mb-4">Acceso Protegido</h1>
          <p className="text-muted-foreground mb-6">Este documento requiere una contraseña para acceder.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ingresa la contraseña"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Acceder
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (requiresEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-lg shadow-xl p-8 max-w-md w-full border border-border"
        >
          <h1 className="text-2xl font-semibold mb-4">Acceso al Documento</h1>
          <p className="text-muted-foreground mb-6">Por favor ingresa tu email para acceder a este documento.</p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="tu@email.com"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Continuar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-lg shadow-xl p-8 max-w-md w-full border border-border text-center"
        >
          <svg className="w-16 h-16 text-destructive mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
        </motion.div>
      </div>
    );
  }

  // Si tenemos el preview, mostrar el documento
  if (previewUrl && document) {
    console.log('Renderizando preview. Document:', document.originalName, 'PreviewUrl:', previewUrl);
    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{document.originalName}</h1>
          </div>
          {shareLink?.allowDownload && (
            <a
              href={`/api/share/${linkId}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`}
              download={document.originalName}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar
            </a>
          )}
        </header>

        <div className="flex-1 overflow-hidden relative">
          {canPreviewInBrowser() ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="w-full h-full border-0"
              title={document.originalName}
              onLoad={() => {
                console.log('Iframe cargado exitosamente');
                setIsLoading(false);
              }}
              onError={(e) => {
                console.error('Error al cargar iframe:', e);
                setError('Error al cargar el documento');
                setIsLoading(false);
              }}
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
                  href={previewUrl}
                  download={document.originalName}
                  className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Descargar documento
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Estado por defecto si no hay preview
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Preparando documento...</p>
      </div>
    </div>
  );
}

