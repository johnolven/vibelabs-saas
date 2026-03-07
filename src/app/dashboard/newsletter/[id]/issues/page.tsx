'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Issue {
  _id: string;
  subject: string;
  status: string;
  generatedAt: string;
  sentAt?: string;
  recipientCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function IssuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchIssues();
  }, [id, pagination.page]);

  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/newsletters/${id}/issues?page=${pagination.page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        router.push('/dashboard');
        return;
      }
      const data = await res.json();
      setIssues(data.issues);
      setPagination(data.pagination);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/newsletters/${id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage('Issue generado exitosamente');
        fetchIssues();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Error al generar');
      }
    } catch {
      setMessage('Error de conexion');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (issueId: string) => {
    setSending(issueId);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/newsletters/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ issueId }),
      });
      if (res.ok) {
        setMessage('Issue enviado exitosamente');
        fetchIssues();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Error al enviar');
      }
    } catch {
      setMessage('Error de conexion');
    } finally {
      setSending(null);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<string, string> = { draft: 'Borrador', sent: 'Enviado', failed: 'Fallido' };
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <Link href={`/dashboard/newsletter/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Volver al newsletter
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Issues</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Generando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generar con IA
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg mb-6 text-sm ${
          message.includes('exitosa') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-destructive/10 text-destructive'
        }`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No hay issues generados aun.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Generar primer issue
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Asunto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Enviados</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, index) => (
                  <motion.tr
                    key={issue._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-foreground font-medium max-w-xs truncate">{issue.subject}</td>
                    <td className="px-4 py-3">{statusBadge(issue.status)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(issue.generatedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{issue.recipientCount}</td>
                    <td className="px-4 py-3 text-right">
                      {issue.status === 'draft' && (
                        <button
                          onClick={() => handleSend(issue._id)}
                          disabled={sending === issue._id}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {sending === issue._id ? 'Enviando...' : 'Enviar'}
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {pagination.total} issues en total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 text-sm rounded-md border border-input hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1 text-sm rounded-md border border-input hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
