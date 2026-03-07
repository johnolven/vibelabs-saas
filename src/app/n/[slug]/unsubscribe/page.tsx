'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, use } from 'react';
import { ModeToggle } from '@/components/mode-toggle';
import { MailX, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface NewsletterData {
  _id: string;
  name: string;
  slug: string;
  accentColor: string;
}

export default function UnsubscribePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [newsletter, setNewsletter] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/public/newsletter/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.newsletter) setNewsletter(data.newsletter);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newsletter || processing) return;
    setProcessing(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), newsletterId: newsletter._id }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Error al desuscribirse');
      }
    } catch {
      setStatus('error');
      setMessage('Error de conexion');
    } finally {
      setProcessing(false);
    }
  };

  const accentColor = newsletter?.accentColor || '#7c3aed';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <MailX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Newsletter no encontrado</h1>
          <p className="text-muted-foreground">Este newsletter no existe o ya no esta activo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${accentColor}15` }}>
              <MailX className="w-8 h-8" style={{ color: accentColor }} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Desuscribirse</h1>
            <p className="text-muted-foreground text-sm">
              Ingresa tu email para desuscribirte de{' '}
              <span className="font-semibold text-foreground">{newsletter.name}</span>
            </p>
          </div>

          {status === 'success' ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Desuscrito exitosamente</p>
              <p className="text-sm text-muted-foreground mb-6">{message}</p>
              <Link href={`/n/${slug}`}
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                style={{ color: accentColor }}>
                <ArrowLeft className="w-4 h-4" />
                Volver al newsletter
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 transition-shadow"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                />
              </div>
              <button type="submit" disabled={processing}
                className="w-full py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor }}>
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Confirmar desuscripcion'
                )}
              </button>

              <AnimatePresence>
                {status === 'error' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 justify-center">
                    <AlertCircle className="w-4 h-4" />
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href={`/n/${slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Volver a {newsletter.name}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
