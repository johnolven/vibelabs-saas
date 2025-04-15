import Vapi from '@vapi-ai/web';

type VapiModel = {
  provider: 'vapi';
  model: string;
  systemPrompt?: string;
};

interface AssistantOverrides {
  model?: VapiModel;
  endCallFunctionEnabled?: boolean;
  transcriber?: {
    provider: 'deepgram';
    model: 'nova-2';
    language: 'es';
  };
  recordingEnabled?: boolean;
  variableValues?: {
    [key: string]: string;
  };
}

export class VapiService {
  private vapi: Vapi;
  private assistantId: string;
  private currentCall: Awaited<ReturnType<Vapi['start']>> | null = null;
  private transcriptionCallbacks: ((text: string, speaker: string) => void)[] = [];
  private eventCallbacks: {
    onSpeechStart: (() => void)[];
    onSpeechEnd: (() => void)[];
    onCallStart: (() => void)[];
    onCallEnd: (() => void)[];
    onVolumeLevel: ((volume: number) => void)[];
    onError: ((error: Error) => void)[];
  } = {
    onSpeechStart: [],
    onSpeechEnd: [],
    onCallStart: [],
    onCallEnd: [],
    onVolumeLevel: [],
    onError: []
  };

  constructor(apiKey: string, assistantId: string) {
    console.log('Inicializando Vapi con:', { apiKey: apiKey.substring(0, 8) + '...', assistantId });
    this.vapi = new Vapi(apiKey);
    this.assistantId = assistantId;

    this.vapi.on('speech-start', () => {
      console.log('Speech has started');
      this.eventCallbacks.onSpeechStart.forEach(cb => cb());
    });

    this.vapi.on('speech-end', () => {
      console.log('Speech has ended');
      this.eventCallbacks.onSpeechEnd.forEach(cb => cb());
    });

    this.vapi.on('call-start', () => {
      console.log('Call has started');
      this.eventCallbacks.onCallStart.forEach(cb => cb());
    });

    this.vapi.on('call-end', () => {
      console.log('Call has stopped');
      this.currentCall = null;
      this.eventCallbacks.onCallEnd.forEach(cb => cb());
    });

    this.vapi.on('volume-level', (volume: number) => {
      this.eventCallbacks.onVolumeLevel.forEach(cb => cb(volume));
    });

    this.vapi.on('message', (message: { type: string; transcript?: string; role?: string }) => {
      console.log("Message received:", message);
      if (message.type === 'transcript' && message.transcript) {
        this.transcriptionCallbacks.forEach(callback => {
          callback(message.transcript!, message.role || 'unknown');
        });
      }
    });

    this.vapi.on('error', (error: Error) => {
      console.error("Error in Vapi:", error);
      this.eventCallbacks.onError.forEach(cb => cb(error));
    });
  }

  onSpeechStart(callback: () => void) {
    this.eventCallbacks.onSpeechStart.push(callback);
  }

  onSpeechEnd(callback: () => void) {
    this.eventCallbacks.onSpeechEnd.push(callback);
  }

  onCallStart(callback: () => void) {
    this.eventCallbacks.onCallStart.push(callback);
  }

  onCallEnd(callback: () => void) {
    this.eventCallbacks.onCallEnd.push(callback);
  }

  onVolumeLevel(callback: (volume: number) => void) {
    this.eventCallbacks.onVolumeLevel.push(callback);
  }

  onError(callback: (error: Error) => void) {
    this.eventCallbacks.onError.push(callback);
  }

  onTranscription(callback: (text: string, speaker: string) => void) {
    this.transcriptionCallbacks.push(callback);
  }

  async startMeeting(overrides?: AssistantOverrides) {
    try {
      console.log('Iniciando llamada con assistantId:', this.assistantId);
      
      const assistantOverrides = {
        endCallFunctionEnabled: true,
        transcriber: {
          provider: 'deepgram' as const,
          model: 'nova-2' as const,
          language: 'es' as const
        },
        ...overrides,
        model: {
          provider: 'vapi' as const,
          model: 'gpt-3.5-turbo',
          ...(overrides?.model || {})
        }
      };

      this.currentCall = await this.vapi.start(this.assistantId, assistantOverrides);
      return this.currentCall;
    } catch (error) {
      console.error('Error al iniciar la llamada:', error);
      throw error;
    }
  }

  endMeeting() {
    try {
      if (this.currentCall) {
        console.log('Finalizando llamada...');
        
        try {
          this.vapi.stop();
        } catch (stopError) {
          console.warn('Error al usar vapi.stop():', stopError);
        }
        
        this.transcriptionCallbacks = [];
        this.eventCallbacks = {
          onSpeechStart: [],
          onSpeechEnd: [],
          onCallStart: [],
          onCallEnd: [],
          onVolumeLevel: [],
          onError: []
        };
        
        this.currentCall = null;
        
        console.log('Llamada finalizada exitosamente');
      } else {
        console.warn('No hay una llamada activa para finalizar');
      }
    } catch (error) {
      console.error('Error al finalizar la llamada:', error);
      throw error;
    }
  }

  isMuted(): boolean {
    return this.vapi.isMuted();
  }

  setMuted(muted: boolean) {
    this.vapi.setMuted(muted);
  }

  async say(message: string, endCallAfterSpoken: boolean = false) {
    try {
      await this.vapi.say(message, endCallAfterSpoken);
    } catch (error) {
      console.error('Error al hacer que el asistente hable:', error);
      throw error;
    }
  }
} 