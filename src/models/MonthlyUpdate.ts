import mongoose from 'mongoose';

export type UpdateStatus = 'draft' | 'sent' | 'archived';

export interface IUpdateSection {
  type: 'highlights' | 'metrics' | 'challenges' | 'asks' | 'custom';
  title: string;
  content: string; // HTML content from WYSIWYG editor
  order: number;
}

export interface IMonthlyUpdate extends mongoose.Document {
  title: string;
  month: number; // 1-12
  year: number;
  status: UpdateStatus;
  sections: IUpdateSection[];
  // Preview y envío
  sentAt?: Date;
  sentTo: mongoose.Types.ObjectId[]; // Lista de inversores que recibieron el update
  sentBy: mongoose.Types.ObjectId;
  // Email blast
  emailSubject?: string;
  emailBody?: string;
  emailSentCount?: number;
  emailOpenedCount?: number;
}

const updateSectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['highlights', 'metrics', 'challenges', 'asks', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: true });

const monthlyUpdateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'archived'],
    default: 'draft'
  },
  sections: [updateSectionSchema],
  sentAt: {
    type: Date
  },
  sentTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emailSubject: {
    type: String,
    trim: true
  },
  emailBody: {
    type: String
  },
  emailSentCount: {
    type: Number,
    default: 0
  },
  emailOpenedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índice único para evitar duplicados del mismo mes/año
monthlyUpdateSchema.index({ month: 1, year: 1 }, { unique: false });

export default mongoose.models.MonthlyUpdate || mongoose.model<IMonthlyUpdate>('MonthlyUpdate', monthlyUpdateSchema);

