'use client';

import { usePageTracking } from '@/hooks/usePageTracking';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const stats = [
  { name: 'Usuarios Totales', value: '0', href: '/dashboard/admin/users' },
  { name: 'Inversores Activos', value: '0', href: '/dashboard/admin/users' },
  { name: 'Documentos', value: '0', href: '/dashboard/admin/documents' },
  { name: 'Updates Enviados', value: '0', href: '/dashboard/admin/updates' },
];

export default function AdminDashboard() {
  usePageTracking({ section: 'dashboard' });
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Administración</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona todos los aspectos de la plataforma de relaciones con inversionistas
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Link href={stat.href}>
              <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Cap Table</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Gestiona la tabla de capitalización, accionistas y dilución
          </p>
          <Link
            href="/dashboard/admin/cap-table"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Gestionar Cap Table
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Data Room</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Sube y gestiona documentos con control de acceso por carpeta
          </p>
          <Link
            href="/dashboard/admin/documents"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Gestionar Documentos
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Monthly Updates</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Crea y envía actualizaciones mensuales a los inversores
          </p>
          <Link
            href="/dashboard/admin/updates"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Crear Update
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Métricas</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Configura y gestiona métricas clave (MRR, usuarios, burn rate, etc.)
          </p>
          <Link
            href="/dashboard/admin/metrics"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Gestionar Métricas
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Usuarios</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Gestiona usuarios, roles y permisos del sistema
          </p>
          <Link
            href="/dashboard/admin/users"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Gestionar Usuarios
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Roles y Permisos</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Configura roles y permisos del sistema
          </p>
          <Link
            href="/dashboard/admin/roles"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Gestionar Roles
          </Link>
        </motion.div>
      </div>
    </div>
  );
}


