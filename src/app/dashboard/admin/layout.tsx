'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ModeToggle } from "@/components/mode-toggle";
import PeriodSelector from "@/components/PeriodSelector";

const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chevronLeft: 'M15 19l-7-7 7-7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M19 9l-7 7-7-7',
  analytics: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  docs: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
};

interface MenuItem {
  name: string;
  icon: keyof typeof ICONS | string;
  path: string;
  submenu?: MenuItem[];
}

const adminMenuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    icon: 'home',
    path: '/dashboard/admin'
  },
  {
    name: 'Cap Table',
    icon: 'chart',
    path: '/dashboard/admin/cap-table'
  },
  {
    name: 'Data Room',
    icon: 'docs',
    path: '/dashboard/admin/documents',
    submenu: [
      { name: 'Todos', icon: 'docs', path: '/dashboard/admin/documents' },
      { name: 'Legal', icon: 'docs', path: '/dashboard/admin/documents?folder=legal' },
      { name: 'Financieros', icon: 'docs', path: '/dashboard/admin/documents?folder=financials' },
      { name: 'Board Materials', icon: 'docs', path: '/dashboard/admin/documents?folder=board_materials' },
      { name: 'Pitch Deck', icon: 'docs', path: '/dashboard/admin/documents?folder=pitch_deck' },
    ]
  },
  {
    name: 'Monthly Updates',
    icon: 'calendar',
    path: '/dashboard/admin/updates'
  },
  {
    name: 'Métricas',
    icon: 'analytics',
    path: '/dashboard/admin/metrics'
  },
  {
    name: 'Estadísticas',
    icon: 'analytics',
    path: '/dashboard/admin/statistics'
  },
  {
    name: 'Usuarios',
    icon: 'users',
    path: '/dashboard/admin/users',
    submenu: [
      { name: 'Gestión de Usuarios', icon: 'users', path: '/dashboard/admin/users' },
      { name: 'Roles y Permisos', icon: 'settings', path: '/dashboard/admin/roles' },
    ]
  },
  {
    name: 'Ajustes',
    icon: 'settings',
    path: '/dashboard/admin/profile',
    submenu: [
      { name: 'Perfil', icon: 'profile', path: '/dashboard/admin/profile' },
    ]
  }
];

