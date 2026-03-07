'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Newsletter {
  _id: string;
  name: string;
  slug: string;
  description: string;
  frequency: string;
  style: string;
  isActive: boolean;
  subscriberCount: number;
  accentColor: string;
  createdAt: string;
  lastGeneratedAt?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const fetchNewsletters = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/newsletters', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNewsletters(data);
      }
    } catch (error) {
      console.error('Error fetching newsletters:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSubscribers = newsletters.reduce((sum, n) => sum + n.subscriberCount, 0);
  const activeNewsletters = newsletters.filter(n => n.isActive).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Newsletters</p>
          <p className="text-3xl font-bold text-foreground">{newsletters.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Activos</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeNewsletters}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total Suscriptores</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalSubscribers}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Mis Newsletters</h2>
        <Link
          href="/dashboard/newsletter/new"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Newsletter
        </Link>
      </div>

      {/* Newsletter List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : newsletters.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-xl border border-border p-12 text-center"
        >
          <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="text-lg font-semibold text-foreground mb-2">No tienes newsletters aun</h3>
          <p className="text-muted-foreground mb-6">Crea tu primer newsletter y comienza a generar contenido con IA.</p>
          <Link
            href="/dashboard/newsletter/new"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Crear mi primer Newsletter
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsletters.map((newsletter, index) => (
            <motion.div
              key={newsletter._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => router.push(`/dashboard/newsletter/${newsletter._id}`)}
              className="bg-card rounded-xl border border-border p-6 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                  style={{ backgroundColor: newsletter.accentColor }}
                />
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  newsletter.isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {newsletter.isActive ? 'Activo' : 'Pausado'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {newsletter.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{newsletter.description}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {newsletter.subscriberCount} suscriptores
                </span>
                <span className="capitalize">{newsletter.frequency === 'daily' ? 'Diario' : 'Semanal'}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>/n/{newsletter.slug}</span>
                {newsletter.lastGeneratedAt && (
                  <span>Ultimo: {new Date(newsletter.lastGeneratedAt).toLocaleDateString('es')}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
