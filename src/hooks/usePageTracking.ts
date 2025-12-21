'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface PageTrackingOptions {
  section: string;
  documentId?: string;
  metadata?: Record<string, any>;
}

export function usePageTracking(options: PageTrackingOptions) {
  const pathname = usePathname();
  const viewIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    const startTracking = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/statistics/page-view', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            path: pathname,
            section: options.section,
            documentId: options.documentId,
            metadata: options.metadata
          })
        });

        if (response.ok) {
          const data = await response.json();
          viewIdRef.current = data.viewId;
          startTimeRef.current = new Date();
        }
      } catch (error) {
        console.error('Error al iniciar tracking:', error);
      }
    };

    startTracking();

    return () => {
      const endTracking = async () => {
        if (viewIdRef.current) {
          try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {
              'Content-Type': 'application/json'
            };
            
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            await fetch('/api/statistics/page-view', {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                viewId: viewIdRef.current
              }),
              keepalive: true
            });
          } catch (error) {
            console.error('Error al finalizar tracking:', error);
          }
        }
      };

      endTracking();
    };
  }, [pathname, options.section, options.documentId]);
}

