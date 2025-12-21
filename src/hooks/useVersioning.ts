import { useState, useCallback } from 'react';
import { usePeriod } from '@/contexts/PeriodContext';

interface VersionChange {
  field: string;
  oldValue: any;
  newValue: any;
  description?: string;
}

interface CreateVersionParams {
  entityType: 'document' | 'cap_table' | 'metric' | 'update' | 'other';
  entityId: string;
  changes: VersionChange[];
  metadata?: {
    description?: string;
    tags?: string[];
    isMajor?: boolean;
  };
}

export function useVersioning() {
  const { currentPeriod } = usePeriod();
  const [isCreating, setIsCreating] = useState(false);

  const createVersion = useCallback(async (params: CreateVersionParams) => {
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const response = await fetch('/api/versions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...params,
          period: {
            type: currentPeriod.type,
            value: currentPeriod.value
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear versión');
      }

      const data = await response.json();
      return data.version;
    } catch (error) {
      console.error('Error creating version:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [currentPeriod]);

  const getVersions = useCallback(async (
    entityType: string,
    entityId: string,
    periodValue?: string
  ) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const params = new URLSearchParams({
        entityType,
        entityId
      });

      if (periodValue) {
        params.append('period', periodValue);
      }

      const response = await fetch(`/api/versions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener versiones');
      }

      const data = await response.json();
      return data.versions;
    } catch (error) {
      console.error('Error getting versions:', error);
      throw error;
    }
  }, []);

  return {
    createVersion,
    getVersions,
    isCreating,
    currentPeriod
  };
}


