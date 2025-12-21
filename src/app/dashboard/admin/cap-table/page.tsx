'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IShareholder, ICapTable } from '@/models/CapTable';

export default function CapTableManagement() {
  const [capTable, setCapTable] = useState<Partial<ICapTable>>({
    companyName: '',
    totalShares: 0,
    reservedPool: 0,
    shareholders: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isAddingShareholder, setIsAddingShareholder] = useState(false);
  const [editingShareholder, setEditingShareholder] = useState<IShareholder | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [pendingShareholder, setPendingShareholder] = useState<Partial<IShareholder> | null>(null);
  const [deletingShareholder, setDeletingShareholder] = useState<IShareholder | null>(null);
  const [deleteAction, setDeleteAction] = useState<'return_to_reserved' | 'transfer' | 'remove' | null>(null);
  const [transferToShareholderId, setTransferToShareholderId] = useState<string>('');

  useEffect(() => {
    loadCapTable();
  }, []);

  const loadCapTable = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('/api/cap-table', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar cap table');
      }

      const data = await response.json();
      setCapTable(data);
    } catch (error) {
      console.error('Error loading cap table:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    const errors: {[key: string]: string} = {};
    if (!capTable.companyName?.trim()) errors.companyName = 'El nombre de la empresa es requerido';
    if (capTable.totalShares === undefined || capTable.totalShares < 0) {
      errors.totalShares = 'El total de shares debe ser mayor o igual a 0';
    }
    if (capTable.reservedPool === undefined || capTable.reservedPool < 0) {
      errors.reservedPool = 'El reserved pool debe ser mayor o igual a 0';
    }
    
    // Validar que reserved pool no exceda el total de shares
    if (capTable.totalShares && capTable.reservedPool !== undefined) {
      if (capTable.reservedPool > capTable.totalShares) {
        errors.reservedPool = `El reserved pool no puede exceder el total de shares autorizadas (${capTable.totalShares.toLocaleString()})`;
      }
      
      // Validar que outstanding + reserved no exceda el total
      const totalSharesAllocated = capTable.shareholders?.reduce((sum, sh) => sum + (sh.shares || 0), 0) || 0;
      if (totalSharesAllocated + capTable.reservedPool > capTable.totalShares) {
        errors.reservedPool = `La suma de shares asignadas (${totalSharesAllocated.toLocaleString()}) + reserved pool (${capTable.reservedPool.toLocaleString()}) excede el total autorizado`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token');

      const response = await fetch('/api/cap-table', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: capTable.companyName,
          totalShares: capTable.totalShares,
          reservedPool: capTable.reservedPool || 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar configuración');
      }

      const updated = await response.json();
      setCapTable(updated);
      setIsEditingConfig(false);
      setFormErrors({});
    } catch (error) {
      console.error('Error saving config:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar');
    }
  };

  const handleAddShareholder = async (shareholder: Partial<IShareholder>) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token');

      // Verificar si el cap table está configurado
      if (!capTable.companyName || !capTable.totalShares) {
        const shouldCreate = window.confirm(
          'Primero debes configurar el cap table (nombre de empresa y total de shares). ¿Deseas configurarlo ahora?'
        );
        if (shouldCreate) {
          setIsEditingConfig(true);
          setIsAddingShareholder(false);
          return;
        } else {
          return;
        }
      }

      const response = await fetch('/api/cap-table/shareholders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shareholder)
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.includes('Primero debes crear el cap table')) {
          const shouldCreate = window.confirm(
            'El cap table no está configurado. ¿Deseas configurarlo ahora?'
          );
          if (shouldCreate) {
            setIsEditingConfig(true);
            setIsAddingShareholder(false);
          }
          return;
        }
        
        // Si el error sugiere aumentar el total autorizado
        if (errorData.suggestion) {
          const suggestion = errorData.suggestion;
          const message = `${errorData.error}\n\n` +
            `Espacio disponible: ${(suggestion.currentTotal - suggestion.reservedPool).toLocaleString()} shares\n` +
            `Shares actuales: ${suggestion.currentOutstanding.toLocaleString()}\n` +
            `Nuevas shares: ${suggestion.newShares.toLocaleString()}\n` +
            `Reserved pool: ${suggestion.reservedPool.toLocaleString()}\n\n` +
            `¿Deseas aumentar el total autorizado de ${suggestion.currentTotal.toLocaleString()} a ${suggestion.neededTotal.toLocaleString()} para emitir las nuevas acciones?`;
          
          const shouldIncrease = window.confirm(message);
          if (shouldIncrease) {
            // Guardar el shareholder pendiente
            setPendingShareholder(shareholder);
            
            // Actualizar el total autorizado automáticamente
            const updateResponse = await fetch('/api/cap-table', {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                totalShares: suggestion.neededTotal
              })
            });
            
            if (updateResponse.ok) {
              // Recargar el cap table actualizado
              await loadCapTable();
              
              // Reintentar agregar el shareholder
              const retryResponse = await fetch('/api/cap-table/shareholders', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(shareholder)
              });
              
              if (retryResponse.ok) {
                const updated = await retryResponse.json();
                setCapTable(updated);
                setIsAddingShareholder(false);
                setPendingShareholder(null);
                loadCapTable();
                return;
              } else {
                const retryError = await retryResponse.json();
                throw new Error(retryError.error || 'Error al agregar shareholder después de aumentar el total');
              }
            } else {
              throw new Error('Error al aumentar el total autorizado');
            }
          } else {
            // Usuario canceló, no hacer nada
            return;
          }
        }
        
        throw new Error(errorData.error || 'Error al agregar shareholder');
      }

      const updated = await response.json();
      setCapTable(updated);
      setIsAddingShareholder(false);
      loadCapTable();
    } catch (error) {
      console.error('Error adding shareholder:', error);
      alert(error instanceof Error ? error.message : 'Error al agregar');
    }
  };

  const handleUpdateShareholder = async (shareholderId: string, updates: Partial<IShareholder>) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token');

      const response = await fetch('/api/cap-table/shareholders', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shareholderId,
          ...updates
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar shareholder');
      }

      const updated = await response.json();
      setCapTable(updated);
      setEditingShareholder(null);
      loadCapTable();
    } catch (error) {
      console.error('Error updating shareholder:', error);
      alert(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  const handleDeleteShareholder = async (shareholderId: string) => {
    if (!shareholderId) {
      alert('ID del shareholder no válido');
      return;
    }

    // Encontrar el shareholder a eliminar
    const shareholderToDelete = capTable.shareholders?.find(
      (sh) => sh._id?.toString() === shareholderId || (sh as any).id?.toString() === shareholderId
    );

    if (!shareholderToDelete) {
      alert('Shareholder no encontrado');
      return;
    }

    // Mostrar modal para decidir qué hacer con las acciones
    setDeletingShareholder(shareholderToDelete);
    setDeleteAction(null);
    setTransferToShareholderId('');
  };

  const confirmDeleteShareholder = async () => {
    if (!deletingShareholder || !deleteAction) {
      alert('Debes seleccionar qué hacer con las acciones');
      return;
    }

    const shareholderId = deletingShareholder._id?.toString() || (deletingShareholder as any).id?.toString();
    if (!shareholderId) {
      alert('ID del shareholder no válido');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      // Preparar los datos según la acción seleccionada
      const deleteData: any = {
        shareholderId,
        action: deleteAction
      };

      if (deleteAction === 'transfer' && transferToShareholderId) {
        deleteData.transferToShareholderId = transferToShareholderId;
      }

      const response = await fetch(`/api/cap-table/shareholders?id=${encodeURIComponent(shareholderId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deleteData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);
        throw new Error(errorData.error || `Error al eliminar shareholder: ${response.status}`);
      }

      const updated = await response.json();
      console.log('Shareholder eliminado, cap table actualizado:', updated);
      setCapTable(updated);
      setDeletingShareholder(null);
      setDeleteAction(null);
      setTransferToShareholderId('');
      loadCapTable();
    } catch (error) {
      console.error('Error deleting shareholder:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar shareholder');
    }
  };

  const exportToCSV = () => {
    if (!capTable.shareholders || capTable.shareholders.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = ['Nombre', 'Email', 'Tipo', 'Tipo de Equity', 'Shares', '% Ownership', 'Vested Shares', 'Unvested Shares', 'Vesting Start', 'Vesting Period (meses)', 'Cliff (meses)', 'Investment Amount', 'Investment Date', 'Fully Diluted', 'Notes'];
    const rows = capTable.shareholders.map(sh => [
      sh.name || '',
      sh.email || '',
      sh.type || '',
      sh.equityType || '',
      sh.shares?.toString() || '0',
      sh.ownershipPercentage?.toFixed(2) + '%' || '0%',
      (sh as any).vestedShares?.toString() || (sh.vestingStartDate ? '0' : sh.shares?.toString() || '0'),
      (sh as any).unvestedShares?.toString() || '0',
      sh.vestingStartDate ? new Date(sh.vestingStartDate).toLocaleDateString() : 'N/A',
      sh.vestingPeriodMonths?.toString() || 'N/A',
      sh.vestingCliffMonths?.toString() || '0',
      sh.investmentAmount?.toLocaleString() || '',
      sh.investmentDate ? new Date(sh.investmentDate).toLocaleDateString() : '',
      sh.fullyDiluted ? 'Sí' : 'No',
      sh.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cap-table-${capTable.companyName || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalSharesAllocated = capTable.shareholders?.reduce((sum, sh) => sum + (sh.shares || 0), 0) || 0;
  const totalOwnership = capTable.shareholders?.reduce((sum, sh) => sum + (sh.ownershipPercentage || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Cap Table Management</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportToCSV}
            className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium"
          >
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <button
            onClick={() => setIsEditingConfig(true)}
            className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
          >
            Config
          </button>
        </div>
      </div>

      {apiError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {apiError}
        </div>
      )}

      {/* Mensaje si no está configurado */}
      {!capTable.companyName && !isEditingConfig && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                Configura el Cap Table primero
              </h3>
              <div className="mt-2 text-sm text-blue-800 dark:text-blue-200">
                <p>Antes de agregar shareholders, necesitas configurar:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Nombre de la empresa</li>
                  <li>Total de shares autorizadas</li>
                  <li>Reserved pool (opcional)</li>
                </ul>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setIsEditingConfig(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Configurar Cap Table
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Configuración del Cap Table */}
      {isEditingConfig && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg shadow p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Configuración del Cap Table</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la Empresa</label>
              <input
                type="text"
                value={capTable.companyName || ''}
                onChange={e => setCapTable({...capTable, companyName: e.target.value})}
                className={`w-full p-2 border rounded-lg ${formErrors.companyName ? 'border-red-500' : 'border-border'}`}
                placeholder="Mi Startup Inc."
              />
              {formErrors.companyName && (
                <p className="mt-1 text-sm text-red-600">{formErrors.companyName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total de Shares</label>
              <input
                type="number"
                value={capTable.totalShares || 0}
                onChange={e => setCapTable({...capTable, totalShares: Number(e.target.value)})}
                className={`w-full p-2 border rounded-lg ${formErrors.totalShares ? 'border-red-500' : 'border-border'}`}
                placeholder="10000000"
              />
              {formErrors.totalShares && (
                <p className="mt-1 text-sm text-red-600">{formErrors.totalShares}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reserved Pool</label>
              <input
                type="number"
                value={capTable.reservedPool || 0}
                onChange={e => setCapTable({...capTable, reservedPool: Number(e.target.value)})}
                className={`w-full p-2 border rounded-lg ${formErrors.reservedPool ? 'border-red-500' : 'border-border'}`}
                placeholder="2000000"
              />
              {formErrors.reservedPool && (
                <p className="mt-1 text-sm text-red-600">{formErrors.reservedPool}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={() => {
                setIsEditingConfig(false);
                setFormErrors({});
                loadCapTable();
              }}
              className="w-full sm:w-auto px-4 py-2 border border-border rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveConfig}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Guardar
            </button>
          </div>
        </motion.div>
      )}

      {/* Resumen */}
      {!isEditingConfig && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <div className="bg-card rounded-lg shadow p-3 md:p-4">
            <div className="text-xs md:text-sm text-muted-foreground">Empresa</div>
            <div className="text-lg md:text-xl font-semibold truncate" title={capTable.companyName || 'Sin nombre'}>
              {capTable.companyName || 'Sin nombre'}
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-3 md:p-4">
            <div className="text-xs md:text-sm text-muted-foreground">Total Shares</div>
            <div className="text-lg md:text-xl font-semibold">{(capTable.totalShares || 0).toLocaleString()}</div>
          </div>
          <div className="bg-card rounded-lg shadow p-3 md:p-4">
            <div className="text-xs md:text-sm text-muted-foreground">Asignados</div>
            <div className="text-lg md:text-xl font-semibold">{totalSharesAllocated.toLocaleString()}</div>
          </div>
          <div className="bg-card rounded-lg shadow p-3 md:p-4">
            <div className="text-xs md:text-sm text-muted-foreground">Reserved Pool</div>
            <div className="text-lg md:text-xl font-semibold">{(capTable.reservedPool || 0).toLocaleString()}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-1 hidden md:block">
              {capTable.totalShares ? `${(((capTable.reservedPool || 0) / capTable.totalShares) * 100).toFixed(2)}%` : '0%'}
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-3 md:p-4">
            <div className="text-xs md:text-sm text-muted-foreground">Fully Diluted</div>
            <div className="text-lg md:text-xl font-semibold">{(capTable.fullyDilutedShares || 0).toLocaleString()}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-1 hidden md:block">
              {capTable.totalShares ? `Disponible: ${(capTable.totalShares - (capTable.fullyDilutedShares || 0)).toLocaleString()}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Shareholders */}
      {capTable.companyName && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl font-semibold">Shareholders</h2>
            <button
              onClick={() => {
                if (!capTable.companyName || !capTable.totalShares) {
                  alert('Primero debes configurar el cap table');
                  setIsEditingConfig(true);
                  return;
                }
                setIsAddingShareholder(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
            >
              + Agregar Shareholder
            </button>
          </div>
        
        {capTable.shareholders && capTable.shareholders.length > 0 ? (
          <>
            {/* Vista Desktop - Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Equity Type</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Shares</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">% Ownership</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Vesting</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Investment</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                {capTable.shareholders.map((shareholder, index) => {
                  // Obtener el ID del shareholder de diferentes formas posibles
                  const shareholderId = shareholder._id?.toString() || 
                                      (shareholder as any).id?.toString() || 
                                      '';
                  
                  return (
                    <tr key={shareholderId || index} className="border-b border-border hover:bg-muted/20 transition-colors">
                      {/* Nombre */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                            {shareholder.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{shareholder.name}</div>
                            {shareholder.email && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {shareholder.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        {(() => {
                          const typeColors: {[key: string]: string} = {
                            'founder': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                            'investor': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                            'employee': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
                            'advisor': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                            'boardmember': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
                            'potential_investor': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                          };
                          const colorClass = typeColors[shareholder.type || ''] || 'bg-muted text-muted-foreground';
                          return (
                            <span className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${colorClass}`}>
                              {shareholder.type}
                            </span>
                          );
                        })()}
                      </td>
                      
                      {/* Equity Type */}
                      <td className="px-4 py-3">
                        {(() => {
                          const equityColors: {[key: string]: string} = {
                            'common': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                            'preferred': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
                            'options': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
                            'warrants': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          };
                          const colorClass = equityColors[shareholder.equityType || ''] || 'bg-muted text-muted-foreground';
                          return (
                            <span className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${colorClass}`}>
                              {shareholder.equityType}
                            </span>
                          );
                        })()}
                      </td>
                      
                      {/* Shares */}
                      <td className="px-4 py-3">
                        <div className="text-right">
                          <div className="font-semibold text-foreground flex items-center justify-end gap-1.5">
                            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {(shareholder.shares || 0).toLocaleString()}
                          </div>
                          {shareholder.fullyDiluted && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">Fully diluted</div>
                          )}
                        </div>
                      </td>
                      
                      {/* Ownership Percentage */}
                      <td className="px-4 py-3">
                        <div className="text-right space-y-1">
                          <div className="font-semibold text-foreground">
                            {(shareholder.ownershipPercentage || 0).toFixed(2)}%
                          </div>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden ml-auto">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                              style={{ width: `${Math.min((shareholder.ownershipPercentage || 0), 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {shareholder.vestingStartDate && shareholder.vestingPeriodMonths ? (
                          <div className="min-w-[200px]">
                            {(() => {
                              const totalShares = shareholder.shares || 0;
                              const vestedShares = (shareholder as any).vestedShares || 0;
                              const unvestedShares = (shareholder as any).unvestedShares || 0;
                              const vestedPercentage = totalShares > 0 ? (vestedShares / totalShares) * 100 : 0;
                              
                              return (
                                <div className="space-y-1">
                                  {/* Primera fila: Barra de progreso y porcentaje */}
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
                                        style={{ width: `${Math.min(vestedPercentage, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                      {vestedPercentage.toFixed(1)}%
                                    </span>
                                  </div>
                                  
                                  {/* Segunda fila: Shares y detalles compactos */}
                                  <div className="flex items-center justify-between gap-2 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                      <span className="font-medium text-foreground">
                                        {(vestedShares || 0).toLocaleString()}
                                      </span>
                                      <span className="text-muted-foreground">v</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
                                      <span className="text-muted-foreground">
                                        {(unvestedShares || 0).toLocaleString()}
                                      </span>
                                      <span className="text-muted-foreground">uv</span>
                                    </div>
                                    {shareholder.vestingCliffMonths && shareholder.vestingCliffMonths > 0 && (
                                      <span className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[9px] font-medium">
                                        C{shareholder.vestingCliffMonths}m
                                      </span>
                                    )}
                                    <span className="text-muted-foreground">
                                      {shareholder.vestingPeriodMonths}m
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <span className="px-2 py-0.5 text-[10px] text-muted-foreground bg-muted/50 rounded">
                              Sin vesting
                            </span>
                          </div>
                        )}
                      </td>
                      {/* Investment */}
                      <td className="px-4 py-3">
                        {shareholder.investmentAmount ? (
                          <div className="text-right">
                            <div className="font-semibold text-foreground flex items-center justify-end gap-1.5">
                              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              ${shareholder.investmentAmount.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">-</span>
                          </div>
                        )}
                      </td>
                      
                      {/* Date */}
                      <td className="px-4 py-3">
                        {shareholder.investmentDate ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-foreground">
                              {new Date(shareholder.investmentDate).toLocaleDateString('es-ES', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      
                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setEditingShareholder(shareholder)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (!shareholderId) {
                                alert('Error: No se pudo obtener el ID del shareholder');
                                console.error('Shareholder sin ID:', shareholder);
                                return;
                              }
                              handleDeleteShareholder(shareholderId);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors flex items-center gap-1.5"
                            disabled={!shareholderId}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

            {/* Vista Mobile - Cards */}
            <div className="md:hidden space-y-3 p-4">
              {capTable.shareholders.map((shareholder, index) => {
                const shareholderId = shareholder._id?.toString() || 
                                    (shareholder as any).id?.toString() || 
                                    '';
                const totalShares = shareholder.shares || 0;
                const vestedShares = (shareholder as any).vestedShares || 0;
                const vestedPercentage = totalShares > 0 ? (vestedShares / totalShares) * 100 : 0;
                
                const typeColors: {[key: string]: string} = {
                  'founder': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                  'investor': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                  'employee': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
                  'advisor': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                  'boardmember': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
                  'potential_investor': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                };
                const typeColorClass = typeColors[shareholder.type || ''] || 'bg-muted text-muted-foreground';

                const equityColors: {[key: string]: string} = {
                  'common': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                  'preferred': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
                  'options': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
                  'warrants': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                };
                const equityColorClass = equityColors[shareholder.equityType || ''] || 'bg-muted text-muted-foreground';

                return (
                  <div key={shareholderId || index} className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border">
                    {/* Header con nombre y acciones */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                          {shareholder.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">{shareholder.name}</div>
                          {shareholder.email && (
                            <div className="text-xs text-muted-foreground truncate">{shareholder.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingShareholder(shareholder)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (!shareholderId) {
                              alert('Error: No se pudo obtener el ID del shareholder');
                              return;
                            }
                            handleDeleteShareholder(shareholderId);
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Badges de tipo */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${typeColorClass}`}>
                        {shareholder.type}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${equityColorClass}`}>
                        {shareholder.equityType}
                      </span>
                    </div>

                    {/* Información principal */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Shares</div>
                        <div className="font-semibold text-foreground">
                          {(shareholder.shares || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Ownership</div>
                        <div className="font-semibold text-foreground">
                          {(shareholder.ownershipPercentage || 0).toFixed(2)}%
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                            style={{ width: `${Math.min((shareholder.ownershipPercentage || 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vesting */}
                    {shareholder.vestingStartDate && shareholder.vestingPeriodMonths ? (
                      <div className="pt-2 border-t border-border">
                        <div className="text-xs text-muted-foreground mb-1.5">Vesting</div>
                        <div className="space-y-1.5">
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                              style={{ width: `${Math.min(vestedPercentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <span className="font-medium">{(vestedShares || 0).toLocaleString()} v</span>
                            </div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {vestedPercentage.toFixed(1)}%
                            </span>
                            {shareholder.vestingCliffMonths && shareholder.vestingCliffMonths > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[9px]">
                                C{shareholder.vestingCliffMonths}m
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Investment y Date */}
                    {(shareholder.investmentAmount || shareholder.investmentDate) && (
                      <div className="pt-2 border-t border-border grid grid-cols-2 gap-3 text-xs">
                        {shareholder.investmentAmount && (
                          <div>
                            <div className="text-muted-foreground mb-1">Investment</div>
                            <div className="font-semibold text-foreground">
                              ${shareholder.investmentAmount.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {shareholder.investmentDate && (
                          <div>
                            <div className="text-muted-foreground mb-1">Date</div>
                            <div className="font-semibold text-foreground">
                              {new Date(shareholder.investmentDate).toLocaleDateString('es-ES', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No hay shareholders registrados. Agrega el primero.
          </div>
        )}
        </div>
      )}

      {/* Tabla de Shareholders - Placeholder si no está configurado */}
      {!capTable.companyName && !isEditingConfig && (
        <div className="bg-card rounded-lg shadow p-8 text-center text-muted-foreground">
          <p>Configura el cap table para comenzar a agregar shareholders</p>
        </div>
      )}

      {/* Modal para agregar/editar shareholder */}
      {(isAddingShareholder || editingShareholder) && (
        <ShareholderForm
          shareholder={editingShareholder || undefined}
          capTable={capTable}
          onSave={(data) => {
            if (editingShareholder) {
              handleUpdateShareholder(editingShareholder._id?.toString() || '', data);
            } else {
              handleAddShareholder(data);
            }
          }}
          onCancel={() => {
            setIsAddingShareholder(false);
            setEditingShareholder(null);
          }}
        />
      )}

      {/* Modal para confirmar eliminación y decidir qué hacer con las acciones */}
      {deletingShareholder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Eliminar Shareholder</h2>
              <button
                onClick={() => {
                  setDeletingShareholder(null);
                  setDeleteAction(null);
                  setTransferToShareholderId('');
                }}
                className="md:hidden p-2 hover:bg-muted rounded-lg"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="font-medium">{deletingShareholder.name}</p>
              <p className="text-sm text-muted-foreground">
                {deletingShareholder.shares?.toLocaleString()} shares ({deletingShareholder.ownershipPercentage?.toFixed(2)}%)
              </p>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              ¿Qué quieres hacer con las {deletingShareholder.shares?.toLocaleString()} acciones de {deletingShareholder.name}?
            </p>

            <div className="space-y-3 mb-4">
              {/* Opción 1: Regresar al reserved pool (solo si es employee) */}
              {deletingShareholder.type === 'employee' && (
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="deleteAction"
                    value="return_to_reserved"
                    checked={deleteAction === 'return_to_reserved'}
                    onChange={() => setDeleteAction('return_to_reserved')}
                    className="mt-0.5"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-green-700 dark:text-green-300">
                      Regresar al Reserved Pool
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Las acciones volverán al reserved pool para futuras asignaciones a empleados.
                    </div>
                  </div>
                </label>
              )}

              {/* Opción 2: Transferir a otro shareholder */}
              {capTable.shareholders && capTable.shareholders.filter(sh => {
                const shId = sh._id?.toString() || (sh as any).id?.toString();
                const delId = deletingShareholder._id?.toString() || (deletingShareholder as any).id?.toString();
                return shId !== delId;
              }).length > 0 && (
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="deleteAction"
                    value="transfer"
                    checked={deleteAction === 'transfer'}
                    onChange={() => setDeleteAction('transfer')}
                    className="mt-0.5"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-blue-700 dark:text-blue-300">
                      Transferir a otro shareholder
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Las acciones se transferirán a otro shareholder existente.
                    </div>
                  </div>
                </label>
              )}

              {/* Opción 3: Eliminar completamente */}
              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="deleteAction"
                  value="remove"
                  checked={deleteAction === 'remove'}
                  onChange={() => setDeleteAction('remove')}
                  className="mt-0.5"
                />
                <div className="ml-3 flex-1">
                  <div className="font-medium text-red-700 dark:text-red-300">
                    Eliminar completamente
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Las acciones se eliminarán y el outstanding se reducirá. El total autorizado no cambiará.
                  </div>
                </div>
              </label>
            </div>

            {/* Selector para transferir */}
            {deleteAction === 'transfer' && capTable.shareholders && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5">Transferir a:</label>
                <select
                  value={transferToShareholderId}
                  onChange={(e) => setTransferToShareholderId(e.target.value)}
                  className="w-full p-2 border border-border rounded-lg"
                >
                  <option value="">Selecciona un shareholder</option>
                  {capTable.shareholders
                    .filter(sh => {
                      const shId = sh._id?.toString() || (sh as any).id?.toString();
                      const delId = deletingShareholder._id?.toString() || (deletingShareholder as any).id?.toString();
                      return shId !== delId;
                    })
                    .map((sh) => (
                      <option key={sh._id?.toString() || (sh as any).id?.toString()} value={sh._id?.toString() || (sh as any).id?.toString()}>
                        {sh.name} ({sh.shares?.toLocaleString()} shares actuales)
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end mt-4 pt-4 border-t border-border">
              <button
                onClick={() => {
                  setDeletingShareholder(null);
                  setDeleteAction(null);
                  setTransferToShareholderId('');
                }}
                className="w-full sm:w-auto px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteShareholder}
                disabled={!deleteAction || (deleteAction === 'transfer' && !transferToShareholderId)}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Confirmar Eliminación
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Componente de formulario para shareholder
function ShareholderForm({ 
  shareholder, 
  onSave, 
  onCancel,
  capTable
}: { 
  shareholder?: IShareholder; 
  onSave: (data: Partial<IShareholder>) => void; 
  onCancel: () => void;
  capTable?: Partial<ICapTable>;
}) {
  const [formData, setFormData] = useState<Partial<IShareholder>>({
    name: shareholder?.name || '',
    email: shareholder?.email || '',
    type: shareholder?.type || 'investor',
    equityType: shareholder?.equityType || 'common',
    shares: shareholder?.shares || 0,
    investmentAmount: shareholder?.investmentAmount,
    investmentDate: shareholder?.investmentDate ? new Date(shareholder.investmentDate).toISOString().split('T')[0] : undefined,
    fullyDiluted: shareholder?.fullyDiluted || false,
    notes: shareholder?.notes || '',
    // Vesting fields
    vestingStartDate: shareholder?.vestingStartDate ? new Date(shareholder.vestingStartDate).toISOString().split('T')[0] : undefined,
    vestingCliffMonths: shareholder?.vestingCliffMonths || 0,
    vestingPeriodMonths: shareholder?.vestingPeriodMonths,
    vestingSchedule: shareholder?.vestingSchedule || 'linear'
  });
  const [hasVesting, setHasVesting] = useState<boolean>(
    !!(shareholder?.vestingStartDate && shareholder?.vestingPeriodMonths)
  );
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isTransfer, setIsTransfer] = useState(false);
  const [transferFromShareholderId, setTransferFromShareholderId] = useState<string>('');
  const [fromReservedPool, setFromReservedPool] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name?.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.type) newErrors.type = 'El tipo es requerido';
    if (!formData.equityType) newErrors.equityType = 'El tipo de equity es requerido';
    if (formData.shares === undefined || formData.shares < 0) {
      newErrors.shares = 'Las shares deben ser mayor o igual a 0';
    }
    
    // Validar asignación desde reserved pool
    if (fromReservedPool && capTable) {
      const reservedPool = capTable.reservedPool || 0;
      if ((formData.shares || 0) > reservedPool) {
        newErrors.shares = `El reserved pool solo tiene ${reservedPool.toLocaleString()} shares disponibles`;
      }
    }
    
    // Validar transferencia
    if (isTransfer && !transferFromShareholderId) {
      newErrors.transfer = 'Debes seleccionar un shareholder del cual transferir';
    }
    
    if (isTransfer && transferFromShareholderId && capTable) {
      const sourceShareholder = capTable.shareholders?.find(
        (sh) => sh._id?.toString() === transferFromShareholderId
      );
      if (sourceShareholder && (formData.shares || 0) > (sourceShareholder.shares || 0)) {
        newErrors.shares = `El shareholder origen solo tiene ${sourceShareholder.shares?.toLocaleString()} shares disponibles`;
      }
    }

    // Validar vesting si está activado
    if (hasVesting) {
      if (!formData.vestingStartDate) {
        newErrors.vestingStartDate = 'La fecha de inicio de vesting es requerida';
      }
      if (!formData.vestingPeriodMonths || formData.vestingPeriodMonths < 1) {
        newErrors.vestingPeriodMonths = 'El período de vesting debe ser al menos 1 mes';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Preparar datos de vesting
    const vestingData: any = {};
    if (hasVesting) {
      // Enviar la fecha como string ISO para que se serialice correctamente en JSON
      vestingData.vestingStartDate = formData.vestingStartDate || undefined;
      vestingData.vestingCliffMonths = formData.vestingCliffMonths || 0;
      vestingData.vestingPeriodMonths = formData.vestingPeriodMonths;
      vestingData.vestingSchedule = formData.vestingSchedule || 'linear';
    }

    const shareholderData = {
      ...formData,
      investmentDate: formData.investmentDate || undefined,
      // Vesting fields - solo incluir si hasVesting es true
      ...(hasVesting ? vestingData : {}),
      // Agregar información de transferencia si aplica
      ...(isTransfer && transferFromShareholderId ? { transferFromShareholderId } : {}),
      // Agregar información de reserved pool si aplica
      ...(fromReservedPool ? { fromReservedPool: true } : {})
    };

    onSave(shareholderData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-lg shadow-lg p-4 md:p-6 w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold">
            {shareholder ? 'Editar Shareholder' : 'Agregar Shareholder'}
          </h2>
          <button
            onClick={onCancel}
            className="md:hidden p-2 hover:bg-muted rounded-lg"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className={`w-full p-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-border'}`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full p-2 border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo *</label>
              <select
                value={formData.type}
                onChange={e => {
                  const newType = e.target.value as any;
                  setFormData({...formData, type: newType});
                  // Si cambia a algo que no sea employee, desactivar fromReservedPool
                  if (newType !== 'employee') {
                    setFromReservedPool(false);
                  }
                }}
                className={`w-full p-2 border rounded-lg ${errors.type ? 'border-red-500' : 'border-border'}`}
              >
                <option value="founder">Founder</option>
                <option value="investor">Investor</option>
                <option value="employee">Employee</option>
                <option value="advisor">Advisor</option>
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
              
              {/* Información contextual según el tipo */}
              {!shareholder && formData.type === 'founder' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Los founders normalmente reciben acciones emitidas al inicio de la compañía. Por defecto se emitirán nuevas acciones.
                </p>
              )}
              
              {/* Opción para empleados: asignar desde reserved pool - aparece justo después del campo Tipo */}
              {!shareholder && formData.type === 'employee' && capTable && capTable.reservedPool && capTable.reservedPool > 0 && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="fromReservedPool"
                      checked={fromReservedPool}
                      onChange={(e) => {
                        setFromReservedPool(e.target.checked);
                        if (e.target.checked) {
                          setIsTransfer(false);
                          setTransferFromShareholderId('');
                          // Cambiar equity type a 'option' por defecto cuando viene del reserved pool
                          if (formData.equityType !== 'option') {
                            setFormData({...formData, equityType: 'option'});
                          }
                        }
                      }}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    <label htmlFor="fromReservedPool" className="ml-2 text-sm flex-1">
                      <span className="font-medium text-green-700 dark:text-green-300">
                        Asignar desde Reserved Pool
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {capTable.reservedPool?.toLocaleString()} shares disponibles. El reserved pool se reducirá automáticamente.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Equity Type *</label>
              <select
                value={formData.equityType}
                onChange={e => setFormData({...formData, equityType: e.target.value as any})}
                className={`w-full p-2 border rounded-lg ${errors.equityType ? 'border-red-500' : 'border-border'} ${fromReservedPool ? 'bg-muted cursor-not-allowed' : ''}`}
                disabled={fromReservedPool} // Deshabilitar si viene del reserved pool (siempre será option)
              >
                <option value="common">Common</option>
                <option value="preferred">Preferred</option>
                <option value="SAFE">SAFE</option>
                <option value="warrant">Warrant</option>
                <option value="option">Option</option>
              </select>
              {errors.equityType && <p className="mt-1 text-sm text-red-600">{errors.equityType}</p>}
              {fromReservedPool && (
                <p className="mt-1 text-xs text-muted-foreground">
                  El equity type es "option" cuando se asigna desde el reserved pool
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shares *</label>
              <input
                type="number"
                value={formData.shares || 0}
                onChange={e => setFormData({...formData, shares: Number(e.target.value)})}
                className={`w-full p-2 border rounded-lg ${errors.shares ? 'border-red-500' : 'border-border'}`}
                min="0"
              />
              {errors.shares && <p className="mt-1 text-sm text-red-600">{errors.shares}</p>}
              
              {/* Opción de transferencia - aparece para founders/investors cuando no es desde reserved pool */}
              {!shareholder && !fromReservedPool && (formData.type === 'founder' || formData.type === 'investor' || formData.type === 'advisor') && capTable && capTable.shareholders && capTable.shareholders.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="isTransfer"
                      checked={isTransfer}
                      onChange={(e) => {
                        setIsTransfer(e.target.checked);
                        if (e.target.checked) {
                          setFromReservedPool(false);
                        }
                      }}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    <label htmlFor="isTransfer" className="ml-2 text-sm flex-1">
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        Transferir acciones de un shareholder existente
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {formData.type === 'founder' 
                          ? 'En lugar de emitir nuevas acciones. Útil si un founder transfiere parte de su equity a otro founder.'
                          : 'En lugar de emitir nuevas acciones. El total autorizado no cambiará.'}
                      </span>
                    </label>
                  </div>
                  
                  {isTransfer && (
                    <div className="mt-3 ml-6">
                      <label className="block text-sm font-medium mb-1.5">Transferir de:</label>
                      <select
                        value={transferFromShareholderId}
                        onChange={(e) => setTransferFromShareholderId(e.target.value)}
                        className={`w-full p-2 border rounded-lg text-sm ${errors.transfer ? 'border-red-500' : 'border-border'}`}
                      >
                        <option value="">Selecciona un shareholder</option>
                        {capTable.shareholders.map((sh) => (
                          <option key={sh._id?.toString() || ''} value={sh._id?.toString() || ''}>
                            {sh.name} ({sh.shares?.toLocaleString()} shares disponibles)
                          </option>
                        ))}
                      </select>
                      {errors.transfer && <p className="mt-1 text-sm text-red-600">{errors.transfer}</p>}
                    </div>
                  )}
                </div>
              )}
              
              {/* Mensaje informativo según el tipo */}
              {!shareholder && !isTransfer && !fromReservedPool && (
                <div className="mt-1">
                  {formData.type === 'founder' ? (
                    <p className="text-xs text-muted-foreground">
                      Por defecto se emitirán nuevas acciones. Si no hay espacio disponible, se te pedirá aumentar el total autorizado automáticamente.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Si no hay espacio disponible, se te pedirá aumentar el total autorizado automáticamente
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Investment Amount</label>
              <input
                type="number"
                value={formData.investmentAmount || ''}
                onChange={e => setFormData({...formData, investmentAmount: e.target.value ? Number(e.target.value) : undefined})}
                className="w-full p-2 border border-border rounded-lg"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Investment Date</label>
              <input
                type="date"
                value={formData.investmentDate || ''}
                onChange={e => setFormData({...formData, investmentDate: e.target.value})}
                className="w-full p-2 border border-border rounded-lg"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="fullyDiluted"
                checked={formData.fullyDiluted || false}
                onChange={e => setFormData({...formData, fullyDiluted: e.target.checked})}
                className="rounded border-gray-300"
              />
              <label htmlFor="fullyDiluted" className="ml-2 text-sm">Fully Diluted</label>
            </div>
          </div>

          {/* Sección de Vesting - Solo para founder, employee, advisor */}
          {(formData.type === 'founder' || formData.type === 'employee' || formData.type === 'advisor') && (
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="hasVesting"
                  checked={hasVesting}
                  onChange={(e) => {
                    setHasVesting(e.target.checked);
                    if (!e.target.checked) {
                      setFormData({
                        ...formData,
                        vestingStartDate: undefined,
                        vestingCliffMonths: 0,
                        vestingPeriodMonths: undefined,
                        vestingSchedule: 'linear'
                      });
                    } else {
                      // Valores por defecto comunes
                      if (!formData.vestingStartDate) {
                        setFormData({
                          ...formData,
                          vestingStartDate: new Date().toISOString().split('T')[0],
                          vestingCliffMonths: formData.type === 'founder' ? 12 : 0,
                          vestingPeriodMonths: formData.type === 'founder' ? 48 : 48,
                          vestingSchedule: 'linear'
                        });
                      }
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <label htmlFor="hasVesting" className="ml-2 text-sm font-medium">
                  Tiene Vesting Schedule
                </label>
              </div>

              {hasVesting && (
                <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha de Inicio de Vesting *</label>
                    <input
                      type="date"
                      value={formData.vestingStartDate || ''}
                      onChange={e => setFormData({...formData, vestingStartDate: e.target.value})}
                      className={`w-full p-2 border rounded-lg ${errors.vestingStartDate ? 'border-red-500' : 'border-border'}`}
                      required={hasVesting}
                    />
                    {errors.vestingStartDate && <p className="mt-1 text-sm text-red-600">{errors.vestingStartDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Período de Vesting (meses) *</label>
                    <input
                      type="number"
                      value={formData.vestingPeriodMonths || ''}
                      onChange={e => setFormData({...formData, vestingPeriodMonths: e.target.value ? Number(e.target.value) : undefined})}
                      className={`w-full p-2 border rounded-lg ${errors.vestingPeriodMonths ? 'border-red-500' : 'border-border'}`}
                      min="1"
                      placeholder="48 (4 años)"
                      required={hasVesting}
                    />
                    {errors.vestingPeriodMonths && <p className="mt-1 text-sm text-red-600">{errors.vestingPeriodMonths}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ej: 48 meses = 4 años
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cliff (meses)</label>
                    <input
                      type="number"
                      value={formData.vestingCliffMonths || 0}
                      onChange={e => setFormData({...formData, vestingCliffMonths: Number(e.target.value) || 0})}
                      className="w-full p-2 border border-border rounded-lg"
                      min="0"
                      placeholder="12"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Período antes del cual no se veste nada (ej: 12 meses)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Schedule de Vesting</label>
                    <select
                      value={formData.vestingSchedule || 'linear'}
                      onChange={e => setFormData({...formData, vestingSchedule: e.target.value as any})}
                      className="w-full p-2 border border-border rounded-lg"
                    >
                      <option value="linear">Lineal (continuo)</option>
                      <option value="monthly">Mensual</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="annual">Anual</option>
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cómo se distribuyen las acciones durante el período
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full p-2 border border-border rounded-lg"
              rows={3}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2 border border-border rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              {shareholder ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

