'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ModeToggle } from "@/components/mode-toggle";

const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chevronLeft: 'M15 19l-7-7 7-7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M19 9l-7 7-7-7',
  analytics: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  docs: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
};

interface MenuItem {
  name: string;
  icon: keyof typeof ICONS | string;
  path: string;
  submenu?: MenuItem[];
}

// Menú para Investors (acceso completo a información de inversión)
const investorMenuItems: MenuItem[] = [
  {
    name: 'Portal',
    icon: 'home',
    path: '/dashboard/investor'
  },
  {
    name: 'Cap Table',
    icon: 'chart',
    path: '/dashboard/investor/cap-table'
  },
  {
    name: 'Data Room',
    icon: 'docs',
    path: '/dashboard/investor/documents',
    submenu: [
      { name: 'Todos', icon: 'docs', path: '/dashboard/investor/documents' },
      { name: 'Financieros', icon: 'docs', path: '/dashboard/investor/documents?folder=financials' },
      { name: 'Board Materials', icon: 'docs', path: '/dashboard/investor/documents?folder=board_materials' },
      { name: 'Pitch Deck', icon: 'docs', path: '/dashboard/investor/documents?folder=pitch_deck' },
    ]
  },
  {
    name: 'Monthly Updates',
    icon: 'calendar',
    path: '/dashboard/investor/updates'
  },
  {
    name: 'Métricas',
    icon: 'analytics',
    path: '/dashboard/investor/metrics'
  },
  {
    name: 'Discusiones',
    icon: 'message',
    path: '/dashboard/investor/comments'
  },
  {
    name: 'Ajustes',
    icon: 'settings',
    path: '/dashboard/settings',
    submenu: [
      { name: 'Perfil', icon: 'profile', path: '/dashboard/settings/profile' },
    ]
  }
];

// Menú para Board Members (similar a investor pero con énfasis en board materials)
const boardMemberMenuItems: MenuItem[] = [
  {
    name: 'Portal',
    icon: 'home',
    path: '/dashboard/investor'
  },
  {
    name: 'Cap Table',
    icon: 'chart',
    path: '/dashboard/investor/cap-table'
  },
  {
    name: 'Board Materials',
    icon: 'docs',
    path: '/dashboard/investor/documents?folder=board_materials'
  },
  {
    name: 'Data Room',
    icon: 'docs',
    path: '/dashboard/investor/documents',
    submenu: [
      { name: 'Board Materials', icon: 'docs', path: '/dashboard/investor/documents?folder=board_materials' },
      { name: 'Financieros', icon: 'docs', path: '/dashboard/investor/documents?folder=financials' },
      { name: 'Pitch Deck', icon: 'docs', path: '/dashboard/investor/documents?folder=pitch_deck' },
    ]
  },
  {
    name: 'Monthly Updates',
    icon: 'calendar',
    path: '/dashboard/investor/updates'
  },
  {
    name: 'Métricas',
    icon: 'analytics',
    path: '/dashboard/investor/metrics'
  },
  {
    name: 'Discusiones',
    icon: 'message',
    path: '/dashboard/investor/comments'
  },
  {
    name: 'Ajustes',
    icon: 'settings',
    path: '/dashboard/settings',
    submenu: [
      { name: 'Perfil', icon: 'profile', path: '/dashboard/settings/profile' },
    ]
  }
];

// Menú para Potential Investors (acceso limitado)
const potentialInvestorMenuItems: MenuItem[] = [
  {
    name: 'Portal',
    icon: 'home',
    path: '/dashboard/investor'
  },
  {
    name: 'Pitch Deck',
    icon: 'docs',
    path: '/dashboard/investor/documents?folder=pitch_deck'
  },
  {
    name: 'Updates Públicos',
    icon: 'calendar',
    path: '/dashboard/investor/updates'
  },
  {
    name: 'Ajustes',
    icon: 'settings',
    path: '/dashboard/settings',
    submenu: [
      { name: 'Perfil', icon: 'profile', path: '/dashboard/settings/profile' },
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

interface InvestorLayoutProps {
  children: ReactNode;
}

export default function InvestorLayout({ children }: InvestorLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeSubmenus, setActiveSubmenus] = useState<string[]>([]);
  const [profile, setProfile] = useState({ name: '', email: '', role: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

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
        const role = userData.role || 'investor';
        
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          role: role
        });

        // Asignar menú según el rol
        if (role === 'boardmember') {
          setMenuItems(boardMemberMenuItems);
        } else if (role === 'potential_investor') {
          setMenuItems(potentialInvestorMenuItems);
        } else {
          setMenuItems(investorMenuItems);
        }
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

  const getRoleBadge = () => {
    const roleColors = {
      investor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      boardmember: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      potential_investor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    const roleLabels = {
      investor: 'Investor',
      boardmember: 'Board Member',
      potential_investor: 'Potential Investor',
    };
    return {
      color: roleColors[profile.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800',
      label: roleLabels[profile.role as keyof typeof roleLabels] || 'Investor'
    };
  };

  const badge = getRoleBadge();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
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
                className="overflow-hidden whitespace-nowrap"
              >
                <Link href="/dashboard/investor" className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                  CapFlow Investor
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center">
            {isMenuExpanded && (
              <div className={`px-2 py-1 rounded-md text-xs font-medium mr-2 ${badge.color}`}>
                {badge.label}
              </div>
            )}
            {isMenuExpanded && <ModeToggle />}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => (
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
          <div className="relative">
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
            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-2 bg-popover rounded-lg shadow-lg border border-border py-2 z-50">
                <Link
                  href="/dashboard/settings/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center px-4 py-2 text-sm hover:bg-secondary"
                >
                  Perfil
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isMenuExpanded ? 'ml-64' : 'ml-20'}`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

