'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Metric {
  _id: string;
  name: string;
  type: string;
  unit: string;
  values: Array<{
    date: string;
    value: number;
    notes?: string;
  }>;
  targetValue?: number;
}

interface Document {
  _id: string;
  fileName: string;
  originalName: string;
  folder: string;
  description?: string;
  uploadedAt: string;
  downloadCount: number;
}

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

export default function InvestorPortal() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [updates, setUpdates] = useState<MonthlyUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'updates'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/signin';
        return;
      }

      // Cargar métricas
      const metricsRes = await fetch('/api/metrics?activeOnly=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics || []);
      }

      // Cargar documentos
      const docsRes = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }

      // Cargar updates
      const updatesRes = await fetch('/api/updates?status=sent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (updatesRes.ok) {
        const updatesData = await updatesRes.json();
        setUpdates(updatesData.updates || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLatestMetricValue = (metric: Metric) => {
    if (!metric.values || metric.values.length === 0) return null;
    const sorted = [...metric.values].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0];
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'currency') {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(value);
    }
    if (unit === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === 'days' || unit === 'months') {
      return `${value} ${unit === 'days' ? 'días' : 'meses'}`;
    }
    return value.toLocaleString('es-ES');
  };

  const getFolderName = (folder: string) => {
    const names: Record<string, string> = {
      legal: 'Legal',
      financials: 'Financieros',
      board_materials: 'Materiales de Junta',
      pitch_deck: 'Pitch Deck',
      other: 'Otros'
    };
    return names[folder] || folder;
  };

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Investor Portal</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido al portal de relaciones con inversionistas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'documents', label: 'Documentos' },
            { id: 'updates', label: 'Updates' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Métricas principales */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Métricas Clave</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.slice(0, 6).map(metric => {
                const latest = getLatestMetricValue(metric);
                return (
                  <motion.div
                    key={metric._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg border border-border p-6"
                  >
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {metric.name}
                    </h3>
                    {latest ? (
                      <div>
                        <p className="text-2xl font-bold">
                          {formatValue(latest.value, metric.unit)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(latest.date).toLocaleDateString('es-ES', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Sin datos</p>
                    )}
                    {metric.targetValue && latest && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progreso</span>
                          <span>
                            {((latest.value / metric.targetValue) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${Math.min((latest.value / metric.targetValue) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Últimos documentos */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Documentos Recientes</h2>
              <Link
                href="#"
                onClick={() => setActiveTab('documents')}
                className="text-sm text-primary hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <div className="space-y-2">
              {documents.slice(0, 5).map(doc => (
                <motion.div
                  key={doc._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-lg border border-border p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">{doc.originalName}</p>
                      <p className="text-sm text-muted-foreground">
                        {getFolderName(doc.folder)} • {new Date(doc.uploadedAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/documents/${doc._id}`}
                    download
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  >
                    Descargar
                  </a>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Últimos updates */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Últimos Updates</h2>
              <Link
                href="#"
                onClick={() => setActiveTab('updates')}
                className="text-sm text-primary hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <div className="space-y-4">
              {updates.slice(0, 3).map(update => (
                <motion.div
                  key={update._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-lg border border-border p-6"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">{update.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getMonthName(update.month)} {update.year}
                      </p>
                    </div>
                    {update.sentAt && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-xs">
                        Enviado
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {update.sections.slice(0, 2).map((section, idx) => (
                      <div key={idx}>
                        <h4 className="font-medium text-sm mb-1">{section.title}</h4>
                        <div
                          className="text-sm text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/dashboard/investor/updates/${update._id}`}
                    className="mt-4 inline-block text-sm text-primary hover:underline"
                  >
                    Leer más →
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Data Room</h2>
          {['legal', 'financials', 'board_materials', 'pitch_deck'].map(folder => {
            const folderDocs = documents.filter(d => d.folder === folder);
            if (folderDocs.length === 0) return null;
            return (
              <div key={folder} className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">{getFolderName(folder)}</h3>
                <div className="space-y-2">
                  {folderDocs.map(doc => (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="font-medium">{doc.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.uploadedAt).toLocaleDateString('es-ES')} • {doc.downloadCount} descargas
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/api/documents/${doc._id}`}
                        download
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                      >
                        Descargar
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Updates Tab */}
      {activeTab === 'updates' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Monthly Updates</h2>
          {updates.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <p className="text-muted-foreground">No hay updates disponibles</p>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map(update => (
                <motion.div
                  key={update._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-lg border border-border p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{update.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getMonthName(update.month)} {update.year}
                      </p>
                    </div>
                    {update.sentAt && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
                        Enviado {new Date(update.sentAt).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {update.sections.map((section, idx) => (
                      <div key={idx}>
                        <h4 className="font-semibold mb-2">{section.title}</h4>
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
      )}
    </div>
  );
}