const getIconPath = (icon: keyof typeof ICONS | string): string => {
  return ICONS[icon as keyof typeof ICONS] || icon;
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.split(' ').map(word => word[0]).filter(Boolean).join('').toUpperCase().substring(0, 2);
};

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeSubmenus, setActiveSubmenus] = useState<string[]>([]);
  const [profile, setProfile] = useState({ name: '', email: '', role: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Detector de tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsMenuExpanded(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/signin');
        return;
      }

      try {
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load profile');
        const userData = await response.json();
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || 'founder'
        });
      } catch (error) {
        console.error('Error loading profile:', error);
        localStorage.removeItem('token');
        router.push('/signin');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/signin');
  };

  const toggleSubmenu = (path: string) => {
    setActiveSubmenus(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const isMenuItemActive = (itemPath: string) => {
    return pathname === itemPath || (activeSubmenus.includes(itemPath) && pathname.startsWith(itemPath));
  };

  // Seleccionar items principales para mobile (máximo 5)
  const mobileMenuItems = adminMenuItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - ocultar en mobile */}
      {!isMobileView && (
        <motion.aside
          initial={false}
          animate={{ width: isMenuExpanded ? 256 : 80 }}
          transition={{ duration: 0.3 }}
          className="bg-card shadow-md fixed h-full z-40 flex flex-col border-r border-border"
        >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <AnimatePresence>
            {isMenuExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden whitespace-nowrap flex items-center"
              >
                <Link href="/dashboard/admin" className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                  CapFlow Admin
                </Link>
                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                  {profile.role === 'founder' ? 'Founder' : 'Admin'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            {isMenuExpanded && (
              <ModeToggle />
            )}
            <button
              onClick={() => setIsMenuExpanded(!isMenuExpanded)}
              className="p-2 rounded-lg hover:bg-secondary ml-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(isMenuExpanded ? 'chevronLeft' : 'chevronRight')} />
              </svg>
            </button>
          </div>
        </div>

        {/* Period Selector - Desktop only */}
        {isMenuExpanded && (
          <div className="hidden md:block px-4 pt-4 pb-2 border-b border-border">
            <PeriodSelector />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {adminMenuItems.map((item) => (
            <div key={item.path} className="px-2">
              <div
                onClick={() => item.submenu ? toggleSubmenu(item.path) : router.push(item.path)}
                className={`flex items-center px-4 py-2.5 mb-1 rounded-lg cursor-pointer ${
                  isMenuItemActive(item.path)
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={getIconPath(item.icon)} />
                </svg>
                <AnimatePresence>
                  {isMenuExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.submenu && isMenuExpanded && (
                  <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('chevronDown')} />
                  </svg>
                )}
              </div>
              {item.submenu && isMenuExpanded && activeSubmenus.includes(item.path) && (
                <div className="ml-6 mt-1 space-y-1 border-l border-border pl-4">
                  {item.submenu.map((subItem) => (
                    <Link
                      key={subItem.path}
                      href={subItem.path}
                      className={`flex items-center px-3 py-2 rounded-md text-sm ${
                        pathname === subItem.path
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(subItem.icon)} />
                      </svg>
                      <span>{subItem.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Profile Section */}
        <div className="border-t border-border p-2">
          <div className="relative z-10">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full flex items-center p-2 rounded-lg hover:bg-secondary"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                {isLoadingProfile ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  getInitials(profile.name)
                )}
              </div>
              {isMenuExpanded && (
                <div className="ml-2 flex-1 text-left">
                  <p className="text-sm font-medium truncate">{profile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </div>
              )}
            </button>
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-2 right-2 mb-2 w-auto min-w-[200px] bg-popover rounded-xl shadow-lg border border-border py-2 z-50"
                  role="menu"
                >
                  {!isMenuExpanded && (
                    <div className="px-4 py-2 border-b border-border mb-1">
                      <p className="text-sm font-semibold text-popover-foreground truncate">{profile.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      <div className={`mt-1 px-2 py-0.5 rounded text-xs font-medium inline-block ${
                        profile.role === 'founder' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        profile.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {profile.role === 'founder' ? 'Founder' : 'Admin'}
                      </div>
                    </div>
                  )}
                  <Link
                    href="/dashboard/admin/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-secondary hover:text-foreground w-full text-left"
                    role="menuitem"
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
                    role="menuitem"
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
                    role="menuitem"
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('logout')} />
                    </svg>
                    Cerrar Sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${
        !isMobileView ? (isMenuExpanded ? 'ml-64' : 'ml-20') : 'ml-0 mb-16'
      }`}>
        {/* Mobile Header */}
        {isMobileView && (
          <header className="fixed top-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4 shadow-sm safe-area-top">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-secondary active:bg-secondary/80 transition-colors touch-manipulation"
                aria-label="Menú"
                aria-expanded={isMobileMenuOpen}
              >
                <motion.svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={isMobileMenuOpen ? { rotate: 90 } : { rotate: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </motion.svg>
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent truncate">
                  CapFlow
                </h1>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-[10px] font-semibold whitespace-nowrap">
                  {profile.role === 'founder' ? 'Founder' : 'Admin'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PeriodSelector />
              <ModeToggle />
            </div>
          </header>
        )}

        {/* Mobile Menu Drawer */}
        {isMobileView && (
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                {/* Drawer */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card shadow-2xl z-50 flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header del drawer con perfil */}
                  <div className="p-5 border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-primary/20">
                          {isLoadingProfile ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            getInitials(profile.name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate text-base">{profile.name || 'Usuario'}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email || 'Cargando...'}</p>
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-[10px] font-semibold">
                            {profile.role === 'founder' ? 'Founder' : 'Admin'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-lg hover:bg-secondary/80 active:bg-secondary transition-colors touch-manipulation ml-2"
                        aria-label="Cerrar menú"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Navigation Menu */}
                  <nav className="flex-1 overflow-y-auto py-3 px-2">
                    <div className="space-y-1">
                      {adminMenuItems.map((item, index) => (
                        <motion.div
                          key={item.path}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div
                            onClick={() => {
                              if (item.submenu) {
                                toggleSubmenu(item.path);
                              } else {
                                router.push(item.path);
                                setIsMobileMenuOpen(false);
                              }
                            }}
                            className={`flex items-center px-4 py-3.5 rounded-xl cursor-pointer transition-all mb-1.5 active:scale-[0.98] touch-manipulation ${
                              isMenuItemActive(item.path)
                                ? 'bg-primary/15 text-primary font-semibold shadow-sm'
                                : 'text-foreground hover:bg-secondary/80 active:bg-secondary'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                              isMenuItemActive(item.path)
                                ? 'bg-primary/20'
                                : 'bg-muted'
                            }`}>
                              <svg className={`w-5 h-5 ${isMenuItemActive(item.path) ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(item.icon)} />
                              </svg>
                            </div>
                            <span className="flex-1 font-medium">{item.name}</span>
                            {item.submenu && (
                              <motion.svg 
                                className="w-4 h-4 text-muted-foreground"
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                animate={{ rotate: activeSubmenus.includes(item.path) ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('chevronDown')} />
                              </motion.svg>
                            )}
                          </div>
                          <AnimatePresence>
                            {item.submenu && activeSubmenus.includes(item.path) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-4 mt-1 mb-2 space-y-1 border-l-2 border-primary/30 pl-4 overflow-hidden"
                              >
                                {item.submenu.map((subItem) => (
                                  <Link
                                    key={subItem.path}
                                    href={subItem.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all active:scale-[0.98] touch-manipulation ${
                                      pathname === subItem.path
                                        ? 'bg-primary/15 text-primary font-semibold'
                                        : 'text-muted-foreground hover:bg-secondary/80 active:bg-secondary'
                                    }`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 ${
                                      pathname === subItem.path
                                        ? 'bg-primary/20'
                                        : 'bg-muted/50'
                                    }`}>
                                      <svg className={`w-4 h-4 ${pathname === subItem.path ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(subItem.icon)} />
                                      </svg>
                                    </div>
                                    <span>{subItem.name}</span>
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </nav>

                  {/* Footer con Perfil y Cerrar Sesión */}
                  <div className="border-t border-border p-4 bg-muted/30 space-y-2">
                    <Link
                      href="/dashboard/admin/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center px-4 py-3 rounded-xl hover:bg-secondary/80 active:bg-secondary transition-all active:scale-[0.98] touch-manipulation"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('profile')} />
                        </svg>
                      </div>
                      <span className="font-medium text-foreground">Mi Perfil</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center w-full px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-all active:scale-[0.98] touch-manipulation"
                    >
                      <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('logout')} />
                        </svg>
                      </div>
                      <span className="font-medium">Cerrar Sesión</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        )}

        <div className={`p-6 ${isMobileView ? 'pt-24' : ''}`}>
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobileView && (
          <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 h-16 safe-area-bottom">
            <div className="grid grid-cols-5 h-full">
              {mobileMenuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                    isMenuItemActive(item.path)
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(item.icon)} />
                  </svg>
                  <span className="text-[10px] font-medium">{item.name}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}

