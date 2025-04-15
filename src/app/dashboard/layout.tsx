'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ModeToggle } from "@/components/mode-toggle";

// Generic Icons (using Heroicons outline paths)
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
  customers: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  tasks: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  payments: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  notifications: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  integrations: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
  docs: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  meetings: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
};

interface MenuItem {
  name: string;
  icon: keyof typeof ICONS | string; // Can be key or SVG path string
  path: string;
  submenu?: MenuItem[];
}

interface UserProfile {
  name: string;
  email: string;
  role: string; // Añadimos role para controlar los permisos
  // avatar?: string; // Removed for simplicity
}

// Menús para diferentes roles de usuario
const adminMenuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    icon: 'home',
    path: '/dashboard'
  },
  {
    name: 'Analytics',
    icon: 'analytics',
    path: '/dashboard/analytics'
  },
  {
    name: 'Administración',
    icon: 'users',
    path: '/dashboard/admin',
    submenu: [
      {
        name: 'Usuarios',
        icon: 'users',
        path: '/dashboard/admin/users'
      },
      {
        name: 'Roles y Permisos',
        icon: 'settings',
        path: '/dashboard/admin/roles'
      }
    ]
  },
  {
    name: 'Clientes',
    icon: 'customers',
    path: '/dashboard/customers',
    submenu: [
      {
        name: 'Lista de Clientes',
        icon: 'users',
        path: '/dashboard/customers/list'
      },
      {
        name: 'Segmentos',
        icon: 'users',
        path: '/dashboard/customers/segments'
      }
    ]
  },
  {
    name: 'Pagos',
    icon: 'payments',
    path: '/dashboard/payments',
    submenu: [
      {
        name: 'Facturas',
        icon: 'payments',
        path: '/dashboard/payments/invoices'
      },
      {
        name: 'Suscripciones',
        icon: 'payments',
        path: '/dashboard/payments/subscriptions'
      }
    ]
  },
  {
    name: 'Tareas',
    icon: 'tasks',
    path: '/dashboard/tasks'
  },
  {
    name: 'Calendario',
    icon: 'calendar',
    path: '/dashboard/calendar'
  },
  {
    name: 'Reuniones',
    icon: 'meetings',
    path: '/dashboard/meetings'
  },
  {
    name: 'Integraciones',
    icon: 'integrations',
    path: '/dashboard/integrations'
  },
  {
    name: 'Documentación',
    icon: 'docs',
    path: '/dashboard/docs'
  },
  {
    name: 'Soporte',
    icon: 'help',
    path: '/dashboard/support'
  },
  {
    name: 'Ajustes',
    icon: 'settings',
    path: '/dashboard/settings',
    submenu: [
      {
        name: 'Perfil',
        icon: 'profile',
        path: '/dashboard/settings/profile'
      },
      {
        name: 'Notificaciones',
        icon: 'notifications',
        path: '/dashboard/settings/notifications'
      },
      {
        name: 'Equipo',
        icon: 'users',
        path: '/dashboard/settings/team'
      },
      {
        name: 'Facturación',
        icon: 'payments',
        path: '/dashboard/settings/billing'
      },
    ]
  }
];

// Menú para usuarios regulares (sin acceso a gestión de usuarios)
const regularUserMenuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    icon: 'home',
    path: '/dashboard/user'  // Dashboard específico para usuarios normales
  },
  {
    name: 'Tareas',
    icon: 'tasks',
    path: '/dashboard/tasks'
  },
  {
    name: 'Calendario',
    icon: 'calendar',
    path: '/dashboard/calendar'
  },
  {
    name: 'Reuniones',
    icon: 'meetings',
    path: '/dashboard/meetings'
  },
  {
    name: 'Documentación',
    icon: 'docs',
    path: '/dashboard/docs'
  },
  {
    name: 'Soporte',
    icon: 'help',
    path: '/dashboard/support'
  },
  {
    name: 'Ajustes',
    icon: 'settings',
    path: '/dashboard/settings',
    submenu: [
      {
        name: 'Perfil',
        icon: 'profile',
        path: '/dashboard/settings/profile'
      },
      {
        name: 'Notificaciones',
        icon: 'notifications',
        path: '/dashboard/settings/notifications'
      }
    ]
  }
];

// Cliente de SaaS
const clientMenuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    icon: 'home',
    path: '/dashboard/client'  // Dashboard específico para clientes
  },
  {
    name: 'Analytics',
    icon: 'analytics',
    path: '/dashboard/analytics'
  },
  {
    name: 'Pagos',
    icon: 'payments',
    path: '/dashboard/payments',
    submenu: [
      {
        name: 'Facturas',
        icon: 'payments',
        path: '/dashboard/payments/invoices'
      },
      {
        name: 'Suscripciones',
        icon: 'payments',
        path: '/dashboard/payments/subscriptions'
      }
    ]
  },
  {
    name: 'Soporte',
    icon: 'help',
    path: '/dashboard/support'
  },
  {
    name: 'Ajustes',
    icon: 'settings',
    path: '/dashboard/settings',
    submenu: [
      {
        name: 'Perfil',
        icon: 'profile',
        path: '/dashboard/settings/profile'
      },
      {
        name: 'Facturación',
        icon: 'payments',
        path: '/dashboard/settings/billing'
      },
    ]
  }
];

