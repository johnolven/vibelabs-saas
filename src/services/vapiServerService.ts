interface Message {
  role: string;
  message: string;
  time: number;
  endTime?: number;
  secondsFromStart: number;
  duration?: number;
}

interface TranscriptMessage {
  type: 'transcript' | 'transcript[transcriptType="final"]';
  role: 'assistant' | 'user';
  transcriptType: 'partial' | 'final';
  transcript: string;
}

interface ConversationUpdate {
  type: 'conversation-update';
  messages: Message[];
  messagesOpenAIFormatted: {
    role: 'assistant' | 'function' | 'user' | 'system' | 'tool';
    content?: string;
  }[];
}

type WebhookMessage = TranscriptMessage | ConversationUpdate;

export class VapiServerService {
  private transcriptionCallbacks: ((
    text: string, 
    speaker: string, 
    type?: string, 
    messages?: Message[]
  ) => void)[] = [];

  constructor(apiKey: string) {
    // No necesitamos inicializar el SDK del servidor aquí
    // Solo necesitamos manejar los webhooks
    console.log('VapiServerService initialized with API key:', apiKey.substring(0, 8) + '...');
  }

  onTranscription(callback: (
    text: string, 
    speaker: string, 
    type?: string, 
    messages?: Message[]
  ) => void) {
    this.transcriptionCallbacks.push(callback);
    console.log('Added transcription callback, total callbacks:', this.transcriptionCallbacks.length);
  }

  handleWebhook(message: WebhookMessage) {
    console.log('Processing webhook message of type:', message.type);

    try {
      if (this.isTranscriptMessage(message)) {
        this.handleTranscriptMessage(message);
      } else if (this.isConversationUpdate(message)) {
        this.handleConversationUpdate(message);
      } else {
        // En este punto TypeScript sabe que message es never porque todos los casos están cubiertos
        const exhaustiveCheck: never = message;
        console.warn('Unhandled message type:', exhaustiveCheck);
      }
    } catch (error) {
      console.error('Error processing webhook message:', error);
      throw error;
    }
  }

  private handleTranscriptMessage(message: TranscriptMessage) {
    console.log('Processing transcript message:', {
      type: message.type,
      role: message.role,
      transcriptType: message.transcriptType,
      transcript: message.transcript
    });

    if (this.transcriptionCallbacks.length === 0) {
      console.warn('No transcription callbacks registered');
      return;
    }

    this.transcriptionCallbacks.forEach((callback, index) => {
      try {
        callback(message.transcript, message.role, message.type);
        console.log(`Successfully executed callback ${index + 1}`);
      } catch (error) {
        console.error(`Error in transcription callback ${index + 1}:`, error);
      }
    });
  }

  private handleConversationUpdate(message: ConversationUpdate) {
    console.log('Processing conversation update:', {
      messageCount: message.messages.length,
      formattedMessageCount: message.messagesOpenAIFormatted.length
    });

    if (this.transcriptionCallbacks.length === 0) {
      console.warn('No transcription callbacks registered');
      return;
    }

    this.transcriptionCallbacks.forEach((callback, index) => {
      try {
        // Enviar un mensaje vacío con tipo conversation-update y los mensajes completos
        callback('', '', message.type, message.messages);
        console.log(`Successfully executed conversation update callback ${index + 1}`);
      } catch (error) {
        console.error(`Error in conversation update callback ${index + 1}:`, error);
      }
    });
  }

  private isTranscriptMessage(message: WebhookMessage): message is TranscriptMessage {
    return message.type === 'transcript' || message.type === 'transcript[transcriptType="final"]';
  }

  private isConversationUpdate(message: WebhookMessage): message is ConversationUpdate {
    return message.type === 'conversation-update';
  }
} 