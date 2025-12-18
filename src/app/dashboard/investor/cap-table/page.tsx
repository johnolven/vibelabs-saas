'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICapTable } from '@/models/CapTable';

export default function CapTableView() {
  const [capTable, setCapTable] = useState<Partial<ICapTable>>({
    companyName: '',
    totalShares: 0,
    reservedPool: 0,
    shareholders: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

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

  const exportToCSV = () => {
    if (!capTable.shareholders || capTable.shareholders.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = ['Nombre', 'Email', 'Tipo', 'Tipo de Equity', 'Shares', '% Ownership', 'Investment Amount', 'Investment Date'];
    const rows = capTable.shareholders.map(sh => [
      sh.name || '',
      sh.email || '',
      sh.type || '',
      sh.equityType || '',
      sh.shares?.toString() || '0',
      sh.ownershipPercentage?.toFixed(2) + '%' || '0%',
      sh.investmentAmount?.toLocaleString() || '',
      sh.investmentDate ? new Date(sh.investmentDate).toLocaleDateString() : ''
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
  const totalInvestment = capTable.shareholders?.reduce((sum, sh) => sum + (sh.investmentAmount || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cap Table</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'chart' : 'table')}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            {viewMode === 'table' ? 'Ver Gráfico' : 'Ver Tabla'}
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {apiError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {apiError}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow p-4">
          <div className="text-sm text-muted-foreground">Empresa</div>
          <div className="text-xl font-semibold">{capTable.companyName || 'Sin nombre'}</div>
        </div>
        <div className="bg-card rounded-lg shadow p-4">
          <div className="text-sm text-muted-foreground">Total Shares</div>
          <div className="text-xl font-semibold">{(capTable.totalShares || 0).toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-lg shadow p-4">
          <div className="text-sm text-muted-foreground">Shares Asignados</div>
          <div className="text-xl font-semibold">{totalSharesAllocated.toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-lg shadow p-4">
          <div className="text-sm text-muted-foreground">Ownership Total</div>
          <div className="text-xl font-semibold">{totalOwnership.toFixed(2)}%</div>
        </div>
      </div>

      {/* Vista de Tabla */}
      {viewMode === 'table' && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-semibold">Shareholders</h2>
          </div>
          
          {capTable.shareholders && capTable.shareholders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Equity Type</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Shares</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">% Ownership</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Investment</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {capTable.shareholders
                    .sort((a, b) => (b.ownershipPercentage || 0) - (a.ownershipPercentage || 0))
                    .map((shareholder, index) => (
                    <tr key={shareholder._id?.toString() || index} className="border-b border-border hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{shareholder.name}</div>
                        {shareholder.email && (
                          <div className="text-sm text-muted-foreground">{shareholder.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-muted rounded text-xs">{shareholder.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">{shareholder.equityType}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(shareholder.shares || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(shareholder.ownershipPercentage || 0).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        {shareholder.investmentAmount ? `$${shareholder.investmentAmount.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {shareholder.investmentDate ? new Date(shareholder.investmentDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No hay shareholders registrados.
            </div>
          )}
        </div>
      )}

      {/* Vista de Gráfico */}
      {viewMode === 'chart' && (
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Distribución de Ownership</h2>
          {capTable.shareholders && capTable.shareholders.length > 0 ? (
            <div className="space-y-4">
              {capTable.shareholders
                .sort((a, b) => (b.ownershipPercentage || 0) - (a.ownershipPercentage || 0))
                .map((shareholder, index) => {
                  const percentage = shareholder.ownershipPercentage || 0;
                  return (
                    <div key={shareholder._id?.toString() || index}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{shareholder.name}</span>
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-4">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="bg-primary h-4 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No hay datos para mostrar.
            </div>
          )}
        </div>
      )}

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Reserved Pool</h3>
          <div className="text-2xl font-bold">{(capTable.reservedPool || 0).toLocaleString()} shares</div>
          <div className="text-sm text-muted-foreground mt-1">
            {capTable.totalShares ? 
              `${(((capTable.reservedPool || 0) / capTable.totalShares) * 100).toFixed(2)}% del total` : 
              '0% del total'}
          </div>
        </div>
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Total Investment</h3>
          <div className="text-2xl font-bold">${totalInvestment.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {capTable.shareholders?.filter(sh => sh.investmentAmount).length || 0} inversores
          </div>
        </div>
      </div>
    </div>
  );
}

