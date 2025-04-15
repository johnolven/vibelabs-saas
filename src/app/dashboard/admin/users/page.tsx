'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface User {
  _id?: string; // MongoDB usa _id
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'client';
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive' | 'pending';
  updatedAt?: string;
}

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
    role: 'user',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Cargar usuarios desde la API real
  const loadUsers = async () => {
    setIsLoading(true);
    setApiError(null);
    
    try {
      // Obtener el token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      console.log('Cargando usuarios...');
      
      // Crear un timestamp para evitar completamente el caché
      const timestamp = new Date().getTime();
      
      // Realizar petición a la API para obtener usuarios con prevención de caché
      const response = await fetch(`/api/users?nocache=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store' // Asegurar que no se use caché
      });
      
      if (!response.ok) {
        throw new Error(`Error al cargar usuarios: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Datos crudos recibidos del API:', data);
      
      if (data.length > 0) {
        // Verificar si los datos tienen la estructura esperada
        if (data[0].role !== undefined) {
          console.log('Primer usuario tiene rol:', data[0].role);
        } else {
          console.warn('ADVERTENCIA: Los datos no tienen la propiedad "role"');
        }
      }
      
      // Transformar datos si es necesario para ajustarse a la interfaz User
      const formattedUsers = data.map((user: {
        id?: string;
        _id?: string;
        name: string;
        email: string;
        role?: string;
        createdAt?: string;
        updatedAt?: string;
        status?: string;
        lastLogin?: string;
      }) => {
        // Normalizar el rol para asegurar que siempre tenga un valor válido
        let normalizedRole = user.role || 'user';
        console.log(`Usuario ${user.name || user.email}: rol original = "${user.role}"`);
        
        // Asegurar que el rol esté en minúsculas y sea uno de los valores permitidos
        if (typeof normalizedRole === 'string') {
          normalizedRole = normalizedRole.toLowerCase();
        } else {
          console.warn(`Tipo de rol inesperado para usuario ${user.name}: ${typeof normalizedRole}`);
          normalizedRole = 'user';
        }
        
        if (!['admin', 'user', 'client'].includes(normalizedRole)) {
          console.warn(`Rol no reconocido "${normalizedRole}" para usuario ${user.name}, usando 'user' como predeterminado`);
          normalizedRole = 'user';
        }
        
        console.log(`Usuario ${user.name || user.email}: rol normalizado = "${normalizedRole}"`);
        
        // Convertir a formato de interfaz User
        const formattedUser = {
          id: user.id || user._id, 
          _id: user._id,
          name: user.name,
          email: user.email,
          role: normalizedRole as 'admin' | 'user' | 'client',
          createdAt: user.createdAt || new Date().toISOString(),
          updatedAt: user.updatedAt,
          status: user.status || 'active',
          lastLogin: user.lastLogin
        };
        
        console.log('Usuario formateado:', formattedUser);
        return formattedUser;
      });
      
      console.log('Todos los usuarios formateados:', formattedUsers);
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido al cargar usuarios');
      
      // Cargar datos de ejemplo como fallback
      setUsers([
        {
          id: '1',
          name: 'Admin Principal',
          email: 'admin@example.com',
          role: 'admin',
          createdAt: '2023-01-15T10:30:00Z',
          lastLogin: '2023-06-20T08:45:00Z',
          status: 'active'
        },
        {
          id: '2',
          name: 'Usuario Regular',
          email: 'usuario@example.com',
          role: 'user',
          createdAt: '2023-02-20T14:15:00Z',
          lastLogin: '2023-06-18T16:30:00Z',
          status: 'active'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadUsers();
  }, []);

  // Cerrar el menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Solo cerrar si el clic fue fuera de menús y botones
      if (openMenuId !== null) {
        const target = e.target as HTMLElement;
        // No cerrar si el clic fue en un botón de menú o dentro del menú
        if (target.closest('.menu-toggle-btn') || target.closest('.menu-dropdown')) {
          return;
        }
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Función para alternar el menú
  const toggleMenu = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(openMenuId === userId ? null : userId);
  };

  // Funciones para gestionar usuarios
  const handleCreateUser = async () => {
    // Validar formulario
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
      // Obtener el token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Realizar petición a la API para crear usuario
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Añadir encabezados para evitar el caché
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          // Añadir password temporal o cualquier otro campo requerido
          password: 'temporal123'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error al crear usuario: ${response.status}`);
      }
      
      // Recargar todos los usuarios desde la API en lugar de actualizar localmente
      await loadUsers();
      setIsCreating(false);
      setNewUser({
        name: '',
        email: '',
        role: 'user',
        status: 'active'
      });
      setFormErrors({});
    } catch (error) {
      console.error('Error creating user:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    // Validar formulario
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
      // Obtener el token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Guardar el rol original para comparar después
      const originalRole = selectedUser.role;
      console.log('Rol original antes de actualizar:', originalRole);
      
      // Datos a enviar
      const updateData = {
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role.toLowerCase(), // Asegurar que el rol esté en minúsculas
        status: selectedUser.status
      };
      
      // Realizar petición a la API para actualizar usuario
      const userId = selectedUser._id || selectedUser.id;
      console.log('Actualizando usuario con ID:', userId, 'Datos para actualizar:', updateData);
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Añadir encabezados para evitar el caché
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error de respuesta (${response.status}):`, errorText);
        throw new Error(`Error al actualizar usuario: ${response.status} - ${errorText}`);
      }
      
      // Obtener la respuesta de la API
      const updatedUser = await response.json();
      console.log('Respuesta del servidor:', updatedUser);
      console.log('Rol después de actualizar (según API):', updatedUser.role);
      
      // Mostrar un mensaje de actualización exitosa
      console.log(`¡Usuario actualizado exitosamente! Rol cambiado de "${originalRole}" a "${updatedUser.role}". Recargando datos...`);
      
      // En lugar de actualizar el estado directamente, recargar todos los usuarios
      // con un pequeño retraso para asegurar que los datos se actualicen
      setTimeout(async () => {
        await loadUsers();
        console.log('Datos recargados después de actualización');
      }, 1000); // Aumentar el tiempo de espera a 1 segundo
      
      setIsEditing(false);
      setSelectedUser(null);
      setFormErrors({});
    } catch (error) {
      console.error('Error updating user:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido al actualizar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      setIsLoading(true);
      try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No hay token de autenticación');
        }
        
        // Realizar petición a la API para eliminar usuario
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Añadir encabezados para evitar el caché
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error al eliminar usuario: ${response.status}`);
        }
        
        console.log('Usuario eliminado correctamente');
        
        // Recargar la lista completa en lugar de solo filtrar localmente
        await loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        setApiError(error instanceof Error ? error.message : 'Error desconocido al eliminar usuario');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Función para formatear fechas
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

  // Filtrar usuarios por término de búsqueda
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Renderizar badge de estado
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Activo</span>;
      case 'inactive':
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Inactivo</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pendiente</span>;
      default:
        return null;
    }
  };

  // Renderizar badge de rol
  const renderRoleBadge = (role: string) => {
    // Normalizar el rol para asegurar compatibilidad
    const normalizedRole = (role || '').toLowerCase();
    
    console.log(`Renderizando insignia para rol: "${role}", normalizado a: "${normalizedRole}"`);
    
    // Forzar comparación de strings para mayor seguridad
    if (normalizedRole === 'admin') {
      return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Administrador</span>;
    } else if (normalizedRole === 'client') {
      return <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Cliente</span>;
    } else if (normalizedRole === 'user' || normalizedRole === '') {
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Usuario</span>;
    } else {
      console.warn(`Rol desconocido: "${role}"`);
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Usuario</span>;
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loadUsers()}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-secondary/90 flex items-center"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="bg-primary text-primary-foreground !important px-4 py-2 rounded-lg shadow hover:bg-primary/90 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuevo Usuario
            </motion.button>
          </div>
        </div>

        {apiError && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 mb-4">
            <p className="font-medium">Error:</p>
            <p>{apiError}</p>
          </div>
        )}

        <div className="bg-card rounded-lg shadow p-4 mb-6">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar usuarios..."
              className="pl-10 pr-4 py-2 w-full border rounded-lg bg-background"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-card rounded-lg shadow">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/30">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Rol
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Creado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Último Acceso
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id || user._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center cursor-pointer hover:bg-muted/40 p-2 rounded-lg transition-colors"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditing(true);
                            setIsCreating(false);
                            setApiError(null);
                          }}
                          title="Haz clic para editar este usuario"
                        >
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-500 dark:to-blue-400 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          {renderRoleBadge(user.role)}
                          <span className="mt-1 text-xs text-muted-foreground">(Rol: &quot;{user.role}&quot;)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {user.lastLogin ? formatDate(user.lastLogin) : 'No ha iniciado sesión'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end relative">
                          <button 
                            onClick={(e) => toggleMenu(e, user.id || user._id || '')}
                            className="p-2 text-muted-foreground hover:bg-muted/60 rounded-full menu-toggle-btn"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {openMenuId === (user.id || user._id) && (
                            <div 
                              className="menu-dropdown absolute right-0 top-8 w-48 rounded-md shadow-xl py-1 bg-card border border-border"
                              style={{
                                zIndex: 9999
                              }}
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
                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted/40 flex items-center transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </button>
                              <button 
                                onClick={() => {
                                  handleDeleteUser(user.id || user._id || '');
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted/40 text-red-600 dark:text-red-400 flex items-center transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para crear usuario */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-xl font-semibold mb-4">Crear Nuevo Usuario</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className={`w-full p-2 border rounded-lg ${formErrors.name ? 'border-red-500' : 'border-border'}`}
                />
                {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className={`w-full p-2 border rounded-lg ${formErrors.email ? 'border-red-500' : 'border-border'}`}
                />
                {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <select
                  value={newUser.role?.toLowerCase()}
                  onChange={e => setNewUser({...newUser, role: e.target.value as 'admin' | 'user' | 'client'})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                  <option value="client">Cliente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={newUser.status}
                  onChange={e => setNewUser({...newUser, status: e.target.value as 'active' | 'inactive' | 'pending'})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewUser({
                      name: '',
                      email: '',
                      role: 'user',
                      status: 'active'
                    });
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
        </div>
      )}

      {/* Modal para editar usuario */}
      {isEditing && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-xl font-semibold mb-4">Editar Usuario</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={selectedUser.name}
                  onChange={e => setSelectedUser({...selectedUser, name: e.target.value})}
                  className={`w-full p-2 border rounded-lg ${formErrors.name ? 'border-red-500' : 'border-border'}`}
                />
                {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  onChange={e => setSelectedUser({...selectedUser, email: e.target.value})}
                  className={`w-full p-2 border rounded-lg ${formErrors.email ? 'border-red-500' : 'border-border'}`}
                />
                {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <select
                  value={selectedUser.role.toLowerCase()}
                  onChange={e => setSelectedUser({...selectedUser, role: e.target.value as 'admin' | 'user' | 'client'})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="user">Usuario</option>
                  <option value="client">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={selectedUser.status}
                  onChange={e => setSelectedUser({...selectedUser, status: e.target.value as 'active' | 'inactive' | 'pending'})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
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
        </div>
      )}
    </div>
  );
}
