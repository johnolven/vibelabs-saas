'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function FollowerDashboard() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Bienvenido a CapFlow</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Estás suscrito para recibir actualizaciones de producto. 
          Mantente al día con las últimas novedades y mejoras.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border p-8 hover:shadow-lg transition-shadow"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Product Updates</h2>
            <p className="text-muted-foreground mb-6">
              Revisa las últimas actualizaciones y mejoras de producto
            </p>
            <Link
              href="/dashboard/follower/updates"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Ver Updates
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-lg border border-border p-8 hover:shadow-lg transition-shadow"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Mi Perfil</h2>
            <p className="text-muted-foreground mb-6">
              Gestiona tu información personal y preferencias
            </p>
            <Link
              href="/dashboard/settings/profile"
              className="inline-block px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Ver Perfil
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="bg-muted/30 rounded-lg p-6 max-w-2xl mx-auto text-center">
        <p className="text-sm text-muted-foreground">
          ¿Interesado en convertirte en inversor?{' '}
          <a href="mailto:contact@capflow.com" className="text-primary hover:underline">
            Contáctanos
          </a>
        </p>
      </div>
    </div>
  );
}

