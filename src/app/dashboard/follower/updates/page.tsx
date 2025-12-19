'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface MonthlyUpdate {
  _id: string;
  title: string;
  month: number;
  year: number;
  status: string;
  sentAt?: string;
  sections: Array<{
    type: string;
    title: string;
    content: string;
  }>;
}

export default function FollowerUpdates() {
  const [updates, setUpdates] = useState<MonthlyUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/signin';
        return;
      }

      const response = await fetch('/api/updates?status=sent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUpdates(data.updates || []);
      }
    } catch (error) {
      console.error('Error loading updates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Updates</h1>
        <p className="text-muted-foreground mt-2">
          Mantente al día con las últimas actualizaciones de producto
        </p>
      </div>

      {updates.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-muted-foreground text-lg">No hay updates disponibles</p>
          <p className="text-muted-foreground text-sm mt-2">
            Te notificaremos cuando haya nuevos product updates
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {updates.map((update) => (
            <motion.div
              key={update._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-semibold">{update.title}</h2>
                  <p className="text-muted-foreground mt-1">
                    {getMonthName(update.month)} {update.year}
                  </p>
                </div>
                {update.sentAt && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
                    Publicado {new Date(update.sentAt).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {update.sections.map((section, idx) => (
                  <div key={idx} className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}


