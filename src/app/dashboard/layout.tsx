'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ModeToggle } from "@/components/mode-toggle";

const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  newsletter: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  plus: 'M12 4v16m8-8H4',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chevronLeft: 'M15 19l-7-7 7-7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M19 9l-7 7-7-7',
  notifications: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  payments: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
};

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface MenuItem {
  name: string;
  icon: keyof typeof ICONS;
  path: string;
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', icon: 'home', path: '/dashboard' },
  { name: 'Crear Newsletter', icon: 'plus', path: '/dashboard/newsletter/new' },
  { name: 'Ajustes', icon: 'settings', path: '/dashboard/settings' },
];

const getIconPath = (icon: keyof typeof ICONS): string => ICONS[icon] || '';

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().substring(0, 2);
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', role: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobileView(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const loadProfile = useCallback(async (token: string) => {
    setIsLoadingProfile(true);
    try {
      const storedUser = localStorage.getItem('user');
      let userData;

      if (storedUser) {
        userData = JSON.parse(storedUser);
        if (!userData.role) {
          const response = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Failed to load profile');
          userData = await response.json();
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } else {
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load profile');
        userData = await response.json();
        localStorage.setItem('user', JSON.stringify(userData));
      }

      const u = userData.user || userData;
      setProfile({
        name: u.name || '',
        email: u.email || '',
        role: u.role || 'user',
      });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/signin');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/signin');
    } else {
      loadProfile(token);
    }
  }, [router, loadProfile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileMenuOpen) {
        const profileMenu = document.getElementById('profile-menu');
        const profileButton = document.getElementById('profile-button');
        if (profileMenu && profileButton &&
          !profileMenu.contains(event.target as Node) &&
          !profileButton.contains(event.target as Node)) {
          setIsProfileMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/signin');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sidebar */}
      {!isMobileView && (
        <motion.aside
          initial={false}
          animate={{ width: isMenuExpanded ? 256 : 80 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="bg-card shadow-md fixed h-full z-40 flex flex-col border-r border-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border flex-shrink-0">
            <AnimatePresence>
              {isMenuExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 dark:to-blue-400 bg-clip-text text-transparent">
                    NewsletterAI
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center">
              {isMenuExpanded && <ModeToggle />}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors duration-200 ml-2"
              >
                <motion.svg
                  className="w-6 h-6"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  animate={{ rotate: isMenuExpanded ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(isMenuExpanded ? 'chevronLeft' : 'chevronRight')} />
                </motion.svg>
              </motion.button>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
            {menuItems.map((item) => (
              <div key={item.path} className="px-2">
                <Link
                  href={item.path}
                  className={`flex items-center px-4 py-2.5 mb-1 rounded-lg transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <svg className={`w-6 h-6 flex-shrink-0 ${isMenuExpanded ? 'mr-3' : ''} ${isActive(item.path) ? 'text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={getIconPath(item.icon)} />
                  </svg>
                  <AnimatePresence>
                    {isMenuExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.1 } }}
                        exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
                        className="flex-1 whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </div>
            ))}
          </nav>

          {/* User Profile */}
          <div className="mt-auto border-t border-border p-2">
            <div className="relative">
              <motion.button
                id="profile-button"
                whileHover={{ scale: isMenuExpanded ? 1.02 : 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`w-full flex items-center p-2 rounded-lg hover:bg-secondary transition-colors duration-200 ${isProfileMenuOpen ? 'bg-secondary' : ''}`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 dark:to-blue-400 flex items-center justify-center text-primary-foreground font-semibold text-sm overflow-hidden">
                  {isLoadingProfile ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    getInitials(profile.name)
                  )}
                </div>
                <AnimatePresence>
                  {isMenuExpanded && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.1 } }}
                      exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
                      className="ml-2 flex-1 text-left overflow-hidden whitespace-nowrap"
                    >
                      <p className="text-sm font-medium text-foreground truncate">{isLoadingProfile ? 'Cargando...' : profile.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{isLoadingProfile ? '' : profile.email}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    id="profile-menu"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-2 right-2 mb-2 w-auto min-w-[200px] bg-popover rounded-xl shadow-lg border border-border py-2 z-50"
                  >
                    {!isMenuExpanded && (
                      <div className="px-4 py-2 border-b border-border mb-1">
                        <p className="text-sm font-semibold text-popover-foreground truncate">{profile.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      </div>
                    )}
                    <Link
                      href="/dashboard/settings/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-secondary hover:text-foreground w-full text-left"
                    >
                      <svg className="w-5 h-5 mr-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('profile')} />
                      </svg>
                      Perfil
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-secondary hover:text-foreground w-full text-left"
                    >
                      <svg className="w-5 h-5 mr-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('settings')} />
                      </svg>
                      Ajustes
                    </Link>
                    <div className="border-t border-border my-1"></div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('logout')} />
                      </svg>
                      Cerrar Sesion
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${
        !isMobileView ? (isMenuExpanded ? 'ml-64' : 'ml-20') : 'ml-0 mb-16'
      } pt-16 bg-background flex-grow`}>
        <header className={`fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-md border-b border-border z-30 flex items-center px-6 ${
          !isMobileView ? (isMenuExpanded ? 'pl-72' : 'pl-28') : 'pl-6'
        }`}>
          {isMobileView && (
            <Link href="/dashboard" className="mr-4 text-lg font-bold bg-gradient-to-r from-primary to-blue-500 dark:to-blue-400 bg-clip-text text-transparent">
              NewsletterAI
            </Link>
          )}
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-foreground">
              {pathname === '/dashboard' ? 'Dashboard' :
               pathname.includes('/newsletter/new') ? 'Nuevo Newsletter' :
               pathname.includes('/issues') ? 'Ediciones' :
               pathname.includes('/subscribers') ? 'Suscriptores' :
               pathname.includes('/newsletter/') ? 'Detalle Newsletter' :
               'Dashboard'}
            </h1>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            {isMobileView && <ModeToggle />}
          </div>
        </header>

        <div className="p-6 min-h-screen">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        {isMobileView && (
          <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 h-16">
            <div className="grid grid-cols-4 h-full">
              {[
                { name: 'Dashboard', icon: 'home' as const, path: '/dashboard' },
                { name: 'Nuevo', icon: 'plus' as const, path: '/dashboard/newsletter/new' },
                { name: 'Ajustes', icon: 'settings' as const, path: '/dashboard/settings' },
                { name: 'Salir', icon: 'logout' as const, path: '#logout' },
              ].map((item) => (
                item.path === '#logout' ? (
                  <button
                    key={item.path}
                    onClick={handleSignOut}
                    className="flex flex-col items-center justify-center space-y-1 text-muted-foreground"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(item.icon)} />
                    </svg>
                    <span className="text-xs">{item.name}</span>
                  </button>
                ) : (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex flex-col items-center justify-center space-y-1 ${
                      isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(item.icon)} />
                    </svg>
                    <span className="text-xs">{item.name}</span>
                  </Link>
                )
              ))}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
