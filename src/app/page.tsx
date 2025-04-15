'use client';

import { motion } from 'framer-motion';
import Link from "next/link";
import { useState, useEffect } from 'react';
import { ModeToggle } from "@/components/mode-toggle";

// Simplified translation structure for generic content
interface Translation {
  nav: {
    signIn: string;
    signUp: string;
  };
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  footer: {
    copyright: string;
  };
}

type LanguageKey = 'en' | 'es';

interface Translations {
  en: Translation;
  es: Translation;
}

const translations: Translations = {
  en: {
    nav: {
      signIn: "Sign In",
      signUp: "Sign Up"
    },
    hero: {
      title: "Your Next SaaS Starts Here",
      subtitle: "This is a generic landing page template. Customize it for your project.",
      cta: "Get Started"
    },
    footer: {
      copyright: `© ${new Date().getFullYear()} Your Company. All rights reserved.`
    }
  },
  es: {
    nav: {
      signIn: "Iniciar Sesión",
      signUp: "Registrarse"
    },
    hero: {
      title: "Tu Próximo SaaS Comienza Aquí",
      subtitle: "Esta es una plantilla genérica de página de inicio. Personalízala para tu proyecto.",
        cta: "Comenzar"
    },
    footer: {
      copyright: `© ${new Date().getFullYear()} Tu Compañía. Todos los derechos reservados.`
    }
  }
};

export default function Home() {
  const [lang, setLang] = useState<LanguageKey>('es'); // Default to Spanish
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[lang];

  // Detect scroll to change navbar style
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Detect language from localStorage or browser preferences
  useEffect(() => {
    const savedLang = localStorage.getItem('lang');
    if (savedLang === 'en' || savedLang === 'es') {
      setLang(savedLang);
    } else {
      // Basic browser language detection (can be improved)
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'es') {
        setLang('es');
      } else {
        setLang('en'); // Default to English if not Spanish
      }
    }
  }, []);

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prevLang => prevLang === 'en' ? 'es' : 'en');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-card/90 dark:bg-card/80 backdrop-blur-md shadow-lg py-2 border-b border-border' : 'bg-transparent py-4'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand Name */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-shrink-0"
            >
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 dark:to-blue-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                SaaS Starter
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {/* Language Switcher */}
                <button 
                onClick={toggleLanguage}
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors duration-300 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                <span>{lang === 'en' ? 'Español' : 'English'}</span>
                </button>

              {/* Mode Toggle */}
              <ModeToggle />

              {/* Auth Buttons */}
              <Link 
                href="/signin" 
                className="text-foreground font-medium px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
              >
                {t.nav.signIn}
              </Link>
              <Link 
                href="/signup" 
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200 shadow-sm hover:shadow-md"
              >
                <span className="text-primary-foreground !important">{t.nav.signUp}</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
               <button
                onClick={toggleLanguage}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
                aria-label="Toggle Language"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              </button>
               {/* Mode Toggle Mobile */}
               <ModeToggle />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
                aria-controls="mobile-menu"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                <motion.div
                  animate={isMenuOpen ? "open" : "closed"}
                  variants={{
                    open: { rotate: 90 },
                    closed: { rotate: 0 }
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {isMenuOpen ? (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </motion.div>
              </button>
            </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <motion.div
          id="mobile-menu"
            initial="closed"
            animate={isMenuOpen ? "open" : "closed"}
            variants={{
            open: { opacity: 1, height: "auto", transition: { duration: 0.3 } },
            closed: { opacity: 0, height: 0, transition: { duration: 0.3 } }
          }}
          className="md:hidden overflow-hidden bg-card/95 dark:bg-card/90 backdrop-blur-lg shadow-md border-t border-border"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <Link 
                  href="/signin" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-accent-foreground hover:bg-accent"
                >
                  {t.nav.signIn}
                </Link>
                <Link 
                  href="/signup" 
                   onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-primary-foreground !important bg-primary hover:bg-primary/90"
                >
                  {t.nav.signUp}
                </Link>
            </div>
          </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center text-center px-4 pt-32 pb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Optional: Subtle background glow */}
          <div className="absolute -inset-40 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 blur-3xl opacity-30 dark:opacity-20"></div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
            {t.hero.title}
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground mb-10">
            {t.hero.subtitle}
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md bg-primary hover:bg-primary/90 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <span className="text-primary-foreground !important">{t.hero.cta}</span>
              <svg className="ml-2 -mr-1 h-5 w-5 text-primary-foreground !important" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </motion.div>
          </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
              {t.footer.copyright}
        </div>
      </footer>
    </div>
  );
}
