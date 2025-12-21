'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVersioning } from '@/hooks/useVersioning';

interface Version {
  _id: string;
  version: number;
  versionLabel?: string;
  period?: {
    type: string;
    value: string;
  };
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    description?: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  metadata?: {
    description?: string;
    tags?: string[];
    isMajor?: boolean;
  };
}

interface VersionHistoryProps {
  entityType: 'document' | 'cap_table' | 'metric' | 'update' | 'other';
  entityId: string;
  onClose: () => void;
}

export default function VersionHistory({ entityType, entityId, onClose }: VersionHistoryProps) {
  const { getVersions } = useVersioning();
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const data = await getVersions(entityType, entityId);
        setVersions(data || []);
      } catch (error) {
        console.error('Error loading versions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVersions();
  }, [entityType, entityId, getVersions]);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Historial de Versiones</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay versiones registradas
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version, index) => (
              <motion.div
                key={version._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-border rounded-lg p-4 bg-muted/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {version.versionLabel || `v${version.version}`}
                      </span>
                      {version.metadata?.isMajor && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs font-medium">
                          Major
                        </span>
                      )}
                      {version.period && (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                          {version.period.value}
                        </span>
                      )}
                    </div>
                    {version.metadata?.description && (
                      <p className="text-sm text-muted-foreground">{version.metadata.description}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{formatDate(version.createdAt)}</div>
                    <div className="mt-1">{version.createdBy.name}</div>
                  </div>
                </div>
                
                {version.changes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Cambios</div>
                    <div className="space-y-2">
                      {version.changes.map((change, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="font-medium">{change.field}</div>
                          {change.description && (
                            <div className="text-xs text-muted-foreground">{change.description}</div>
                          )}
                          <div className="flex gap-4 mt-1 text-xs">
                            <div className="flex-1">
                              <span className="text-muted-foreground">Antes:</span>
                              <div className="mt-1 p-2 bg-destructive/10 rounded text-destructive">
                                {typeof change.oldValue === 'object' 
                                  ? JSON.stringify(change.oldValue, null, 2)
                                  : String(change.oldValue || 'N/A')}
                              </div>
                            </div>
                            <div className="flex-1">
                              <span className="text-muted-foreground">Después:</span>
                              <div className="mt-1 p-2 bg-emerald-500/10 rounded text-emerald-600 dark:text-emerald-400">
                                {typeof change.newValue === 'object'
                                  ? JSON.stringify(change.newValue, null, 2)
                                  : String(change.newValue || 'N/A')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}


