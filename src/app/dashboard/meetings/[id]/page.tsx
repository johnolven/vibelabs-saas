'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { VapiService } from '@/services/vapiService';
import { VapiServerService } from '@/services/vapiServerService';
import type { Call } from '@vapi-ai/web/dist/api';

interface Message {
  role: string;
  message: string;
  time: number;
  endTime?: number;
  secondsFromStart: number;
  duration?: number;
}

interface Transcription {
  text: string;
  timestamp: number;
  speaker: string;
  type?: string;
  messages?: Message[];
  id: string;
}

interface TranscriptionFromDB {
  text: string;
  timestamp: number;
  speaker: string;
  type?: string;
  messages?: Message[];
  id?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  summary?: string;
  assistantConfig: {
    objective: string;
    openingPhrase: string;
    knowledgeBase: string;
    links: string[];
  };
}

// Inicializar los servicios fuera del componente
const vapiService = new VapiService(
  process.env.NEXT_PUBLIC_VAPI_API_KEY || '',
  process.env.NEXT_PUBLIC_VAPI_ASSISTANT_VOICE_ID || ''
);

const vapiServerService = new VapiServerService(
  process.env.NEXT_PUBLIC_VAPI_API_KEY || ''
);

export default function MeetingRoom() {
  const { id: meetingId } = useParams();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [error, setError] = useState<string>('');
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [assistantConfig, setAssistantConfig] = useState<Meeting['assistantConfig'] | null>(null);

  // Mover loadMeeting y loadAssistantConfig fuera del useEffect
  const loadMeeting = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No autorizado');
        return;
      }

      const response = await fetch(`/api/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar la reunión');
      }

      const data = await response.json();
      setMeeting(data);

      if (data.transcription && Array.isArray(data.transcription)) {
        const formattedTranscriptions = data.transcription.map((t: TranscriptionFromDB) => ({
          text: t.text,
          timestamp: t.timestamp,
          speaker: t.speaker,
          type: t.type || 'transcript',
          messages: t.messages || [],
          id: t.id || `${t.timestamp}-${Math.random().toString(36).substring(2, 9)}`
        }));
        setTranscriptions(formattedTranscriptions);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar la reunión');
    }
  }, [meetingId]);

  const loadAssistantConfig = useCallback(async () => {
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
        throw new Error('Error al cargar la configuración del asistente');
      }

      const data = await response.json();
      setAssistantConfig(data);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar la configuración del asistente');
    }
  }, []);

  useEffect(() => {
    if (meetingId) {
      loadMeeting();
      loadAssistantConfig();

      const serverHandler = (text: string, speaker: string, type?: string, messages?: Message[]) => {
        if (type === 'conversation-update' && messages) {
          messages.forEach(msg => {
            if (msg.message?.trim()) {
              addTranscription(msg.message, msg.role, 'conversation', msg.time);
            }
          });
        } else if (text?.trim()) {
          const speakerType = speaker === 'assistant' ? 'bot' : speaker;
          addTranscription(text, speakerType, type || 'transcript');
        }
      };

      const clientHandler = (text: string, speaker: string) => {
        if (text?.trim()) {
          const speakerType = speaker === 'user' ? 'user' : 'bot';
          addTranscription(text, speakerType, 'transcript');
        }
      };

      vapiServerService.onTranscription(serverHandler);
      vapiService.onTranscription(clientHandler);

      return () => {
        vapiServerService.onTranscription(() => {});
        vapiService.onTranscription(() => {});
      };
    }
  }, [meetingId, loadMeeting, loadAssistantConfig]);

  useEffect(() => {
    if (isCallActive) {
      return () => {
        console.log('Componente desmontándose, limpiando recursos...');
        try {
          vapiService.endMeeting();
          setIsCallActive(false);
          setCurrentCall(null);
          setIsMuted(false);
          setTranscriptions([]);
          setError('');
          
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } catch (error) {
          console.error('Error durante la limpieza del componente:', error);
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      };
    }
  }, [isCallActive]);

  const addTranscription = (text: string, speaker: string, type?: string, timestamp?: number) => {
    if (!text?.trim()) return;
    
    const newTranscription: Transcription = {
      text: text.trim(),
      timestamp: timestamp || Date.now(),
      speaker,
      type,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };

    setTranscriptions(prev => {
      // Evitar duplicados verificando el contenido y el timestamp cercano
      const isDuplicate = prev.some(t => 
        t.text === newTranscription.text && 
        Math.abs(t.timestamp - newTranscription.timestamp) < 1000
      );
      
      if (isDuplicate) return prev;
      return [...prev, newTranscription];
    });
  };

  const startMeeting = async () => {
    try {
      if (!meeting) {
        setError('No se ha cargado la información de la reunión');
        return;
      }

      if (!assistantConfig) {
        setError('No se ha cargado la configuración del asistente');
        return;
      }

      console.log('Iniciando reunión...');
      // Configurar el asistente con las opciones específicas
      const assistantOverrides = {
        model: {
          provider: "vapi" as const,
          model: "gpt-3.5-turbo",
          systemPrompt: "{{systemPrompt}}"
        },
        endCallFunctionEnabled: true,
        transcriber: {
          provider: "deepgram" as const,
          model: "nova-2" as const,
          language: "es" as const
        },
        recordingEnabled: false,
        variableValues: {
          name: meeting.title,
          objective: assistantConfig.objective,
          openingPhrase: assistantConfig.openingPhrase,
          systemPrompt: `
            Objetivo: ${assistantConfig.objective}
            
            Frase de apertura: ${assistantConfig.openingPhrase}
            
            Base de conocimientos: ${assistantConfig.knowledgeBase}
            
            Enlaces de referencia: ${assistantConfig.links.join('\n')}
          `
        }
      };

      const call = await vapiService.startMeeting(assistantOverrides);
      console.log('Reunión iniciada:', call);
      
      if (call) {
        setCurrentCall(call);
        setIsCallActive(true);
        setIsMuted(false);
        
        vapiService.onCallEnd(() => {
          console.log('Llamada finalizada');
          setIsCallActive(false);
          setCurrentCall(null);
        });

        vapiService.onSpeechStart(() => {
          console.log('El asistente está hablando');
        });

        vapiService.onSpeechEnd(() => {
          console.log('El asistente terminó de hablar');
        });

        vapiService.onError((error) => {
          console.error('Error en la llamada:', error);
          setError('Error en la llamada');
        });

        vapiService.onVolumeLevel(() => {
          // Mantenemos la función pero sin usar el parámetro
        });

      } else {
        console.error('La llamada devolvió:', call);
        throw new Error('No se pudo iniciar la llamada');
      }
    } catch (error) {
      console.error('Error al iniciar la reunión:', error);
      setError('Error al iniciar la reunión');
    }
  };

  const endMeeting = async () => {
    try {
      console.log('Finalizando reunión...');
      if (!currentCall) {
        console.warn('No hay una reunión activa para finalizar');
        setIsCallActive(false);
        setCurrentCall(null);
        setIsMuted(false);
        return;
      }

      // Guardar las transcripciones en la base de datos
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No autorizado');
        }

        const response = await fetch('/api/meetings/update', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            meetingId,
            transcription: transcriptions,
            status: 'completed'
          })
        });

        if (!response.ok) {
          throw new Error('Error al guardar las transcripciones');
        }
      } catch (saveError) {
        console.error('Error al guardar las transcripciones:', saveError);
        setError('Error al guardar las transcripciones');
      }

      // Primero intentamos usar el método say para finalizar la llamada
      try {
        await vapiService.say('Finalizando la llamada', true);
      } catch (sayError) {
        console.error('Error al anunciar fin de llamada:', sayError);
      }
      
      // Esperamos un momento antes de finalizar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        vapiService.endMeeting();
      } catch (endError) {
        console.error('Error al finalizar la reunión:', endError);
      } finally {
        setIsCallActive(false);
        setCurrentCall(null);
        setIsMuted(false);
        console.log('Reunión finalizada exitosamente');
        
        // Esperar un momento y luego refrescar la página
        setTimeout(() => {
          console.log('Refrescando la página...');
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error general al finalizar la reunión:', error);
      setError('Error al finalizar la reunión');
      
      // Forzar la limpieza del estado
      setIsCallActive(false);
      setCurrentCall(null);
      setIsMuted(false);
      
      // Aún así intentamos refrescar la página
      setTimeout(() => {
        console.log('Refrescando la página después del error...');
        window.location.reload();
      }, 1000);
    }
  };

  const toggleMute = () => {
    try {
      console.log('Cambiando estado del micrófono...');
      if (currentCall) {
        const newMutedState = !isMuted;
        vapiService.setMuted(newMutedState);
        setIsMuted(newMutedState);
        console.log(`Micrófono ${newMutedState ? 'silenciado' : 'activado'}`);
      } else {
        console.warn('No hay una reunión activa para cambiar el estado del micrófono');
        setError('No hay una reunión activa para cambiar el estado del micrófono');
      }
    } catch (error) {
      console.error('Error al cambiar el estado del micrófono:', error);
      setError('Error al cambiar el estado del micrófono');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Sala de Reunión</h1>
            <div className="flex items-center space-x-4">
              {isCallActive && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-xl font-medium ${
                    isMuted 
                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isMuted ? 'Activar Micrófono' : 'Silenciar Micrófono'}
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isCallActive ? endMeeting : startMeeting}
                className={`px-6 py-3 rounded-xl font-medium ${
                  isCallActive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isCallActive ? 'Finalizar Reunión' : 'Iniciar Reunión'}
              </motion.button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700"
            >
              {error}
            </motion.div>
          )}

          {/* Status Indicator */}
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isCallActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium text-gray-700">
                {isCallActive ? 'Reunión en curso' : 'Reunión no iniciada'}
              </span>
            </div>
          </div>

          {/* Video Container */}
          <div className="aspect-video bg-gray-900 rounded-xl mb-8 flex items-center justify-center">
            {isCallActive ? (
              <div className="text-white">Reunión en curso...</div>
            ) : meeting && assistantConfig ? (
              <div className="p-8 text-white">
                <h3 className="text-xl font-semibold mb-4">Configuración del Asistente</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">Objetivo</h4>
                    <p className="text-white">{assistantConfig.objective}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">Frase de Apertura</h4>
                    <p className="text-white">{assistantConfig.openingPhrase}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">Base de Conocimientos</h4>
                    <p className="text-white line-clamp-3">{assistantConfig.knowledgeBase}</p>
                  </div>
                  {assistantConfig.links.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300">Enlaces de Referencia</h4>
                      <ul className="list-disc list-inside">
                        {assistantConfig.links.map((link, index) => (
                          <li key={index} className="text-blue-400 hover:text-blue-300">
                            <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400">
                {!meeting ? 'La reunión no ha comenzado' : 'Cargando configuración del asistente...'}
              </div>
            )}
          </div>

          {/* Transcription Container */}
          <div className="bg-gray-50 rounded-xl p-6 h-96 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Transcripción en tiempo real</h2>
            <div className="space-y-4">
              {transcriptions.map((t) => (
                <div 
                  key={t.id} 
                  className={`mb-4 flex ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      t.speaker === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium ${
                        t.speaker === 'user' ? 'text-blue-100' : 'text-blue-600'
                      }`}>
                        {t.speaker === 'user' ? 'Usuario' : 'Asistente'}
                      </span>
                      <span className={`text-xs ${
                        t.speaker === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{t.text}</p>
                  </div>
                </div>
              ))}
              {transcriptions.length === 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">
                    {isCallActive 
                      ? 'Esperando transcripciones...' 
                      : 'La transcripción aparecerá aquí durante la reunión'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 