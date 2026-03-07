'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from "next/link";
import { useState, useEffect, useRef } from 'react';
import { ModeToggle } from "@/components/mode-toggle";
import { Mail, Sparkles, Zap, BarChart3, Globe, ArrowRight, Send } from 'lucide-react';

const translations = {
  en: {
    nav: { signIn: "Sign In", signUp: "Get Started Free" },
    hero: {
      badge: "AI-Powered Newsletter Platform",
      title1: "Create Stunning",
      titleHighlight: "AI Newsletters",
      title2: "in Minutes",
      subtitle: "The smartest way to create, manage, and send newsletters. AI generates your content automatically. You just set the topic and watch the magic happen.",
      cta: "Start Creating",
      ctaSecondary: "See How It Works",
    },
    features: {
      title: "Everything You Need",
      subtitle: "Powerful features to launch your newsletter empire",
      items: [
        { icon: "sparkles", title: "AI Content Generation", desc: "Choose your AI provider - OpenAI or Claude - and let it write compelling content automatically." },
        { icon: "send", title: "Automatic Delivery", desc: "Set daily or weekly frequency. We handle the scheduling and sending to all your subscribers." },
        { icon: "globe", title: "Public Landing Pages", desc: "Each newsletter gets a beautiful public page where anyone can subscribe with one click." },
        { icon: "chart", title: "Subscriber Analytics", desc: "Track your growth with subscriber counts, issue history, and delivery stats." },
        { icon: "zap", title: "Multiple Styles", desc: "Professional, casual, technical, or creative - pick the tone that fits your audience." },
        { icon: "mail", title: "Your Keys, Your Control", desc: "Bring your own AI API key. No hidden costs, no vendor lock-in, full transparency." },
      ]
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "Three simple steps to your AI-powered newsletter",
      steps: [
        { num: "01", title: "Create Your Newsletter", desc: "Pick a name, topic, frequency, and style. Add your AI API key." },
        { num: "02", title: "AI Generates Content", desc: "Our platform calls your chosen AI model to write each issue automatically." },
        { num: "03", title: "Delivered to Inboxes", desc: "Issues are sent to all subscribers on schedule. You sit back and grow." },
      ]
    },
    cta: {
      title: "Ready to Launch Your Newsletter?",
      subtitle: "Join creators who are using AI to build their audience effortlessly.",
      button: "Create Your Newsletter",
    },
    footer: { copyright: `\u00A9 ${new Date().getFullYear()} NewsAI. All rights reserved.` }
  },
  es: {
    nav: { signIn: "Iniciar Sesion", signUp: "Comenzar Gratis" },
    hero: {
      badge: "Plataforma de Newsletters con IA",
      title1: "Crea Newsletters",
      titleHighlight: "con IA",
      title2: "Impresionantes",
      subtitle: "La forma mas inteligente de crear, gestionar y enviar newsletters. La IA genera tu contenido automaticamente. Tu solo eliges el tema y la magia sucede.",
      cta: "Empezar a Crear",
      ctaSecondary: "Ver Como Funciona",
    },
    features: {
      title: "Todo lo que Necesitas",
      subtitle: "Funcionalidades poderosas para lanzar tu imperio de newsletters",
      items: [
        { icon: "sparkles", title: "Generacion con IA", desc: "Elige tu proveedor - OpenAI o Claude - y deja que escriba contenido atractivo automaticamente." },
        { icon: "send", title: "Envio Automatico", desc: "Configura frecuencia diaria o semanal. Nosotros manejamos la programacion y el envio." },
        { icon: "globe", title: "Landing Pages Publicas", desc: "Cada newsletter obtiene una pagina publica donde cualquiera puede suscribirse con un clic." },
        { icon: "chart", title: "Analiticas de Suscriptores", desc: "Rastrea tu crecimiento con conteos, historial de ediciones y estadisticas." },
        { icon: "zap", title: "Multiples Estilos", desc: "Profesional, casual, tecnico o creativo - elige el tono que se adapte a tu audiencia." },
        { icon: "mail", title: "Tus Keys, Tu Control", desc: "Usa tu propia API key de IA. Sin costos ocultos, sin dependencias, total transparencia." },
      ]
    },
    howItWorks: {
      title: "Como Funciona",
      subtitle: "Tres simples pasos para tu newsletter con IA",
      steps: [
        { num: "01", title: "Crea tu Newsletter", desc: "Elige nombre, tema, frecuencia y estilo. Agrega tu API key de IA." },
        { num: "02", title: "La IA Genera Contenido", desc: "Nuestra plataforma llama a tu modelo de IA para escribir cada edicion automaticamente." },
        { num: "03", title: "Entregado en Bandejas", desc: "Las ediciones se envian a todos los suscriptores en horario. Tu solo creces." },
      ]
    },
    cta: {
      title: "Listo para Lanzar tu Newsletter?",
      subtitle: "Unete a los creadores que usan IA para construir su audiencia sin esfuerzo.",
      button: "Crear mi Newsletter",
    },
    footer: { copyright: `\u00A9 ${new Date().getFullYear()} NewsAI. Todos los derechos reservados.` }
  }
};

