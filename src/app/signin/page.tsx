'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { ModeToggle } from '@/components/mode-toggle';

// Simplified translations for generic login page
const translations = {
  en: {
    title: "Welcome Back",
    subtitle: "Don't have an account?",
    signUp: "Sign up",
    email: "Email address",
    password: "Password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    signingIn: "Signing in...",
    or: "Or continue with",
    google: "Continue with Google",
    errorLogin: "Error signing in",
    googleError: "Error signing in with Google",
    brandName: "SaaS Starter"
  },
  es: {
    title: "Bienvenido de Nuevo",
    subtitle: "¿No tienes una cuenta?",
    signUp: "Regístrate",
    email: "Correo electrónico",
    password: "Contraseña",
    rememberMe: "Recordarme",
    forgotPassword: "¿Olvidaste tu contraseña?",
    signIn: "Iniciar sesión",
    signingIn: "Iniciando sesión...",
    or: "O continúa con",
    google: "Continuar con Google",
    errorLogin: "Error al iniciar sesión",
    googleError: "Error al iniciar sesión con Google",
    brandName: "SaaS Starter"
  }
};

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface ServerResponse {
  token: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  error?: string;
}

export default function SignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [lang, setLang] = useState<'en' | 'es'>('es'); // Default to Spanish

  // Language detection effect (similar to Home page)
  useEffect(() => {
    const savedLang = localStorage.getItem('lang');
    if (savedLang === 'en' || savedLang === 'es') {
      setLang(savedLang);
    }
    // No need for browser detection here, keep it simple or sync with Home
  }, []);

  const t = translations[lang];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setRememberMe(checked);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Replace with your actual sign-in API endpoint
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: ServerResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.errorLogin);
      }

      // Guardar el token en localStorage
      localStorage.setItem('token', data.token);
      
      // Guardar el usuario en localStorage si existe
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Usuario guardado en localStorage:', data.user);
      }
      
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : t.errorLogin);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      if (!credentialResponse.credential) {
        throw new Error(t.googleError);
      }

      // Replace with your actual Google sign-in API endpoint
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data: ServerResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.googleError);
      }

      // Guardar el token en localStorage
      localStorage.setItem('token', data.token);
      
      // Guardar el usuario en localStorage si existe
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Usuario guardado en localStorage:', data.user);
      }
      
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Google login error:', err);
      setError(err instanceof Error ? err.message : t.googleError);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(t.googleError);
    setIsLoading(false); // Ensure loading state is reset
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative">
        {/* ModeToggle Button in top-right corner */}
        <div className="absolute top-4 right-4">
            <ModeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 border border-border relative overflow-hidden"
        >
           {/* Optional: Add a top color bar */}
           <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-blue-500 dark:to-blue-400"></div>

          <div className="text-center mb-8 mt-4"> { /* Added mt-4 */}
            <Link href="/" className="inline-block mb-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 dark:to-blue-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                {t.brandName}
              </h1>
            </Link>
            <h2 className="text-2xl font-semibold text-card-foreground">
              {t.title}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t.subtitle}{' '}
              <Link
                href="/signup"
                className="font-medium text-primary hover:text-primary/90 hover:underline"
              >
                {t.signUp}
              </Link>
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-1">
                {t.email}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className="block w-full px-4 py-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-primary transition duration-150 ease-in-out"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-1">
                {t.password}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                className="block w-full px-4 py-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-primary transition duration-150 ease-in-out"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-muted-foreground">
                  {t.rememberMe}
                </label>
              </div>
              <Link
                href="/forgot-password" // Make sure this route exists or remove
                className="text-sm font-medium text-primary hover:text-primary/90 hover:underline"
              >
                {t.forgotPassword}
              </Link>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-300 shadow-sm hover:shadow-md ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground !important" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-primary-foreground !important">{t.signingIn}</span>
                </>
              ) : (
                <span className="text-primary-foreground !important">{t.signIn}</span>
              )}
            </motion.button>

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">
                      {t.or}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    locale={lang}
                    width="320px"
                    logo_alignment="left"
                  />
                </div>
              </>
            )}
          </form>
        </motion.div>
      </div>
    </GoogleOAuthProvider>
  );
} 