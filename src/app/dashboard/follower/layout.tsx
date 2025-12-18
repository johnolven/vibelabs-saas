'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ModeToggle } from "@/components/mode-toggle";

const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chevronLeft: 'M15 19l-7-7 7-7',
  chevronRight: 'M9 5l7 7-7 7',
};

interface MenuItem {
  name: string;
  icon: keyof typeof ICONS | string;
  path: string;
}

const followerMenuItems: MenuItem[] = [
  {
    name: 'Inicio',
    icon: 'home',
    path: '/dashboard/follower'
  },
  {
    name: 'Product Updates',
    icon: 'calendar',
    path: '/dashboard/follower/updates'
  },
  {
    name: 'Ajustes',
    icon: 'settings',
    path: '/dashboard/settings'
  }
];

const getIconPath = (icon: keyof typeof ICONS | string): string => {
  return ICONS[icon as keyof typeof ICONS] || icon;
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.split(' ').map(word => word[0]).filter(Boolean).join('').toUpperCase().substring(0, 2);
};

interface FollowerLayoutProps {
  children: ReactNode;
}

export default function FollowerLayout({ children }: FollowerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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
          email: userData.email || ''
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

  const isMenuItemActive = (itemPath: string) => {
    return pathname === itemPath || pathname.startsWith(itemPath);
  };

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
                className="overflow-hidden whitespace-nowrap flex items-center"
              >
                <Link href="/dashboard/follower" className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                  CapFlow
                </Link>
                <span className="ml-3 px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded text-xs">
                  Follower
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center">
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
          {followerMenuItems.map((item) => (
            <div key={item.path} className="px-2">
              <div
                onClick={() => router.push(item.path)}
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
              </div>
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

