'use client';

import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect, useRef, use } from 'react';
import { ModeToggle } from '@/components/mode-toggle';
import Link from 'next/link';
import { Mail, Users, Calendar, CheckCircle2, Loader2, ArrowRight, Sparkles, Clock, BookOpen } from 'lucide-react';

interface NewsletterData {
  _id: string;
  name: string;
  slug: string;
  description: string;
  topic: string;
  frequency: 'daily' | 'weekly';
  style: string;
  accentColor: string;
  subscriberCount: number;
  createdAt: string;
}

interface IssueData {
  subject: string;
  contentHtml: string;
  sentAt: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] }
  })
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] } }
};

export default function NewsletterPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [newsletter, setNewsletter] = useState<NewsletterData | null>(null);
  const [latestIssue, setLatestIssue] = useState<IssueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error' | 'already'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  useEffect(() => {
    fetch(`/api/public/newsletter/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.newsletter) {
          setNewsletter(data.newsletter);
          setLatestIssue(data.latestIssue || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;
    setSubscribing(true);
    setSubscribeStatus('idle');
    try {
      const res = await fetch(`/api/subscribe/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.message?.includes('Ya estas')) {
          setSubscribeStatus('already');
          setStatusMessage(data.message);
        } else {
          setSubscribeStatus('success');
          setStatusMessage(data.message);
          setEmail('');
        }
      } else {
        setSubscribeStatus('error');
        setStatusMessage(data.error || 'Error al suscribirse');
      }
    } catch {
      setSubscribeStatus('error');
      setStatusMessage('Error de conexion');
    } finally {
      setSubscribing(false);
    }
  };

  const accentColor = newsletter?.accentColor || '#7c3aed';

  const accentGradient = `linear-gradient(135deg, ${accentColor}, ${adjustColor(accentColor, 40)})`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
          <p className="text-muted-foreground">Cargando...</p>
        </motion.div>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Newsletter no encontrado</h1>
          <p className="text-muted-foreground">Este newsletter no existe o ya no esta activo.</p>
        </motion.div>
      </div>
    );
  }

  const frequencyLabel = newsletter.frequency === 'daily' ? 'Diario' : 'Semanal';
  const styleLabel = { professional: 'Profesional', casual: 'Casual', technical: 'Tecnico', creative: 'Creativo' }[newsletter.style] || newsletter.style;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Floating theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-[700px] h-[700px] rounded-full blur-[120px] opacity-20"
            style={{ background: accentGradient, top: '10%', left: '20%' }}
            animate={{ x: [0, 50, -30, 0], y: [0, -30, 50, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15"
            style={{ background: accentGradient, bottom: '10%', right: '15%' }}
            animate={{ x: [0, -40, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.9, 1.1, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(120,119,198,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(120,119,198,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            className="absolute w-2 h-2 rounded-full opacity-20"
            style={{ background: accentColor, left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}

        <motion.div style={{ y: heroY, scale: heroScale }} className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          {/* Badge */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm text-sm font-medium mb-8"
            style={{ borderColor: `${accentColor}30`, color: accentColor }}>
            <Sparkles className="w-4 h-4" />
            Newsletter {frequencyLabel} &middot; {styleLabel}
          </motion.div>

          {/* Newsletter name */}
          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6">
            <span style={{ backgroundImage: accentGradient }} className="bg-clip-text text-transparent">
              {newsletter.name}
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed">
            {newsletter.description || newsletter.topic}
          </motion.p>

          {/* Stats */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" style={{ color: accentColor }} />
              <span className="font-semibold text-foreground">{newsletter.subscriberCount}</span>
              <span className="text-sm">suscriptores</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5" style={{ color: accentColor }} />
              <span className="text-sm">{frequencyLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" style={{ color: accentColor }} />
              <span className="text-sm">Desde {new Date(newsletter.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
            </div>
          </motion.div>

          {/* Subscribe form */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <SubscribeForm
              email={email}
              setEmail={setEmail}
              onSubmit={handleSubscribe}
              subscribing={subscribing}
              subscribeStatus={subscribeStatus}
              statusMessage={statusMessage}
              accentColor={accentColor}
              accentGradient={accentGradient}
            />
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        {latestIssue && (
          <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <span className="text-xs text-muted-foreground">Ver ultima edicion</span>
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/20 flex justify-center pt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            </div>
          </motion.div>
        )}
      </section>

      {/* Latest Issue Preview */}
      {latestIssue && (
        <section className="py-20 sm:py-28 relative">
          <div className="absolute inset-0 bg-accent/20" />
          <div className="relative max-w-4xl mx-auto px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
              <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-8 justify-center">
                <BookOpen className="w-6 h-6" style={{ color: accentColor }} />
                <h2 className="text-2xl sm:text-3xl font-bold">Ultima Edicion</h2>
              </motion.div>

              <motion.div variants={scaleIn}
                className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                {/* Email header mockup */}
                <div className="border-b border-border bg-muted/30 px-6 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/70" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                      <div className="w-3 h-3 rounded-full bg-green-400/70" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground font-medium">De:</span>
                      <span className="text-foreground">{newsletter.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground font-medium">Asunto:</span>
                      <span className="text-foreground font-semibold">{latestIssue.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground font-medium">Fecha:</span>
                      <span className="text-muted-foreground">
                        {new Date(latestIssue.sentAt).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email content */}
                <div className="p-6 sm:p-10">
                  <div
                    className="prose prose-sm sm:prose-base dark:prose-invert max-w-none
                      prose-headings:font-bold prose-a:text-violet-600 dark:prose-a:text-violet-400
                      prose-img:rounded-lg"
                    dangerouslySetInnerHTML={{ __html: latestIssue.contentHtml }}
                  />
                </div>

                {/* Fade overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-card to-transparent pointer-events-none" />
              </motion.div>

              {/* CTA below preview */}
              <motion.div variants={fadeUp} custom={2} className="mt-10 text-center">
                <p className="text-muted-foreground mb-6 text-lg">
                  No te pierdas la proxima edicion
                </p>
                <SubscribeForm
                  email={email}
                  setEmail={setEmail}
                  onSubmit={handleSubscribe}
                  subscribing={subscribing}
                  subscribeStatus={subscribeStatus}
                  statusMessage={statusMessage}
                  accentColor={accentColor}
                  accentGradient={accentGradient}
                />
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by{' '}
            <Link href="/" className="font-semibold hover:underline" style={{ color: accentColor }}>NewsAI</Link>
            {' '}&middot;{' '}
            <Link href={`/n/${slug}/unsubscribe`} className="hover:underline text-muted-foreground">
              Desuscribirse
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function SubscribeForm({
  email, setEmail, onSubmit, subscribing, subscribeStatus, statusMessage, accentColor, accentGradient,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  subscribing: boolean;
  subscribeStatus: 'idle' | 'success' | 'error' | 'already';
  statusMessage: string;
  accentColor: string;
  accentGradient: string;
}) {
  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={onSubmit} className="relative">
        <div className="flex rounded-xl overflow-hidden shadow-lg border border-border bg-card focus-within:ring-2 transition-shadow"
          style={{ boxShadow: `0 4px 24px ${accentColor}15` }}>
          <div className="relative flex-1">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full pl-12 pr-4 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
            />
          </div>
          <button type="submit" disabled={subscribing}
            className="px-6 sm:px-8 py-4 text-white font-semibold text-sm sm:text-base transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
            style={{ background: accentGradient }}>
            {subscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Suscribirse
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {subscribeStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 flex items-center justify-center gap-2 text-sm font-medium ${
              subscribeStatus === 'success' ? 'text-green-600 dark:text-green-400' :
              subscribeStatus === 'already' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
            {subscribeStatus === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