// Utility to get icon path string
const getIconPath = (icon: keyof typeof ICONS | string): string => {
  return ICONS[icon as keyof typeof ICONS] || icon;
};

// Utility to get initials
const getInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeSubmenus, setActiveSubmenus] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', role: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Estado para almacenar los menús según el rol del usuario
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Agregar estado para control de menú móvil
  const [isMobileView, setIsMobileView] = useState(false);

  // Detector de tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Seleccionar ítems para mostrar en el menú móvil (los más importantes)
  const mobileMenuItems = menuItems.slice(0, 5);

  // Fetch user profile logic (simplified)
  const loadProfile = useCallback(async (token: string) => {
    setIsLoadingProfile(true);
    try {
      // Intentar obtener el usuario del localStorage primero
      const storedUser = localStorage.getItem('user');
      let userData;
      let needsFreshData = false;
      
      if (storedUser) {
        // Si tenemos el usuario en localStorage, verificamos si tiene todos los campos necesarios
        userData = JSON.parse(storedUser);
        console.log('Datos de usuario en localStorage:', userData);
        
        // Verificar si tiene todos los campos importantes
        if (!userData.role || userData.role === undefined) {
          console.log('Rol no encontrado en localStorage, obteniendo datos frescos');
          needsFreshData = true;
        }
      } else {
        // Si no hay datos en localStorage, necesitamos obtener datos frescos
        needsFreshData = true;
      }
      
      // Si necesitamos datos frescos o faltan campos importantes, hacemos petición al API
      if (needsFreshData) {
        console.log('Obteniendo datos de usuario desde API...');
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load profile');
        userData = await response.json();
        console.log('Usuario cargado desde API:', userData);
        
        // Actualizar localStorage con datos completos
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      // Verificar estructuras de datos posibles y extraer el rol y plan de suscripción
      let name, email, role, subscriptionPlan, subscriptionStatus;
      
      if (userData.user) {
        // Si la respuesta tiene un objeto user anidado
        name = userData.user.name || '';
        email = userData.user.email || '';
        role = userData.user.role || 'user';
        subscriptionPlan = userData.user.subscriptionPlan || 'free';
        subscriptionStatus = userData.user.subscriptionStatus || 'none';
      } else {
        // Si la respuesta es el objeto de usuario directamente
        name = userData.name || '';
        email = userData.email || '';
        role = userData.role || 'user';
        subscriptionPlan = userData.subscriptionPlan || 'free';
        subscriptionStatus = userData.subscriptionStatus || 'none';
      }
      
      console.log('Nombre detectado:', name);
      console.log('Email detectado:', email);
      console.log('Rol detectado:', role);
      console.log('Plan de suscripción:', subscriptionPlan);
      console.log('Estado de suscripción:', subscriptionStatus);
      
      // Determinar el tipo efectivo de usuario basado en rol y suscripción
      let effectiveRole = role;
      
      // Si el usuario tiene un plan premium y suscripción activa, tratarlo como cliente
      // PERO solo si no es admin (los admin mantienen su rol independientemente de la suscripción)
      if (role !== 'admin' && subscriptionPlan !== 'free' && subscriptionStatus === 'active') {
        console.log('Usuario con suscripción activa, tratando como cliente');
        effectiveRole = 'client';
      }
      
      // Guardar perfil con rol incluido
      setProfile({ 
        name, 
        email,
        role: effectiveRole // Usar el rol efectivo
      });
      
      // Asignar menú según el rol efectivo del usuario
      if (effectiveRole === 'admin') {
        console.log('Rol efectivo: Administrador');
        setMenuItems(adminMenuItems);
        
        // Si está en la ruta de usuario o cliente y es admin, redirigir al dashboard admin
        if (pathname === '/dashboard/user' || pathname === '/dashboard/client') {
          console.log('Redirigiendo a /dashboard');
          router.push('/dashboard');
        }
      } else if (effectiveRole === 'client') {
        console.log('Rol efectivo: Cliente (con suscripción)');
        setMenuItems(clientMenuItems);
        
        // Si está en otra ruta que no corresponde a cliente, redirigir al dashboard de cliente
        if (pathname === '/dashboard' || pathname === '/dashboard/user') {
          console.log('Redirigiendo a /dashboard/client');
          router.push('/dashboard/client');
        }
      } else {
        console.log('Rol efectivo: Usuario Regular');
        setMenuItems(regularUserMenuItems);
        
        // Si está en otra ruta que no corresponde a usuario regular, redirigir al dashboard de usuario
        if (pathname === '/dashboard' || pathname === '/dashboard/client') {
          console.log('Redirigiendo a /dashboard/user');
          router.push('/dashboard/user');
        }
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      localStorage.removeItem('token'); // Log out on error
      localStorage.removeItem('user'); // Also remove user
      router.push('/signin');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [router, pathname]);

  // Authentication check and profile loading effect
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/signin');
    } else {
      loadProfile(token);
    }
  }, [router, loadProfile]);

  // Effect to manage active submenus based on current path
  useEffect(() => {
    const activeParent = menuItems.find(item => item.submenu && pathname.startsWith(item.path));
    if (activeParent) {
      setActiveSubmenus(prev => prev.includes(activeParent.path) ? prev : [...prev, activeParent.path]);
    } // Keep submenu open if currently active
  }, [pathname, menuItems]);

  // Effect to close profile menu on outside click
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

  const toggleSubmenu = (path: string) => {
    setActiveSubmenus(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const isMenuItemActive = (itemPath: string) => {
     // Exact match for parent items, startsWith for submenus
    return pathname === itemPath || (menuItems.some(item => item.submenu && item.path === itemPath) && pathname.startsWith(itemPath));
  };

   const isSubmenuItemActive = (subItemPath: string) => {
    return pathname === subItemPath;
  };

  // Use effect para actualizar rutas activas
  useEffect(() => {
    // Encuentra la ruta activa para resaltar el menú correspondiente
    const pathWithoutDashboard = pathname.replace('/dashboard', '');
    const currentPath = pathWithoutDashboard === '' ? '/' : pathWithoutDashboard;
    
    // Actualiza los items con la ruta activa
    setActiveSubmenus(prev => prev.includes(currentPath) ? prev : [...prev, currentPath]);
    
    // Opcionalmente, deselecciona submenús cuando la ruta principal cambia
  }, [pathname, menuItems]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sidebar - ocultar en móvil */}
      {!isMobileView && (
        <motion.aside
          initial={false}
          animate={{ width: isMenuExpanded ? 256 : 80 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="bg-card shadow-md fixed h-full z-40 flex flex-col border-r border-border"
        >
          {/* Header: Logo, Toggle Button, Mode Toggle */}
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
                   <Link href={profile.role === 'admin' ? '/dashboard' : profile.role === 'client' ? '/dashboard/client' : '/dashboard/user'} className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 dark:to-blue-400 bg-clip-text text-transparent">
                     SaaS Starter
                   </Link>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Mostrar badge de rol si está expandido */}
            {isMenuExpanded && (
              <div className={`px-2 py-1 rounded-md text-xs font-medium mr-1 ${
                profile.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                profile.role === 'client' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {profile.role === 'admin' ? 'Admin' : 
                 profile.role === 'client' ? 'Cliente' : 'Usuario'}
              </div>
            )}
            
            <div className="flex items-center">
               {isMenuExpanded && <ModeToggle />}
               <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors duration-200 ml-2"
                  aria-label={isMenuExpanded ? "Collapse menu" : "Expand menu"}
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

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
            {menuItems.map((item) => (
              <div key={item.path} className="px-2">
                 {/* Menu Item Link or Submenu Toggle */}
                <div
                  onClick={() => item.submenu ? toggleSubmenu(item.path) : router.push(item.path)}
                  className={`flex items-center px-4 py-2.5 mb-1 rounded-lg transition-colors duration-200 cursor-pointer ${
                    isMenuItemActive(item.path)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                  role="button"
                  aria-expanded={item.submenu ? activeSubmenus.includes(item.path) : undefined}
                >
                   <svg className={`w-6 h-6 flex-shrink-0 mr-3 ${isMenuItemActive(item.path) ? 'text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  {item.submenu && isMenuExpanded && (
                    <motion.div
                        animate={{ rotate: activeSubmenus.includes(item.path) ? 0 : -90 }}
                        transition={{ duration: 0.2 }}
                        className="ml-auto"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('chevronDown')} />
                      </svg>
                    </motion.div>
                  )}
                </div>

                {/* Submenu */}
                <AnimatePresence>
                 {item.submenu && isMenuExpanded && activeSubmenus.includes(item.path) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-6 mt-1 space-y-1 overflow-hidden border-l border-border pl-4"
                    >
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          href={subItem.path}
                          className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                             isSubmenuItemActive(subItem.path)
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                           <svg className={`w-5 h-5 mr-2.5 flex-shrink-0 ${isSubmenuItemActive(subItem.path) ? 'text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(subItem.icon)} />
                           </svg>
                           <span>{subItem.name}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="mt-auto border-t border-border p-2">
            <div className="relative">
              <motion.button
                id="profile-button"
                whileHover={{ scale: isMenuExpanded ? 1.02 : 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`w-full flex items-center p-2 rounded-lg hover:bg-secondary transition-colors duration-200 group ${isProfileMenuOpen ? 'bg-secondary' : ''}`}
                aria-haspopup="true"
                aria-expanded={isProfileMenuOpen}
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
                      <p className="text-sm font-medium text-foreground truncate">
                        {isLoadingProfile ? 'Loading...' : profile.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                         {isLoadingProfile ? '' : profile.email}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                 {isMenuExpanded && (
                      <motion.svg className="w-5 h-5 text-muted-foreground ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" animate={{ rotate: isProfileMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('chevronDown')} />
                      </motion.svg>
                  )}
              </motion.button>

               {/* Profile Dropdown Menu */}
              <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  id="profile-menu"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute bottom-full left-2 right-2 mb-2 w-auto min-w-[200px] bg-popover rounded-xl shadow-lg border border-border py-2 z-50`}
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="profile-button"
                >
                   {!isMenuExpanded && (
                      <div className="px-4 py-2 border-b border-border mb-1">
                         <p className="text-sm font-semibold text-popover-foreground truncate">{profile.name}</p>
                         <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                         <div className={`mt-1 px-2 py-0.5 rounded text-xs font-medium inline-block ${
                            profile.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            profile.role === 'client' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                            {profile.role === 'admin' ? 'Admin' : 
                             profile.role === 'client' ? 'Cliente' : 'Usuario'}
                        </div>
                      </div>
                   )}
                    <Link
                      href="/dashboard/settings/profile"
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

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${
        !isMobileView ? (isMenuExpanded ? 'ml-64' : 'ml-20') : 'ml-0 mb-16'
      } ${isMobileView ? 'pt-16' : 'pt-16'} bg-background flex-grow`}>
        <header className={`fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-md border-b border-border z-30 flex items-center px-6 ${
            !isMobileView 
              ? (isMenuExpanded ? 'pl-72' : 'pl-28')
              : 'pl-6' /* Adjust padding based on sidebar */
          }`}>
            {/* Mobile Header with Menu Button */}
            {isMobileView && (
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="mr-4 p-2 rounded-full hover:bg-secondary"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 dark:to-blue-400 flex items-center justify-center text-primary-foreground font-semibold text-sm overflow-hidden">
                  {isLoadingProfile ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    getInitials(profile.name)
                  )}
                </div>
              </button>
            )}
            
            {/* Header Title */}
            <div className="flex items-center">
                <h1 className="text-xl font-semibold text-foreground">
                  {(pathname.split('/').pop() || 'Dashboard').charAt(0).toUpperCase() + (pathname.split('/').pop() || 'Dashboard').slice(1)}
                </h1>
                
                {/* Mostrar badge de rol en móvil */}
                {isMobileView && (
                  <div className={`ml-2 px-2 py-1 rounded-md text-xs font-medium ${
                    profile.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    profile.role === 'client' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {profile.role === 'admin' ? 'Admin' : 
                     profile.role === 'client' ? 'Cliente' : 'Usuario'}
                  </div>
                )}
            </div>

            {/* Header Actions */}
            <div className="ml-auto flex items-center space-x-2">
                {/* Notification icon */}
                <button className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath('notifications')} />
                  </svg>
                </button>
                <ModeToggle />
            </div>
            
            {/* Profile dropdown menu for mobile */}
            <AnimatePresence>
              {isMobileView && isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-4 mt-2 w-auto min-w-[250px] bg-popover rounded-xl shadow-lg border border-border py-2 z-50"
                  role="menu"
                >
                  <div className="px-4 py-2 border-b border-border mb-1">
                    <p className="text-sm font-semibold text-popover-foreground truncate">{profile.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    <div className={`mt-1 px-2 py-0.5 rounded text-xs font-medium inline-block ${
                        profile.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        profile.role === 'client' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                        {profile.role === 'admin' ? 'Admin' : 
                         profile.role === 'client' ? 'Cliente' : 'Usuario'}
                    </div>
                  </div>
                  <Link
                    href="/dashboard/settings/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-popover-foreground hover:bg-secondary hover:text-foreground w-full text-left"
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
                    className="flex items-center px-4 py-2.5 text-sm text-popover-foreground hover:bg-secondary hover:text-foreground w-full text-left"
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
                    className="flex items-center w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
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
        </header>

        {/* Main Content */}
        <div className="p-6 min-h-screen">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        {isMobileView && (
          <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 h-16">
            <div className="grid grid-cols-5 h-full">
              {mobileMenuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex flex-col items-center justify-center space-y-1 ${
                    isMenuItemActive(item.path)
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(item.icon)} />
                  </svg>
                  <span className="text-xs">{item.name}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}