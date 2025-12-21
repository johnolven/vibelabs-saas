'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePeriod } from '@/contexts/PeriodContext';
import { useVersioning } from '@/hooks/useVersioning';
import { usePageTracking } from '@/hooks/usePageTracking';
import Link from 'next/link';

interface Document {
  _id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  folder: 'legal' | 'financials' | 'board_materials' | 'pitch_deck' | 'other';
  description?: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
  accessLevel: string[];
  downloadCount: number;
  lastDownloadedAt?: string;
  viewCount?: number;
  version: number;
  isActive: boolean;
  shareLinks?: Array<{
    linkId: string;
    viewCount?: number;
  }>;
  totalViewCount?: number;
}

const FOLDER_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  legal: { label: 'Legal', icon: '⚖️', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  financials: { label: 'Financieros', icon: '💰', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  board_materials: { label: 'Board Materials', icon: '📋', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  pitch_deck: { label: 'Pitch Deck', icon: '📊', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  other: { label: 'Otros', icon: '📁', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
};

const ACCESS_LEVELS = [
  { value: 'public', label: 'Público' },
  { value: 'founder', label: 'Founder' },
  { value: 'admin', label: 'Admin' },
  { value: 'investor', label: 'Investor' },
  { value: 'boardmember', label: 'Board Member' },
  { value: 'potential_investor', label: 'Potential Investor' }
];

function DataRoomContent() {
  const searchParams = useSearchParams();
  const folderParam = searchParams.get('folder');
  const { currentPeriod } = usePeriod();
  const { createVersion } = useVersioning();
  
  usePageTracking({ section: 'documents', metadata: { folder: folderParam || 'all' } });
  
  const [allDocuments, setAllDocuments] = useState<Document[]>([]); // Todos los documentos para calcular stats
  const [documents, setDocuments] = useState<Document[]>([]); // Documentos filtrados por carpeta
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>(folderParam || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null);
  const [showStats, setShowStats] = useState<string | null>(null);
  const [documentStats, setDocumentStats] = useState<any>(null);
  const [showShareLinks, setShowShareLinks] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [shareLinkForm, setShareLinkForm] = useState({
    password: '',
    isPublic: true,
    expiresAt: '',
    allowDownload: false
  });
  const router = useRouter();
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    folder: 'legal' as Document['folder'],
    description: '',
    accessLevel: ['public'] as string[]
  });

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');
      
      // Cargar TODOS los documentos del período para calcular stats
      const allParams = new URLSearchParams();
      allParams.append('period', currentPeriod.value);
      
      const allResponse = await fetch(`/api/documents?${allParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!allResponse.ok) {
        throw new Error(`Error al cargar documentos: ${allResponse.status}`);
      }
      
      const allData = await allResponse.json();
      const documentsList = allData.documents || [];
      
      // Cargar enlaces compartidos y sus estadísticas para cada documento
      const documentsWithStats = await Promise.all(
        documentsList.map(async (doc: Document) => {
          try {
            const shareResponse = await fetch(`/api/documents/${doc._id}/share`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (shareResponse.ok) {
              const shareData = await shareResponse.json();
              const shareLinks = shareData.shareLinks || [];
              
              // Calcular total de vistas de enlaces compartidos
              const shareLinksViewCount = shareLinks.reduce((total: number, link: any) => {
                return total + (link.viewCount || 0);
              }, 0);
              
              return {
                ...doc,
                shareLinks: shareLinks,
                totalViewCount: (doc.viewCount || 0) + shareLinksViewCount
              };
            }
            
            return {
              ...doc,
              shareLinks: [],
              totalViewCount: doc.viewCount || 0
            };
          } catch (err) {
            console.error(`Error al cargar enlaces compartidos para ${doc._id}:`, err);
            return {
              ...doc,
              shareLinks: [],
              totalViewCount: doc.viewCount || 0
            };
          }
        })
      );
      
      setAllDocuments(documentsWithStats);
      
      // Filtrar por carpeta si es necesario
      if (selectedFolder !== 'all') {
        const filtered = documentsWithStats.filter((doc: Document) => doc.folder === selectedFolder);
        setDocuments(filtered);
      } else {
        setDocuments(documentsWithStats);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, currentPeriod]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

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

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📄';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      setApiError('Por favor selecciona un archivo');
      return;
    }

    setIsUploading(true);
    setApiError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('folder', uploadForm.folder);
      formData.append('description', uploadForm.description);
      formData.append('accessLevel', JSON.stringify(uploadForm.accessLevel));
      formData.append('period', currentPeriod.value);
      formData.append('periodType', currentPeriod.type);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir documento');
      }

      const result = await response.json();
      
      // Crear versión inicial
      try {
        await createVersion({
          entityType: 'document',
          entityId: result.document._id,
          changes: [{
            field: 'created',
            oldValue: null,
            newValue: result.document.originalName,
            description: 'Documento creado'
          }],
          metadata: {
            description: 'Versión inicial del documento',
            isMajor: true
          }
        });
      } catch (versionError) {
        console.error('Error creating version:', versionError);
        // No fallar si la versión no se crea
      }

      // Si el documento tiene el período correcto, agregarlo inmediatamente a las listas
      if (result.document.period?.value === currentPeriod.value) {
        setAllDocuments(prev => {
          // Verificar que no esté ya en la lista
          const exists = prev.some(d => d._id === result.document._id);
          if (exists) return prev;
          return [result.document, ...prev];
        });
        
        // También agregarlo a documents si corresponde a la carpeta seleccionada
        if (selectedFolder === 'all' || result.document.folder === selectedFolder) {
          setDocuments(prev => {
            const exists = prev.some(d => d._id === result.document._id);
            if (exists) return prev;
            return [result.document, ...prev];
          });
        }
      }

      // Forzar recarga de documentos para asegurar sincronización
      await loadDocuments();
      setIsUploadModalOpen(false);
      setUploadForm({ file: null, folder: 'legal', description: '', accessLevel: ['public'] });
      showSuccess('Documento subido exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDocument) return;

    setIsUploading(true);
    setApiError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const formData = new FormData();
      if (uploadForm.file) {
        formData.append('file', uploadForm.file);
      }
      formData.append('folder', uploadForm.folder);
      formData.append('description', uploadForm.description);
      formData.append('accessLevel', JSON.stringify(uploadForm.accessLevel));
      formData.append('period', currentPeriod.value);
      formData.append('periodType', currentPeriod.type);

      const response = await fetch(`/api/documents/${selectedDocument._id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar documento');
      }

      const result = await response.json();
      
      // Crear versión con los cambios
      try {
        const changes = [];
        if (uploadForm.file) {
          changes.push({
            field: 'file',
            oldValue: selectedDocument.originalName,
            newValue: uploadForm.file.name,
            description: 'Archivo reemplazado'
          });
        }
        if (uploadForm.folder !== selectedDocument.folder) {
          changes.push({
            field: 'folder',
            oldValue: selectedDocument.folder,
            newValue: uploadForm.folder,
            description: 'Carpeta cambiada'
          });
        }
        if (uploadForm.description !== (selectedDocument.description || '')) {
          changes.push({
            field: 'description',
            oldValue: selectedDocument.description || '',
            newValue: uploadForm.description,
            description: 'Descripción actualizada'
          });
        }
        
        if (changes.length > 0) {
          await createVersion({
            entityType: 'document',
            entityId: selectedDocument._id,
            changes,
            metadata: {
              description: 'Documento actualizado',
              isMajor: !!uploadForm.file
            }
          });
        }
      } catch (versionError) {
        console.error('Error creating version:', versionError);
        // No fallar si la versión no se crea
      }

      // Forzar recarga de documentos para asegurar sincronización
      await loadDocuments();
      setIsEditing(false);
      setSelectedDocument(null);
      setUploadForm({ file: null, folder: 'legal', description: '', accessLevel: ['public'] });
      showSuccess('Documento actualizado exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar documento');
      }

      // Remover el documento de las listas inmediatamente
      setAllDocuments(prev => prev.filter(d => d._id !== documentId));
      setDocuments(prev => prev.filter(d => d._id !== documentId));
      
      // Forzar recarga de documentos para asegurar sincronización
      await loadDocuments();
      showSuccess('Documento eliminado exitosamente');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const response = await fetch(`/api/documents/${document._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al descargar documento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await loadDocuments();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Error al descargar');
    }
  };

  const toggleMenu = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(openMenuId === docId ? null : docId);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  const folderStats = useMemo(() => {
    // Usar allDocuments para calcular stats, no documents (que está filtrado por carpeta)
    return Object.keys(FOLDER_CONFIG).reduce((acc, folder) => {
      acc[folder] = allDocuments.filter(d => d.folder === folder).length;
      return acc;
    }, {} as Record<string, number>);
  }, [allDocuments]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">Data Room</h1>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
              {currentPeriod.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Gestiona y organiza todos los documentos</p>
        </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedDocument(null);
              setIsEditing(false);
              setIsUploadModalOpen(true);
              setUploadForm({ file: null, folder: 'legal', description: '', accessLevel: ['public'] });
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Subir Documento
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

      {/* Folder Tabs */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFolder('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFolder === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Todos ({allDocuments.length})
          </button>
          {Object.entries(FOLDER_CONFIG).map(([folder, config]) => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedFolder === folder
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
              <span className="text-xs opacity-75">({folderStats[folder] || 0})</span>
            </button>
          ))}
        </div>
      </div>

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
            placeholder="Buscar documentos..."
            className="pl-10 pr-4 py-2.5 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto bg-card rounded-lg shadow-sm border border-border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documento</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Carpeta</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tamaño</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subido por</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estadísticas</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No se encontraron documentos
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc, index) => (
                    <motion.tr
                      key={doc._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(doc.mimeType)}</span>
                          <div>
                            <div className="font-medium">{doc.originalName}</div>
                            {doc.description && (
                              <div className="text-sm text-muted-foreground">{doc.description}</div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDate(doc.uploadedAt)} • v{doc.version}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${FOLDER_CONFIG[doc.folder]?.color || FOLDER_CONFIG.other.color}`}>
                          {FOLDER_CONFIG[doc.folder]?.label || doc.folder}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>{doc.uploadedBy.name}</div>
                        <div className="text-xs text-muted-foreground">{doc.uploadedBy.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span>{doc.downloadCount || 0} descargas</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">
                              {doc.totalViewCount || doc.viewCount || 0} vistas totales
                            </span>
                            {doc.shareLinks && doc.shareLinks.length > 0 && (
                              <span className="text-xs text-primary">
                                ({doc.shareLinks.length} enlace{doc.shareLinks.length > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2 relative">
                          <Link
                            href={`/dashboard/admin/documents/${doc._id}/preview`}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Vista Previa"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Descargar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => toggleMenu(e, doc._id)}
                            className="p-2 text-muted-foreground hover:bg-muted/60 rounded-full menu-toggle-btn transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          <AnimatePresence>
                            {openMenuId === doc._id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="menu-dropdown absolute right-0 top-10 w-48 rounded-lg shadow-xl py-1 bg-card border border-border z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setUploadForm({
                                      file: null,
                                      folder: doc.folder,
                                      description: doc.description || '',
                                      accessLevel: doc.accessLevel
                                    });
                                    setIsEditing(true);
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
                                    setOpenMenuId(null);
                                    router.push(`/dashboard/admin/documents/${doc._id}/stats`);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted/40 flex items-center gap-2 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  Estadísticas
                                </button>
                                <button
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    try {
                                      const token = localStorage.getItem('token');
                                      if (!token) return;
                                      
                                      const response = await fetch(`/api/documents/${doc._id}/share`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      });
                                      
                                      if (response.ok) {
                                        const data = await response.json();
                                        setShareLinks(data.shareLinks || []);
                                        setShowShareLinks(doc._id);
                                      }
                                    } catch (err) {
                                      console.error('Error al cargar enlaces compartidos:', err);
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted/40 flex items-center gap-2 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                  </svg>
                                  Enlaces Compartidos
                                </button>
                                <button
                                  onClick={() => {
                                    setShowVersionHistory(doc._id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted/40 flex items-center gap-2 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Historial de Versiones
                                </button>
                                <button
                                  onClick={() => {
                                    handleDelete(doc._id);
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

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron documentos
              </div>
            ) : (
              filteredDocuments.map((doc, index) => (
                <motion.div
                  key={doc._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-lg shadow-sm border border-border p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-3xl flex-shrink-0">{getFileIcon(doc.mimeType)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.originalName}</div>
                        {doc.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.description}</div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${FOLDER_CONFIG[doc.folder]?.color || FOLDER_CONFIG.other.color}`}>
                            {FOLDER_CONFIG[doc.folder]?.label || doc.folder}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => toggleMenu(e, doc._id)}
                      className="p-2 text-muted-foreground hover:bg-muted/60 rounded-full menu-toggle-btn flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <div>Subido por: {doc.uploadedBy.name}</div>
                    <div className="flex flex-col items-end gap-1">
                      <span>{doc.downloadCount || 0} descargas</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.totalViewCount || doc.viewCount || 0} vistas totales</span>
                        {doc.shareLinks && doc.shareLinks.length > 0 && (
                          <span className="text-primary">
                            ({doc.shareLinks.length} enlace{doc.shareLinks.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/admin/documents/${doc._id}/preview`}
                      className="flex-1 px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Vista Previa
                    </Link>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {openMenuId === doc._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-border space-y-1"
                      >
                        <button
                          onClick={() => {
                            setSelectedDocument(doc);
                            setUploadForm({
                              file: null,
                              folder: doc.folder,
                              description: doc.description || '',
                              accessLevel: doc.accessLevel
                            });
                            setIsEditing(true);
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
                            setShowVersionHistory(doc._id);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 rounded-lg flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Historial de Versiones
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(doc._id);
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

      {/* Upload/Edit Modal */}
      <AnimatePresence>
        {(isUploadModalOpen || isEditing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => {
              setIsEditing(false);
              setIsUploadModalOpen(false);
              setSelectedDocument(null);
              setUploadForm({ file: null, folder: 'legal', description: '', accessLevel: ['public'] });
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? 'Editar Documento' : 'Subir Documento'}
              </h2>
              
              <div className="space-y-4">
                {/* File Upload Area */}
                {!isEditing && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {uploadForm.file ? (
                      <div className="space-y-2">
                        <div className="text-4xl">{getFileIcon(uploadForm.file.type)}</div>
                        <div className="font-medium">{uploadForm.file.name}</div>
                        <div className="text-sm text-muted-foreground">{formatFileSize(uploadForm.file.size)}</div>
                        <button
                          onClick={() => setUploadForm({ ...uploadForm, file: null })}
                          className="text-sm text-destructive hover:underline"
                        >
                          Cambiar archivo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <svg className="w-12 h-12 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div>
                          <label className="cursor-pointer">
                            <span className="text-primary hover:underline">Haz clic para seleccionar</span>
                            <span className="text-muted-foreground"> o arrastra y suelta</span>
                          </label>
                          <input
                            type="file"
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint, Imágenes, ZIP</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit: File Replacement */}
                {isEditing && (
                  <div className="border border-border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(selectedDocument?.mimeType || '')}</span>
                        <div>
                          <div className="font-medium">{selectedDocument?.originalName}</div>
                          <div className="text-sm text-muted-foreground">{formatFileSize(selectedDocument?.fileSize || 0)}</div>
                        </div>
                      </div>
                    </div>
                    <label className="cursor-pointer text-sm text-primary hover:underline">
                      Reemplazar archivo
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png"
                      />
                    </label>
                    {uploadForm.file && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Nuevo: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                      </div>
                    )}
                  </div>
                )}

                {/* Folder Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">Carpeta</label>
                  <select
                    value={uploadForm.folder}
                    onChange={e => setUploadForm({ ...uploadForm, folder: e.target.value as Document['folder'] })}
                    className="w-full p-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(FOLDER_CONFIG).map(([folder, config]) => (
                      <option key={folder} value={folder}>
                        {config.icon} {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-lg bg-background h-24 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Descripción del documento (opcional)"
                  />
                </div>

                {/* Access Level */}
                <div>
                  <label className="block text-sm font-medium mb-2">Nivel de Acceso</label>
                  <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/10 max-h-48 overflow-y-auto">
                    {ACCESS_LEVELS.map(level => (
                      <label key={level.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uploadForm.accessLevel.includes(level.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUploadForm({
                                ...uploadForm,
                                accessLevel: [...uploadForm.accessLevel, level.value]
                              });
                            } else {
                              setUploadForm({
                                ...uploadForm,
                                accessLevel: uploadForm.accessLevel.filter(a => a !== level.value)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm">{level.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setIsUploadModalOpen(false);
                      setSelectedDocument(null);
                      setUploadForm({ file: null, folder: 'legal', description: '', accessLevel: ['public'] });
                    }}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={isEditing ? handleUpdate : handleUpload}
                    disabled={(!uploadForm.file && !isEditing) || isUploading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Procesando...' : isEditing ? 'Guardar Cambios' : 'Subir Documento'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version History Modal */}
      <AnimatePresence>
        {showVersionHistory && (
          <VersionHistory
            entityType="document"
            entityId={showVersionHistory}
            onClose={() => setShowVersionHistory(null)}
          />
        )}
      </AnimatePresence>

      {/* Statistics Modal */}
      {showStats && documentStats && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => {
              setShowStats(null);
              setDocumentStats(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Estadísticas del Documento</h2>
                  <button
                    onClick={() => {
                      setShowStats(null);
                      setDocumentStats(null);
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{documentStats.originalName}</p>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary">{documentStats.downloadCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Descargas</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary">{documentStats.viewCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Vistas</div>
                  </div>
                </div>

                {documentStats.views && documentStats.views.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Historial de Vistas</h3>
                    <div className="space-y-3">
                      {documentStats.views
                        .filter((view: any) => view.duration !== undefined)
                        .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                        .map((view: any, index: number) => {
                          const formatDuration = (seconds: number) => {
                            if (seconds < 60) return `${seconds}s`;
                            const mins = Math.floor(seconds / 60);
                            const secs = seconds % 60;
                            return `${mins}m ${secs}s`;
                          };
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {view.userId?.name || 'Usuario desconocido'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(view.startTime).toLocaleString('es-ES')}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{formatDuration(view.duration || 0)}</div>
                                <div className="text-xs text-muted-foreground">Tiempo de visualización</div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p>No hay vistas registradas aún</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Share Links Modal */}
      {showShareLinks && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => {
              setShowShareLinks(null);
              setShareLinks([]);
              setIsCreatingShareLink(false);
              setShareLinkForm({ password: '', isPublic: true, expiresAt: '' });
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Enlaces Compartidos</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsCreatingShareLink(true);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Crear Enlace
                    </button>
                    <button
                      onClick={() => {
                        setShowShareLinks(null);
                        setShareLinks([]);
                        setIsCreatingShareLink(false);
                        setShareLinkForm({ password: '', isPublic: true, expiresAt: '' });
                      }}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {isCreatingShareLink ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Contraseña (opcional)</label>
                      <input
                        type="password"
                        value={shareLinkForm.password}
                        onChange={(e) => setShareLinkForm({ ...shareLinkForm, password: e.target.value })}
                        className="w-full p-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Dejar vacío para sin contraseña"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Acceso Público</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareLinkForm.isPublic}
                          onChange={(e) => setShareLinkForm({ ...shareLinkForm, isPublic: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm">Permitir acceso sin login (solicitará email)</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Permitir Descarga</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareLinkForm.allowDownload}
                          onChange={(e) => setShareLinkForm({ ...shareLinkForm, allowDownload: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm">Permitir que los usuarios descarguen el documento</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Fecha de Expiración (opcional)</label>
                      <input
                        type="datetime-local"
                        value={shareLinkForm.expiresAt}
                        onChange={(e) => setShareLinkForm({ ...shareLinkForm, expiresAt: e.target.value })}
                        className="w-full p-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setIsCreatingShareLink(false);
                          setShareLinkForm({ password: '', isPublic: true, expiresAt: '', allowDownload: false });
                        }}
                        className="px-4 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            if (!token) return;
                            
                            const response = await fetch(`/api/documents/${showShareLinks}/share`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify(shareLinkForm)
                            });
                            
                            if (response.ok) {
                              const data = await response.json();
                              setShareLinks([...shareLinks, data.shareLink]);
                              setIsCreatingShareLink(false);
                              setShareLinkForm({ password: '', isPublic: true, expiresAt: '' });
                              showSuccess('Enlace compartido creado exitosamente');
                            } else {
                              const error = await response.json();
                              setApiError(error.error || 'Error al crear enlace');
                            }
                          } catch (err) {
                            setApiError('Error al crear enlace compartido');
                          }
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Crear Enlace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shareLinks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <p>No hay enlaces compartidos aún</p>
                      </div>
                    ) : (
                      shareLinks.map((link) => (
                        <div key={link.linkId} className="p-4 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">Enlace:</span>
                                <code className="text-xs bg-background px-2 py-1 rounded">{link.url}</code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(link.url);
                                    showSuccess('Enlace copiado al portapapeles');
                                  }}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                  title="Copiar enlace"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>{link.viewCount || 0} vistas</span>
                                {link.hasPassword && <span className="text-primary">🔒 Con contraseña</span>}
                                {link.isPublic && <span>🌐 Público</span>}
                                {link.expiresAt && (
                                  <span>⏰ Expira: {new Date(link.expiresAt).toLocaleDateString('es-ES')}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!confirm('¿Estás seguro de que quieres eliminar este enlace?')) return;
                                
                                try {
                                  const token = localStorage.getItem('token');
                                  if (!token) return;
                                  
                                  const response = await fetch(`/api/documents/${showShareLinks}/share?linkId=${link.linkId}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  
                                  if (response.ok) {
                                    setShareLinks(shareLinks.filter(l => l.linkId !== link.linkId));
                                    showSuccess('Enlace eliminado exitosamente');
                                  }
                                } catch (err) {
                                  setApiError('Error al eliminar enlace');
                                }
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Eliminar enlace"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default function DataRoom() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-12">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DataRoomContent />
    </Suspense>
  );
}
