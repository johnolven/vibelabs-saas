'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: 'founder' | 'admin' | 'investor' | 'boardmember' | 'potential_investor' | 'follower';
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive' | 'pending';
  updatedAt?: string;
}

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  founder: { label: 'Founder', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  investor: { label: 'Investor', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  boardmember: { label: 'Board Member', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  potential_investor: { label: 'Potential Investor', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  follower: { label: 'Follower', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  inactive: { label: 'Inactivo', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' }
};

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'follower',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setApiError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/admin/users?nocache=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Error al cargar usuarios: ${response.status}`);
      }
      
      const data = await response.json();
      
      const formattedUsers = data.map((user: any) => {
        let normalizedRole = (user.role || 'follower').toLowerCase();
        const validRoles = ['founder', 'admin', 'investor', 'boardmember', 'potential_investor', 'follower'];
        if (!validRoles.includes(normalizedRole)) {
          normalizedRole = 'follower';
        }
        
        return {
          id: user.id || user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: normalizedRole as User['role'],
          createdAt: user.createdAt || new Date().toISOString(),
          updatedAt: user.updatedAt,
          status: (user.status || 'active') as User['status'],
          lastLogin: user.lastLogin
        };
      });
      
      setUsers(formattedUsers);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error desconocido al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest('.menu-toggle-btn') && !target.closest('.menu-dropdown')) {
          setOpenMenuId(null);
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const toggleMenu = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(openMenuId === userId ? null : userId);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateUser = async () => {
    const errors: {[key: string]: string} = {};
    if (!newUser.name?.trim()) errors.name = 'El nombre es obligatorio';
    if (!newUser.email?.trim()) errors.email = 'El email es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(newUser.email)) errors.email = 'Email inválido';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          password: 'temporal123'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al crear usuario: ${response.status}`);
      }
      
      await loadUsers();
      setIsCreating(false);
      setNewUser({ name: '', email: '', role: 'follower', status: 'active' });
      setFormErrors({});
      showSuccess('Usuario creado exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error desconocido al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    const errors: {[key: string]: string} = {};
    if (!selectedUser.name?.trim()) errors.name = 'El nombre es obligatorio';
    if (!selectedUser.email?.trim()) errors.email = 'El email es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(selectedUser.email)) errors.email = 'Email inválido';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');
      
      const userId = selectedUser._id || selectedUser.id;
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: userId,
          name: selectedUser.name,
          email: selectedUser.email,
          role: selectedUser.role.toLowerCase(),
          status: selectedUser.status
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al actualizar usuario: ${response.status}`);
      }
      
      await loadUsers();
      setIsEditing(false);
      setSelectedUser(null);
      setFormErrors({});
      showSuccess('Usuario actualizado exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error desconocido al actualizar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');
      
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar usuario: ${response.status}`);
      }
      
      await loadUsers();
      showSuccess('Usuario eliminado exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error desconocido al eliminar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra y gestiona los usuarios del sistema</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loadUsers}
            disabled={isLoading}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Recargar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsCreating(true);
              setIsEditing(false);
              setSelectedUser(null);
              setApiError(null);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Usuario
          </motion.button>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">{apiError}</p>
            </div>
          </motion.div>
        )}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-medium">{successMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar usuarios por nombre, email o rol..."
            className="pl-10 pr-4 py-2.5 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Table - Desktop */}
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto bg-card rounded-lg shadow-sm border border-border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Creado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Último Acceso</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id || user._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center cursor-pointer hover:bg-muted/40 p-2 rounded-lg transition-colors"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditing(true);
                            setIsCreating(false);
                            setApiError(null);
                          }}
                        >
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials(user.name)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_CONFIG[user.role]?.className || ROLE_CONFIG.follower.className}`}>
                          {ROLE_CONFIG[user.role]?.label || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[user.status]?.className || STATUS_CONFIG.active.className}`}>
                          {STATUS_CONFIG[user.status]?.label || user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end relative">
                          <button 
                            onClick={(e) => toggleMenu(e, user.id || user._id || '')}
                            className="p-2 text-muted-foreground hover:bg-muted/60 rounded-full menu-toggle-btn transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          <AnimatePresence>
                            {openMenuId === (user.id || user._id) && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="menu-dropdown absolute right-0 top-10 w-48 rounded-lg shadow-xl py-1 bg-card border border-border z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button 
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsEditing(true);
                                    setIsCreating(false);
                                    setApiError(null);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted/40 flex items-center gap-2 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Editar
                                </button>
                                <button 
                                  onClick={() => {
                                    handleDeleteUser(user.id || user._id || '');
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Eliminar
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cards - Mobile */}
          <div className="md:hidden space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron usuarios
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id || user._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-lg shadow-sm border border-border p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-semibold">
                        {getInitials(user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => toggleMenu(e, user.id || user._id || '')}
                      className="p-2 text-muted-foreground hover:bg-muted/60 rounded-full menu-toggle-btn"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_CONFIG[user.role]?.className || ROLE_CONFIG.follower.className}`}>
                      {ROLE_CONFIG[user.role]?.label || user.role}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[user.status]?.className || STATUS_CONFIG.active.className}`}>
                      {STATUS_CONFIG[user.status]?.label || user.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Creado: {formatDate(user.createdAt)}</div>
                    <div>Último acceso: {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}</div>
                  </div>
                  
                  <AnimatePresence>
                    {openMenuId === (user.id || user._id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-border space-y-1"
                      >
                        <button 
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditing(true);
                            setIsCreating(false);
                            setApiError(null);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 rounded-lg flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button 
                          onClick={() => {
                            handleDeleteUser(user.id || user._id || '');
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-destructive/10 text-destructive rounded-lg flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setIsCreating(false);
              setFormErrors({});
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Crear Nuevo Usuario</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className={`w-full p-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.name ? 'border-destructive' : 'border-border'}`}
                  />
                  {formErrors.name && <p className="mt-1 text-sm text-destructive">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className={`w-full p-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.email ? 'border-destructive' : 'border-border'}`}
                  />
                  {formErrors.email && <p className="mt-1 text-sm text-destructive">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rol</label>
                  <select
                    value={newUser.role?.toLowerCase()}
                    onChange={e => setNewUser({...newUser, role: e.target.value as User['role']})}
                    className="w-full p-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="follower">Follower</option>
                    <option value="potential_investor">Potential Investor</option>
                    <option value="investor">Investor</option>
                    <option value="boardmember">Board Member</option>
                    <option value="admin">Admin</option>
                    <option value="founder">Founder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select
                    value={newUser.status}
                    onChange={e => setNewUser({...newUser, status: e.target.value as User['status']})}
                    className="w-full p-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="pending">Pendiente</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewUser({ name: '', email: '', role: 'follower', status: 'active' });
                      setFormErrors({});
                    }}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateUser}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Crear Usuario
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setIsEditing(false);
              setSelectedUser(null);
              setFormErrors({});
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Editar Usuario</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    value={selectedUser.name}
                    onChange={e => setSelectedUser({...selectedUser, name: e.target.value})}
                    className={`w-full p-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.name ? 'border-destructive' : 'border-border'}`}
                  />
                  {formErrors.name && <p className="mt-1 text-sm text-destructive">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    onChange={e => setSelectedUser({...selectedUser, email: e.target.value})}
                    className={`w-full p-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.email ? 'border-destructive' : 'border-border'}`}
                  />
                  {formErrors.email && <p className="mt-1 text-sm text-destructive">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rol</label>
                  <select
                    value={selectedUser.role.toLowerCase()}
                    onChange={e => setSelectedUser({...selectedUser, role: e.target.value as User['role']})}
                    className="w-full p-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="follower">Follower</option>
                    <option value="potential_investor">Potential Investor</option>
                    <option value="investor">Investor</option>
                    <option value="boardmember">Board Member</option>
                    <option value="admin">Admin</option>
                    <option value="founder">Founder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select
                    value={selectedUser.status}
                    onChange={e => setSelectedUser({...selectedUser, status: e.target.value as User['status']})}
                    className="w-full p-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="pending">Pendiente</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedUser(null);
                      setFormErrors({});
                    }}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateUser}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
