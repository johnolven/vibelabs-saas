'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
  permissions: string[]; // IDs de permisos
  createdAt: string;
  updatedAt: string;
  usersCount: number;
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

  // Cargar datos (simulado)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simular carga desde API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Permisos de ejemplo
        const mockPermissions: Permission[] = [
          { id: 'p1', name: 'users:read', description: 'Ver usuarios', module: 'Usuarios' },
          { id: 'p2', name: 'users:create', description: 'Crear usuarios', module: 'Usuarios' },
          { id: 'p3', name: 'users:update', description: 'Editar usuarios', module: 'Usuarios' },
          { id: 'p4', name: 'users:delete', description: 'Eliminar usuarios', module: 'Usuarios' },
          { id: 'p5', name: 'roles:read', description: 'Ver roles', module: 'Roles' },
          { id: 'p6', name: 'roles:create', description: 'Crear roles', module: 'Roles' },
          { id: 'p7', name: 'roles:update', description: 'Editar roles', module: 'Roles' },
          { id: 'p8', name: 'roles:delete', description: 'Eliminar roles', module: 'Roles' },
          { id: 'p9', name: 'clients:read', description: 'Ver clientes', module: 'Clientes' },
          { id: 'p10', name: 'clients:create', description: 'Crear clientes', module: 'Clientes' },
          { id: 'p11', name: 'clients:update', description: 'Editar clientes', module: 'Clientes' },
          { id: 'p12', name: 'clients:delete', description: 'Eliminar clientes', module: 'Clientes' },
          { id: 'p13', name: 'billing:read', description: 'Ver facturación', module: 'Facturación' },
          { id: 'p14', name: 'billing:create', description: 'Crear factura', module: 'Facturación' },
          { id: 'p15', name: 'reports:view', description: 'Ver reportes', module: 'Reportes' },
          { id: 'p16', name: 'settings:manage', description: 'Administrar configuración', module: 'Configuración' },
        ];

        // Roles de ejemplo
        const mockRoles: Role[] = [
          {
            id: 'r1',
            name: 'Administrador',
            description: 'Acceso completo a todas las funciones del sistema',
            permissions: mockPermissions.map(p => p.id),
            createdAt: '2023-01-10T08:00:00Z',
            updatedAt: '2023-05-15T10:30:00Z',
            usersCount: 2
          },
          {
            id: 'r2',
            name: 'Usuario',
            description: 'Acceso limitado a funciones básicas',
            permissions: ['p1', 'p5', 'p9', 'p13', 'p15'],
            createdAt: '2023-01-12T09:15:00Z',
            updatedAt: '2023-04-20T14:45:00Z',
            usersCount: 15
          },
          {
            id: 'r3',
            name: 'Cliente',
            description: 'Acceso exclusivo para clientes',
            permissions: ['p9', 'p13', 'p15'],
            createdAt: '2023-01-15T11:30:00Z',
            updatedAt: '2023-03-10T16:20:00Z',
            usersCount: 28
          },
          {
            id: 'r4',
            name: 'Soporte',
            description: 'Acceso para equipo de soporte',
            permissions: ['p1', 'p3', 'p5', 'p9', 'p11', 'p13', 'p15'],
            createdAt: '2023-02-05T10:45:00Z',
            updatedAt: '2023-05-22T09:10:00Z',
            usersCount: 5
          },
          {
            id: 'r5',
            name: 'Ventas',
            description: 'Acceso para equipo de ventas',
            permissions: ['p1', 'p9', 'p10', 'p11', 'p13', 'p14', 'p15'],
            createdAt: '2023-02-10T13:20:00Z',
            updatedAt: '2023-04-30T11:30:00Z',
            usersCount: 8
          }
        ];
        
        setPermissions(mockPermissions);
        setRoles(mockRoles);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filtrar roles por término de búsqueda
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener permisos por módulo
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Verificar si un permiso está seleccionado
  const isPermissionSelected = (permissionId: string, selectedPermissions: string[]) => {
    return selectedPermissions.includes(permissionId);
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

  // Funciones para gestionar roles
  const handleCreateRole = () => {
    // Validar formulario
    const errors: {[key: string]: string} = {};
    if (!newRole.name?.trim()) errors.name = 'El nombre es obligatorio';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Simular creación en la API
    const createdRole: Role = {
      id: `r${roles.length + 1}`,
      name: newRole.name!,
      description: newRole.description || '',
      permissions: newRole.permissions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usersCount: 0
    };
    
    setRoles([...roles, createdRole]);
    setIsCreatingRole(false);
    setNewRole({
      name: '',
      description: '',
      permissions: []
    });
    setFormErrors({});
  };

  const handleUpdateRole = () => {
    if (!selectedRole) return;
    
    // Validar formulario
    const errors: {[key: string]: string} = {};
    if (!selectedRole.name?.trim()) errors.name = 'El nombre es obligatorio';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Actualizar rol en el estado
    const updatedRoles = roles.map(role => 
      role.id === selectedRole.id ? {
        ...selectedRole,
        updatedAt: new Date().toISOString()
      } : role
    );
    
    setRoles(updatedRoles);
    setIsEditingRole(false);
    setSelectedRole(null);
    setFormErrors({});
  };

  const handleDeleteRole = (roleId: string) => {
    // Verificar si hay usuarios asignados
    const role = roles.find(r => r.id === roleId);
    if (role && role.usersCount > 0) {
      alert(`No se puede eliminar. Este rol está asignado a ${role.usersCount} usuarios.`);
      return;
    }
    
    if (window.confirm('¿Estás seguro de que quieres eliminar este rol?')) {
      setRoles(roles.filter(role => role.id !== roleId));
    }
  };

  // Manejar cambio de permisos
  const handlePermissionToggle = (permissionId: string, currentPermissions: string[]) => {
    if (currentPermissions.includes(permissionId)) {
      return currentPermissions.filter(id => id !== permissionId);
    } else {
      return [...currentPermissions, permissionId];
    }
  };

  // Manejar selección de todos los permisos de un módulo
  const handleModuleToggle = (modulePermissions: Permission[], currentPermissions: string[]) => {
    const modulePermissionIds = modulePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => currentPermissions.includes(id));
    
    if (allSelected) {
      // Quitar todos los permisos del módulo
      return currentPermissions.filter(id => !modulePermissionIds.includes(id));
    } else {
      // Añadir todos los permisos del módulo que no estén ya incluidos
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
    <div className="container mx-auto">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gestión de Roles y Permisos</h1>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsCreatingRole(true);
              setIsEditingRole(false);
              setSelectedRole(null);
            }}
            className="bg-primary text-primary-foreground !important px-4 py-2 rounded-lg shadow hover:bg-primary/90 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Rol
          </motion.button>
        </div>

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
              placeholder="Buscar roles..."
              className="pl-10 pr-4 py-2 w-full border rounded-lg bg-background"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No se encontraron roles que coincidan con la búsqueda.
              </div>
            ) : (
              filteredRoles.map(role => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-5 border-b border-border">
                    <h2 className="text-xl font-semibold mb-2">{role.name}</h2>
                    <p className="text-muted-foreground text-sm">{role.description}</p>
                  </div>
                  <div className="p-5 bg-muted/10">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm">
                        <span className="font-medium">{role.permissions.length}</span> permisos asignados
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{role.usersCount}</span> usuarios con este rol
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {role.permissions.slice(0, 5).map(permId => {
                        const perm = permissions.find(p => p.id === permId);
                        return perm ? (
                          <span key={perm.id} className="px-2 py-1 bg-muted/20 rounded-md text-xs">
                            {perm.name}
                          </span>
                        ) : null;
                      })}
                      {role.permissions.length > 5 && (
                        <span className="px-2 py-1 bg-muted/20 rounded-md text-xs">
                          +{role.permissions.length - 5} más
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-4">
                      Actualizado el {formatDate(role.updatedAt)}
                    </div>
                    <div className="flex justify-between">
                      <button
                        onClick={() => {
                          setSelectedRole(role);
                          setIsEditingRole(true);
                          setIsCreatingRole(false);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-800 text-sm flex items-center"
                        disabled={role.usersCount > 0}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal para crear rol */}
      {isCreatingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg shadow-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-semibold mb-4">Crear Nuevo Rol</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Rol</label>
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={e => setNewRole({...newRole, name: e.target.value})}
                      className={`w-full p-2 border rounded-lg ${formErrors.name ? 'border-red-500' : 'border-border'}`}
                      placeholder="Ej: Editor, Supervisor, etc."
                    />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <textarea
                      value={newRole.description}
                      onChange={e => setNewRole({...newRole, description: e.target.value})}
                      className="w-full p-2 border border-border rounded-lg bg-background h-20"
                      placeholder="Describe brevemente este rol y sus funciones"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Permisos</label>
                <div className="border border-border rounded-lg bg-muted/10 p-4 h-[300px] overflow-y-auto">
                  {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                    <div key={module} className="mb-4">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`module-${module}`}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={modulePermissions.every(p => (newRole.permissions || []).includes(p.id))}
                          onChange={() => setNewRole({
                            ...newRole, 
                            permissions: handleModuleToggle(
                              modulePermissions, 
                              newRole.permissions || []
                            )
                          })}
                        />
                        <label htmlFor={`module-${module}`} className="ml-2 text-sm font-medium">
                          {module}
                        </label>
                      </div>
                      <div className="ml-6 space-y-1">
                        {modulePermissions.map(permission => (
                          <div key={permission.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`permission-${permission.id}`}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                              checked={isPermissionSelected(permission.id, newRole.permissions || [])}
                              onChange={() => setNewRole({
                                ...newRole, 
                                permissions: handlePermissionToggle(
                                  permission.id, 
                                  newRole.permissions || []
                                )
                              })}
                            />
                            <label htmlFor={`permission-${permission.id}`} className="ml-2 text-sm">
                              <span className="font-mono text-xs text-muted-foreground">{permission.name}</span>
                              <span className="ml-2">{permission.description}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsCreatingRole(false);
                  setFormErrors({});
                }}
                className="px-4 py-2 border border-border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRole}
                className="px-4 py-2 bg-primary text-primary-foreground !important rounded-lg"
              >
                Crear Rol
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal para editar rol */}
      {isEditingRole && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg shadow-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-semibold mb-4">Editar Rol: {selectedRole.name}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Rol</label>
                    <input
                      type="text"
                      value={selectedRole.name}
                      onChange={e => setSelectedRole({...selectedRole, name: e.target.value})}
                      className={`w-full p-2 border rounded-lg ${formErrors.name ? 'border-red-500' : 'border-border'}`}
                    />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <textarea
                      value={selectedRole.description}
                      onChange={e => setSelectedRole({...selectedRole, description: e.target.value})}
                      className="w-full p-2 border border-border rounded-lg bg-background h-20"
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
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Permisos</label>
                <div className="border border-border rounded-lg bg-muted/10 p-4 h-[300px] overflow-y-auto">
                  {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                    <div key={module} className="mb-4">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`edit-module-${module}`}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={modulePermissions.every(p => selectedRole.permissions.includes(p.id))}
                          onChange={() => setSelectedRole({
                            ...selectedRole, 
                            permissions: handleModuleToggle(
                              modulePermissions, 
                              selectedRole.permissions
                            )
                          })}
                        />
                        <label htmlFor={`edit-module-${module}`} className="ml-2 text-sm font-medium">
                          {module}
                        </label>
                      </div>
                      <div className="ml-6 space-y-1">
                        {modulePermissions.map(permission => (
                          <div key={permission.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`edit-permission-${permission.id}`}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                              checked={isPermissionSelected(permission.id, selectedRole.permissions)}
                              onChange={() => setSelectedRole({
                                ...selectedRole, 
                                permissions: handlePermissionToggle(
                                  permission.id, 
                                  selectedRole.permissions
                                )
                              })}
                            />
                            <label htmlFor={`edit-permission-${permission.id}`} className="ml-2 text-sm">
                              <span className="font-mono text-xs text-muted-foreground">{permission.name}</span>
                              <span className="ml-2">{permission.description}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsEditingRole(false);
                  setSelectedRole(null);
                  setFormErrors({});
                }}
                className="px-4 py-2 border border-border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-4 py-2 bg-primary text-primary-foreground !important rounded-lg"
              >
                Guardar Cambios
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 