type Lang = 'en' | 'es';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  sparkles: Sparkles,
  send: Send,
  globe: Globe,
  chart: BarChart3,
  zap: Zap,
  mail: Mail,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.4, 0.25, 1] }
  })
};

export default function Home() {
  const [lang, setLang] = useState<Lang>('es');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[lang];
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'es') setLang(saved);
    else setLang(navigator.language.startsWith('es') ? 'es' : 'en');
  }, []);

  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-xl shadow-lg border-b border-border' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                NewsAI
              </Link>
            </motion.div>

            <div className="hidden md:flex items-center space-x-2">
              <button onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
                className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary">
                {lang === 'en' ? 'ES' : 'EN'}
              </button>
              <ModeToggle />
              <Link href="/signin" className="text-foreground font-medium px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                {t.nav.signIn}
              </Link>
              <Link href="/signup" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25">
                {t.nav.signUp}
              </Link>
            </div>

            <div className="md:hidden flex items-center space-x-2">
              <button onClick={() => setLang(l => l === 'en' ? 'es' : 'en')} className="p-2 rounded-md text-muted-foreground hover:text-foreground">
                {lang === 'en' ? 'ES' : 'EN'}
              </button>
              <ModeToggle />
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-muted-foreground hover:text-foreground">
                {isMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border">
            <div className="px-4 py-3 space-y-2">
              <Link href="/signin" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-foreground hover:bg-accent">{t.nav.signIn}</Link>
              <Link href="/signup" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 text-center">{t.nav.signUp}</Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(120,119,198,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            {t.hero.badge}
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-8">
            {t.hero.title1}{' '}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 dark:from-violet-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              {t.hero.titleHighlight}
            </span>
            <br />{t.hero.title2}
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground mb-12">
            {t.hero.subtitle}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5">
              {t.hero.cta}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold rounded-xl border border-border bg-background/50 backdrop-blur-sm hover:bg-accent transition-colors">
              {t.hero.ctaSecondary}
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 sm:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {t.features.title}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.features.subtitle}
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.items.map((item, i) => {
              const Icon = iconMap[item.icon];
              return (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp} custom={i}
                  className="group relative p-6 rounded-2xl border border-border bg-card hover:bg-accent/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center mb-4 group-hover:from-violet-500/20 group-hover:to-indigo-500/20 transition-colors">
                    {Icon && <Icon className="w-6 h-6 text-violet-600 dark:text-violet-400" />}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 sm:py-32 relative bg-accent/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {t.howItWorks.title}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.howItWorks.subtitle}
            </motion.p>
          </motion.div>

          <div className="space-y-16">
            {t.howItWorks.steps.map((step, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp} custom={i}
                className="flex items-start gap-6 sm:gap-10">
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg shadow-violet-500/25">
                  {step.num}
                </div>
                <div className="pt-1 sm:pt-3">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-base sm:text-lg">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-32 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp} custom={0}
            className="p-10 sm:p-16 rounded-3xl border border-border bg-card/50 backdrop-blur-sm">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{t.cta.title}</h2>
            <p className="text-lg text-muted-foreground mb-8">{t.cta.subtitle}</p>
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5">
              {t.cta.button}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Social proof */}
      <section className="py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16 text-muted-foreground">
            {[
              { val: "100%", label: lang === 'es' ? 'Automatizado' : 'Automated' },
              { val: "2", label: lang === 'es' ? 'Proveedores IA' : 'AI Providers' },
              { val: '24/7', label: lang === 'es' ? 'Generacion Continua' : 'Always Running' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">{s.val}</div>
                <div className="text-sm mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">{t.footer.copyright}</div>
          <div className="flex items-center gap-4">
            <Link href="/signin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.signIn}</Link>
            <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.signUp}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
