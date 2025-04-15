'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface MeetingFormData {
  title: string;
  date: string;
  duration: number;
  assistantConfig: {
    objective: string;
    openingPhrase: string;
    knowledgeBase: string;
    links: string[];
  };
}

export default function NewMeeting() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    date: '',
    duration: 30,
    assistantConfig: {
      objective: '',
      openingPhrase: '',
      knowledgeBase: '',
      links: []
    }
  });
  const [newLink, setNewLink] = useState('');

  useEffect(() => {
    loadAssistantConfig();
    // Obtener la fecha de la URL si existe
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      setFormData(prev => ({
        ...prev,
        date: dateParam
      }));
    }
  }, []);

  const loadAssistantConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No autorizado');
        return;
      }

      const response = await fetch('/api/assistant', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar la configuración');
      }

      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        assistantConfig: {
          objective: data.objective,
          openingPhrase: data.openingPhrase,
          knowledgeBase: data.knowledgeBase,
          links: data.links
        }
      }));
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar la configuración del asistente');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No autorizado');
      }

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al crear la reunión');
      }

      const data = await response.json();
      router.push(`/dashboard/meetings/${data.id}`);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al crear la reunión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('assistantConfig.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        assistantConfig: {
          ...prev.assistantConfig,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addLink = () => {
    if (newLink && !formData.assistantConfig.links.includes(newLink)) {
      setFormData(prev => ({
        ...prev,
        assistantConfig: {
          ...prev.assistantConfig,
          links: [...prev.assistantConfig.links, newLink]
        }
      }));
      setNewLink('');
    }
  };

  const removeLink = (linkToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      assistantConfig: {
        ...prev.assistantConfig,
        links: prev.assistantConfig.links.filter(link => link !== linkToRemove)
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Nueva Reunión</h1>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="bg-gray-50 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Información de la Reunión</h2>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Título de la reunión"
                />
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha y Hora
                </label>
                <input
                  type="datetime-local"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            {/* Configuración del Asistente */}
            <div className="bg-gray-50 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Configuración del Asistente</h2>
              
              <div>
                <label htmlFor="assistantConfig.objective" className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivo
                </label>
                <textarea
                  id="assistantConfig.objective"
                  name="assistantConfig.objective"
                  value={formData.assistantConfig.objective}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Define el objetivo principal del asistente para esta reunión"
                />
              </div>

              <div>
                <label htmlFor="assistantConfig.openingPhrase" className="block text-sm font-medium text-gray-700 mb-1">
                  Frase de Apertura
                </label>
                <textarea
                  id="assistantConfig.openingPhrase"
                  name="assistantConfig.openingPhrase"
                  value={formData.assistantConfig.openingPhrase}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Frase con la que el asistente iniciará la reunión"
                />
              </div>

              <div>
                <label htmlFor="assistantConfig.knowledgeBase" className="block text-sm font-medium text-gray-700 mb-1">
                  Base de Conocimientos
                </label>
                <textarea
                  id="assistantConfig.knowledgeBase"
                  name="assistantConfig.knowledgeBase"
                  value={formData.assistantConfig.knowledgeBase}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Información relevante que el asistente debe conocer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enlaces de Referencia
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="url"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="https://..."
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addLink}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Añadir
                  </motion.button>
                </div>
                <div className="space-y-2">
                  {formData.assistantConfig.links.map((link, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg">
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 truncate">
                        {link}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeLink(link)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Eliminar enlace"
                        aria-label="Eliminar enlace"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                Cancelar
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
                className={`px-6 py-3 rounded-xl font-medium ${
                  isLoading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {isLoading ? 'Creando...' : 'Crear Reunión'}
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 