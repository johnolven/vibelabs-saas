import mongoose from 'mongoose';

export type NewsletterFrequency = 'daily' | 'weekly';
export type NewsletterStyle = 'professional' | 'casual' | 'technical' | 'creative';
export type AIProvider = 'openai' | 'anthropic';

export interface INewsletter extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  topic: string;
  frequency: NewsletterFrequency;
  style: NewsletterStyle;
  accentColor: string;
  isActive: boolean;
  subscriberCount: number;
  lastGeneratedAt?: Date;
  aiProvider: AIProvider;
  aiModel: string;
  aiApiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'El slug es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug solo puede contener letras minusculas, numeros y guiones'],
  },
  description: {
    type: String,
    required: [true, 'La descripcion es requerida'],
    trim: true,
  },
  topic: {
    type: String,
    required: [true, 'El tema/prompt es requerido'],
    trim: true,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly'],
    default: 'weekly',
  },
  style: {
    type: String,
    enum: ['professional', 'casual', 'technical', 'creative'],
    default: 'professional',
  },
  accentColor: {
    type: String,
    default: '#6366f1',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  subscriberCount: {
    type: Number,
    default: 0,
  },
  lastGeneratedAt: {
    type: Date,
  },
  aiProvider: {
    type: String,
    enum: ['openai', 'anthropic'],
    default: 'openai',
  },
  aiModel: {
    type: String,
    default: 'gpt-4o-mini',
  },
  aiApiKey: {
    type: String,
    required: [true, 'La API key de IA es requerida'],
  },
}, {
  timestamps: true,
});

export default mongoose.models.Newsletter || mongoose.model<INewsletter>('Newsletter', newsletterSchema);
