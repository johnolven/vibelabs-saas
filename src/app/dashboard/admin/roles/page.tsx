'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  usersCount: number;
  isSystemRole?: boolean;
}

export default function RolesAndPermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: []
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        const [permissionsResponse, rolesResponse] = await Promise.all([
          fetch('/api/admin/permissions', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/admin/roles', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!permissionsResponse.ok || !rolesResponse.ok) {
          throw new Error('Error al cargar datos');
        }

        const permissionsData = await permissionsResponse.json();
        setPermissions(permissionsData);

        const rolesData = await rolesResponse.json();
        
        if (rolesData.length === 0) {
          const initResponse = await fetch('/api/admin/roles/init', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (initResponse.ok) {
            const initData = await initResponse.json();
            setRoles(initData.roles || []);
          } else {
            throw new Error('Error al inicializar roles del sistema');
          }
        } else {
          setRoles(rolesData);
        }
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const isPermissionSelected = (permissionId: string, selectedPermissions: string[]) => {
    return selectedPermissions.includes(permissionId);
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

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateRole = async () => {
    const errors: {[key: string]: string} = {};
    if (!newRole.name?.trim()) errors.name = 'El nombre es obligatorio';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newRole.name,
          description: newRole.description || '',
          permissions: newRole.permissions || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear rol');
      }

      const createdRole = await response.json();
      setRoles([...roles, createdRole]);
      setIsCreatingRole(false);
      setNewRole({ name: '', description: '', permissions: [] });
      setFormErrors({});
      showSuccess('Rol creado exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error al crear rol');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    
    const errors: {[key: string]: string} = {};
    if (!selectedRole.name?.trim()) errors.name = 'El nombre es obligatorio';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const response = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedRole.id,
          name: selectedRole.name,
          description: selectedRole.description || '',
          permissions: selectedRole.permissions || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar rol');
      }

      const updatedRole = await response.json();
      setRoles(roles.map(role => role.id === selectedRole.id ? updatedRole : role));
      setIsEditingRole(false);
      setSelectedRole(null);
      setFormErrors({});
      showSuccess('Rol actualizado exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error al actualizar rol');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role && role.usersCount > 0) {
      setApiError(`No se puede eliminar. Este rol está asignado a ${role.usersCount} usuarios.`);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar este rol?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const response = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar rol');
      }

      setRoles(roles.filter(role => role.id !== roleId));
      showSuccess('Rol eliminado exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error al eliminar rol');
    }
  };

  const handlePermissionToggle = (permissionId: string, currentPermissions: string[]) => {
    if (currentPermissions.includes(permissionId)) {
      return currentPermissions.filter(id => id !== permissionId);
    } else {
      return [...currentPermissions, permissionId];
    }
  };

  const handleModuleToggle = (modulePermissions: Permission[], currentPermissions: string[]) => {
    const modulePermissionIds = modulePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => currentPermissions.includes(id));
    
    if (allSelected) {
      return currentPermissions.filter(id => !modulePermissionIds.includes(id));
    } else {
      const newPermissions = [...currentPermissions];
      modulePermissionIds.forEach(id => {
        if (!newPermissions.includes(id)) {
          newPermissions.push(id);
        }
      });
      return newPermissions;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Roles y Permisos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona los roles y sus permisos en el sistema</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setIsCreatingRole(true);
            setIsEditingRole(false);
            setSelectedRole(null);
            setApiError(null);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Rol
        </motion.button>
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
            placeholder="Buscar roles..."
            className="pl-10 pr-4 py-2.5 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No se encontraron roles que coincidan con la búsqueda.
            </div>
          ) : (
            filteredRoles.map((role, index) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-lg shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5 border-b border-border">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-lg font-semibold">{role.name}</h2>
                    {role.isSystemRole && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        Sistema
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description || 'Sin descripción'}</p>
                </div>
                <div className="p-5 bg-muted/10">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">{role.permissions.length}</span>
                      <span className="text-muted-foreground"> permisos</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">{role.usersCount}</span>
                      <span className="text-muted-foreground"> usuarios</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {role.permissions.slice(0, 4).map(permId => {
                      const perm = permissions.find(p => p.id === permId);
                      return perm ? (
                        <span key={perm.id} className="px-2 py-1 bg-muted/30 rounded-md text-xs font-medium">
                          {perm.name}
                        </span>
                      ) : null;
                    })}
                    {role.permissions.length > 4 && (
                      <span className="px-2 py-1 bg-muted/30 rounded-md text-xs font-medium">
                        +{role.permissions.length - 4}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    Actualizado: {formatDate(role.updatedAt)}
                  </div>
                  <div className="flex justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedRole(role);
                        setIsEditingRole(true);
                        setIsCreatingRole(false);
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={role.isSystemRole || role.usersCount > 0}
                      className="px-3 py-2 text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {isCreatingRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => {
              setIsCreatingRole(false);
              setFormErrors({});
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-lg shadow-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Crear Nuevo Rol</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Rol</label>
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={e => setNewRole({...newRole, name: e.target.value})}
                      className={`w-full p-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.name ? 'border-destructive' : 'border-border'}`}
                      placeholder="Ej: Editor, Supervisor, etc."
                    />
                    {formErrors.name && <p className="mt-1 text-sm text-destructive">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <textarea
                      value={newRole.description}
                      onChange={e => setNewRole({...newRole, description: e.target.value})}
                      className="w-full p-2.5 border border-border rounded-lg bg-background h-24 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="Describe brevemente este rol y sus funciones"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Permisos</label>
                  <div className="border border-border rounded-lg bg-muted/10 p-4 h-[300px] overflow-y-auto">
                    {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                      <div key={module} className="mb-4 last:mb-0">
                        <div className="flex items-center mb-2 p-2 rounded-lg hover:bg-muted/30">
                          <input
                            type="checkbox"
                            id={`module-${module}`}
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                            checked={modulePermissions.every(p => (newRole.permissions || []).includes(p.id))}
                            onChange={() => setNewRole({
                              ...newRole, 
                              permissions: handleModuleToggle(modulePermissions, newRole.permissions || [])
                            })}
                          />
                          <label htmlFor={`module-${module}`} className="ml-2 text-sm font-semibold cursor-pointer flex-1">
                            {module}
                          </label>
                        </div>
                        <div className="ml-6 space-y-1">
                          {modulePermissions.map(permission => (
                            <div key={permission.id} className="flex items-center p-1.5 rounded hover:bg-muted/20">
                              <input
                                type="checkbox"
                                id={`permission-${permission.id}`}
                                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                                checked={isPermissionSelected(permission.id, newRole.permissions || [])}
                                onChange={() => setNewRole({
                                  ...newRole, 
                                  permissions: handlePermissionToggle(permission.id, newRole.permissions || [])
                                })}
                              />
                              <label htmlFor={`permission-${permission.id}`} className="ml-2 text-sm cursor-pointer flex-1">
                                <span className="font-mono text-xs text-muted-foreground">{permission.name}</span>
                                <span className="ml-2 text-foreground">{permission.description}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsCreatingRole(false);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRole}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Crear Rol
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditingRole && selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => {
              setIsEditingRole(false);
              setSelectedRole(null);
              setFormErrors({});
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-lg shadow-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Editar Rol: {selectedRole.name}</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Rol</label>
                    <input
                      type="text"
                      value={selectedRole.name}
                      onChange={e => setSelectedRole({...selectedRole, name: e.target.value})}
                      disabled={selectedRole.isSystemRole}
                      className={`w-full p-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.name ? 'border-destructive' : 'border-border'} ${selectedRole.isSystemRole ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.name && <p className="mt-1 text-sm text-destructive">{formErrors.name}</p>}
                    {selectedRole.isSystemRole && (
                      <p className="mt-1 text-xs text-muted-foreground">No se puede modificar el nombre de un rol del sistema</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <textarea
                      value={selectedRole.description}
                      onChange={e => setSelectedRole({...selectedRole, description: e.target.value})}
                      className="w-full p-2.5 border border-border rounded-lg bg-background h-24 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Usuarios con este rol</label>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {selectedRole.usersCount}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium">
                            {selectedRole.usersCount} {selectedRole.usersCount === 1 ? 'usuario' : 'usuarios'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Tienen asignado este rol
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Permisos</label>
                  <div className="border border-border rounded-lg bg-muted/10 p-4 h-[300px] overflow-y-auto">
                    {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                      <div key={module} className="mb-4 last:mb-0">
                        <div className="flex items-center mb-2 p-2 rounded-lg hover:bg-muted/30">
                          <input
                            type="checkbox"
                            id={`edit-module-${module}`}
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                            checked={modulePermissions.every(p => selectedRole.permissions.includes(p.id))}
                            onChange={() => setSelectedRole({
                              ...selectedRole, 
                              permissions: handleModuleToggle(modulePermissions, selectedRole.permissions)
                            })}
                          />
                          <label htmlFor={`edit-module-${module}`} className="ml-2 text-sm font-semibold cursor-pointer flex-1">
                            {module}
                          </label>
                        </div>
                        <div className="ml-6 space-y-1">
                          {modulePermissions.map(permission => (
                            <div key={permission.id} className="flex items-center p-1.5 rounded hover:bg-muted/20">
                              <input
                                type="checkbox"
                                id={`edit-permission-${permission.id}`}
                                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                                checked={isPermissionSelected(permission.id, selectedRole.permissions)}
                                onChange={() => setSelectedRole({
                                  ...selectedRole, 
                                  permissions: handlePermissionToggle(permission.id, selectedRole.permissions)
                                })}
                              />
                              <label htmlFor={`edit-permission-${permission.id}`} className="ml-2 text-sm cursor-pointer flex-1">
                                <span className="font-mono text-xs text-muted-foreground">{permission.name}</span>
                                <span className="ml-2 text-foreground">{permission.description}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsEditingRole(false);
                    setSelectedRole(null);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
