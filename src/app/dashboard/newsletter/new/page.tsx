'use client';

import { useState } from 'react';
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

const AI_PROVIDER_INFO: Record<string, { keyUrl: string; keyLabel: string; steps: string[]; icon: string }> = {
  openai: {
    keyUrl: 'https://platform.openai.com/api-keys',
    keyLabel: 'Obtener API Key de OpenAI',
    steps: [
      'Inicia sesion o crea una cuenta en OpenAI',
      'Ve a "API Keys" en el menu lateral',
      'Click en "Create new secret key"',
      'Copia la key (empieza con sk-...)',
    ],
    icon: '🤖',
  },
  anthropic: {
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyLabel: 'Obtener API Key de Anthropic',
    steps: [
      'Inicia sesion o crea una cuenta en Anthropic',
      'Ve a Settings > API Keys',
      'Click en "Create Key"',
      'Copia la key (empieza con sk-ant-...)',
    ],
    icon: '🧠',
  },
};

export default function NewNewsletterPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    topic: '',
    frequency: 'weekly',
    style: 'professional',
    accentColor: '#6366f1',
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    aiApiKey: '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleProviderChange = (provider: string) => {
    const models = AI_MODELS[provider];
    const defaultModel = models.find(m => m.recommended)?.value || models[0].value;
    setForm(prev => ({
      ...prev,
      aiProvider: provider,
      aiModel: defaultModel,
    }));
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          aiProvider: form.aiProvider,
          aiModel: form.aiModel,
          aiApiKey: form.aiApiKey,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, message: 'Conexion exitosa' });
      } else {
        setTestResult({ ok: false, message: data.error || 'Error de conexion' });
      }
    } catch {
      setTestResult({ ok: false, message: 'Error al probar la conexion' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/newsletters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/newsletter/${data._id}`);
      } else {
        setError(data.error || 'Error al crear el newsletter');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Volver al dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-6">Crear Newsletter</h1>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Informacion Basica</h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Ej: AI Daily Digest"
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Slug (URL publica)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/n/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="ai-daily-digest"
                required
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descripcion</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripcion corta para la landing publica"
              required
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tema / Prompt para la IA</label>
            <textarea
              value={form.topic}
              onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="Ej: Latest AI news, breakthroughs in machine learning, and practical AI tools for developers"
              required
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
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
          <p className="text-sm text-muted-foreground">
            Configura el proveedor de IA que generara el contenido de tu newsletter. Necesitas tu propia API key.
          </p>

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
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
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
                placeholder={form.aiProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                required
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
            <p className="text-xs text-muted-foreground mt-1">Tu API key se guarda encriptada y nunca se comparte.</p>

            {/* Helper: Link directo + pasos para obtener la key */}
            <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  No tienes API key?
                </span>
                <a
                  href={AI_PROVIDER_INFO[form.aiProvider].keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {AI_PROVIDER_INFO[form.aiProvider].keyLabel}
                </a>
              </div>
              <ol className="space-y-1 ml-4">
                {AI_PROVIDER_INFO[form.aiProvider].steps.map((step, i) => (
                  <li key={i} className="text-xs text-muted-foreground list-decimal">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
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

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
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
                Creando...
              </>
            ) : (
              'Crear Newsletter'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
