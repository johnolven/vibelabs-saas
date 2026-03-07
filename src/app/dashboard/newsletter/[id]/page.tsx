'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

const AI_MODELS: Record<string, { label: string; value: string; recommended?: boolean }[]> = {
  openai: [
    { label: 'GPT-4o Mini (Recomendado)', value: 'gpt-4o-mini', recommended: true },
    { label: 'GPT-4o', value: 'gpt-4o' },
  ],
  anthropic: [
    { label: 'Claude Haiku 4.5 (Recomendado)', value: 'claude-haiku-4-5-20251001', recommended: true },
    { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
  ],
};

interface NewsletterData {
  _id: string;
  name: string;
  slug: string;
  description: string;
  topic: string;
  frequency: string;
  style: string;
  accentColor: string;
  isActive: boolean;
  subscriberCount: number;
  aiProvider: string;
  aiModel: string;
  issueCount: number;
  activeSubscribers: number;
  lastGeneratedAt?: string;
  createdAt: string;
}

export default function NewsletterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [newsletter, setNewsletter] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    topic: '',
    frequency: 'weekly',
    style: 'professional',
    accentColor: '#6366f1',
    isActive: true,
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    aiApiKey: '',
  });

  useEffect(() => {
    fetchNewsletter();
  }, [id]);

  const fetchNewsletter = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/newsletters/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        router.push('/dashboard');
        return;
      }
      const data = await res.json();
      setNewsletter(data);
      setForm({
        name: data.name,
        slug: data.slug,
        description: data.description,
        topic: data.topic,
        frequency: data.frequency,
        style: data.style,
        accentColor: data.accentColor,
        isActive: data.isActive,
        aiProvider: data.aiProvider,
        aiModel: data.aiModel,
        aiApiKey: '',
      });
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    const models = AI_MODELS[provider];
    const defaultModel = models.find(m => m.recommended)?.value || models[0].value;
    setForm(prev => ({ ...prev, aiProvider: provider, aiModel: defaultModel }));
  };

  const handleTestConnection = async () => {
    if (!form.aiApiKey) {
      setTestResult({ ok: false, message: 'Ingresa tu API key primero' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/newsletters/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aiProvider: form.aiProvider, aiModel: form.aiModel, aiApiKey: form.aiApiKey }),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, message: res.ok ? 'Conexion exitosa' : (data.error || 'Error de conexion') });
    } catch {
      setTestResult({ ok: false, message: 'Error al probar la conexion' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const body: Record<string, unknown> = { ...form };
      if (!form.aiApiKey) delete body.aiApiKey;

      const res = await fetch(`/api/newsletters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Newsletter actualizado');
        setNewsletter(prev => prev ? { ...prev, ...data } : prev);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al actualizar');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/newsletters/${id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Issue generado exitosamente');
        fetchNewsletter();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al generar');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/newsletters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Error al eliminar');
        setShowDeleteConfirm(false);
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!newsletter) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Volver al dashboard
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{newsletter.activeSubscribers}</p>
          <p className="text-xs text-muted-foreground">Suscriptores</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{newsletter.issueCount}</p>
          <p className="text-xs text-muted-foreground">Issues</p>
        </div>
        <Link href={`/dashboard/newsletter/${id}/subscribers`} className="bg-card rounded-xl border border-border p-4 text-center hover:bg-secondary/50 transition-colors">
          <p className="text-sm font-medium text-primary">Ver Suscriptores</p>
          <p className="text-xs text-muted-foreground mt-1">&rarr;</p>
        </Link>
        <Link href={`/dashboard/newsletter/${id}/issues`} className="bg-card rounded-xl border border-border p-4 text-center hover:bg-secondary/50 transition-colors">
          <p className="text-sm font-medium text-primary">Ver Issues</p>
          <p className="text-xs text-muted-foreground mt-1">&rarr;</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 flex flex-wrap items-center gap-3">
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
              Generar Issue con IA
            </>
          )}
        </button>
        <a
          href={`${appUrl}/n/${newsletter.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-input bg-background text-foreground hover:bg-secondary transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Ver Landing Publica
        </a>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">{success}</div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Informacion Basica</h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/n/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                required
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descripcion</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tema / Prompt para la IA</label>
            <textarea
              value={form.topic}
              onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
              required
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground">Activo</label>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Configuracion</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Frecuencia</label>
              <select
                value={form.frequency}
                onChange={e => setForm(prev => ({ ...prev, frequency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Estilo</label>
              <select
                value={form.style}
                onChange={e => setForm(prev => ({ ...prev, style: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="professional">Profesional</option>
                <option value="casual">Casual</option>
                <option value="technical">Tecnico</option>
                <option value="creative">Creativo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Color de acento</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accentColor}
                onChange={e => setForm(prev => ({ ...prev, accentColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-input cursor-pointer"
              />
              <input
                type="text"
                value={form.accentColor}
                onChange={e => setForm(prev => ({ ...prev, accentColor: e.target.value }))}
                className="w-28 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-lg font-semibold text-foreground">Configuracion de IA</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Proveedor</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4o' },
                { id: 'anthropic', name: 'Anthropic', desc: 'Claude' },
              ].map(provider => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleProviderChange(provider.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    form.aiProvider === provider.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium text-foreground">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Modelo</label>
            <select
              value={form.aiModel}
              onChange={e => setForm(prev => ({ ...prev, aiModel: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {AI_MODELS[form.aiProvider].map(model => (
                <option key={model.value} value={model.value}>{model.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={form.aiApiKey}
                onChange={e => setForm(prev => ({ ...prev, aiApiKey: e.target.value }))}
                placeholder="Dejar vacio para mantener la actual"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Solo se actualiza si ingresas una nueva key.</p>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !form.aiApiKey}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-input bg-background text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Probando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Probar conexion
              </>
            )}
          </button>

          {testResult && (
            <div className={`text-sm px-3 py-2 rounded-lg ${
              testResult.ok
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {testResult.message}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            Eliminar Newsletter
          </button>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium rounded-lg border border-input bg-background text-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl border border-border p-6 max-w-sm w-full"
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">Eliminar Newsletter</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Esta accion eliminara el newsletter, todos sus issues y suscriptores. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-input bg-background text-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
