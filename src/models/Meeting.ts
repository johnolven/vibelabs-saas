import mongoose from 'mongoose';

export interface IMeeting extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  date: Date;
  duration: number;
  transcription: {
    text: string;
    timestamp: number;
    speaker: string;
  }[];
  summary: string;
  recordingUrl?: string;
  assistantVoiceId: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  assistantConfig: {
    objective: string;
    openingPhrase: string;
    knowledgeBase: string;
    links: string[];
  };
}

const meetingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Por favor ingresa un título para la reunión'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Por favor ingresa la fecha de la reunión']
  },
  duration: {
    type: Number,
    required: [true, 'Por favor ingresa la duración de la reunión en minutos']
  },
  transcription: [{
    text: {
      type: String,
      required: true
    },
    timestamp: {
      type: Number,
      required: true
    },
    speaker: {
      type: String,
      required: true
    }
  }],
  summary: {
    type: String,
    default: ''
  },
  recordingUrl: {
    type: String
  },
  assistantVoiceId: {
    type: String,
    required: [true, 'Por favor especifica el ID de la voz del asistente']
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  assistantConfig: {
    objective: {
      type: String,
      required: [true, 'Por favor define el objetivo del asistente para esta reunión'],
      trim: true
    },
    openingPhrase: {
      type: String,
      required: [true, 'Por favor ingresa una frase de apertura para el asistente'],
      trim: true
    },
    knowledgeBase: {
      type: String,
      required: [true, 'Por favor ingresa la base de conocimientos para el asistente'],
      trim: true
    },
    links: [{
      type: String,
      trim: true
    }]
  }
}, {
  timestamps: true
});

export default mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', meetingSchema); 