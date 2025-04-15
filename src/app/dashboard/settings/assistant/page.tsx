'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AssistantConfig {
  name: string;
  objective: string;
  openingPhrase: string;
  knowledgeBase: string;
  links: string[];
}

export default function AssistantSettings() {
  const [config, setConfig] = useState<AssistantConfig>({
    name: '',
    objective: '',
    openingPhrase: '',
    knowledgeBase: '',
    links: ['']
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadAssistantConfig();
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
      setConfig(data);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar la configuración del asistente');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLinkChange = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      links: prev.links.map((link, i) => i === index ? value : link)
    }));
  };

  const addLink = () => {
    setConfig(prev => ({
      ...prev,
      links: [...prev.links, '']
    }));
  };

  const removeLink = (index: number) => {
    setConfig(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No autorizado');
        return;
      }

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Error al guardar la configuración');
      }

      setSuccessMessage('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error:', error);
      setError('Error al guardar la configuración del asistente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="py-6 px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CEO Virtual</h1>
              <p className="mt-1 text-sm text-gray-900">Configura el comportamiento y conocimientos de tu asistente virtual.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Configuración del CEO Virtual</h1>
            <p className="mt-2 text-gray-900">Personaliza el comportamiento y conocimientos de tu asistente virtual.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r"
            >
              {error}
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r"
            >
              {successMessage}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información Básica */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Nombre del CEO Virtual
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={config.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-900"
                    placeholder="Ej: John AI CEO"
                  />
                  <p className="mt-1 text-sm text-gray-900">Este nombre será usado para identificar a tu asistente virtual.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Objetivo Principal
                  </label>
                  <textarea
                    name="objective"
                    value={config.objective}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-900"
                    placeholder="Define el objetivo principal y la misión del CEO virtual..."
                  />
                  <p className="mt-1 text-sm text-gray-900">Establece claramente cuál es el propósito y los objetivos que debe perseguir.</p>
                </div>
              </div>
            </div>

            {/* Comunicación */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Comunicación</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Frase de Apertura
                  </label>
                  <textarea
                    name="openingPhrase"
                    value={config.openingPhrase}
                    onChange={handleChange}
                    required
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-900"
                    placeholder="Frase con la que el CEO iniciará las conversaciones..."
                  />
                  <p className="mt-1 text-sm text-gray-900">Esta frase será utilizada para comenzar cada interacción.</p>
                </div>
              </div>
            </div>

            {/* Conocimientos */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Base de Conocimientos</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Información General
                  </label>
                  <textarea
                    name="knowledgeBase"
                    value={config.knowledgeBase}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-900"
                    placeholder="Información relevante sobre la empresa, productos, servicios, políticas..."
                  />
                  <p className="mt-1 text-sm text-gray-900">Proporciona toda la información necesaria para que el CEO virtual pueda responder preguntas específicas sobre la empresa.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Enlaces Relevantes
                  </label>
                  <div className="space-y-2">
                    {config.links.map((link, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-2 items-center"
                      >
                        <div className="flex-1 relative">
                          <input
                            type="url"
                            value={link}
                            onChange={(e) => handleLinkChange(index, e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-900"
                            placeholder="https://..."
                          />
                          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => removeLink(index)}
                          className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors duration-200"
                          title="Eliminar enlace"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </motion.button>
                      </motion.div>
                    ))}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={addLink}
                      className="mt-2 flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Agregar enlace
                    </motion.button>
                  </div>
                  <p className="mt-1 text-sm text-gray-900">Añade enlaces a recursos importantes que el CEO virtual debe conocer.</p>
                </div>
              </div>
            </div>

            {/* Botón de Guardar */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 py-4 px-6 -mx-6">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center items-center px-6 py-3 rounded-xl text-white font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando cambios...
                  </>
                ) : (
                  'Guardar Configuración'
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </main>
    </>
  );
} 