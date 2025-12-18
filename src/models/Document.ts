import mongoose from 'mongoose';

export type DocumentFolder = 'legal' | 'financials' | 'board_materials' | 'pitch_deck' | 'other';
export type DocumentAccessLevel = 'founder' | 'admin' | 'investor' | 'boardmember' | 'potential_investor' | 'public';

export interface IDocument extends mongoose.Document {
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  folder: DocumentFolder;
  description?: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  // Control de acceso por carpeta
  accessLevel: DocumentAccessLevel[];
  // Audit log
  downloadCount: number;
  lastDownloadedAt?: Date;
  lastDownloadedBy?: mongoose.Types.ObjectId;
  version: number;
  isActive: boolean;
}

const documentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  folder: {
    type: String,
    enum: ['legal', 'financials', 'board_materials', 'pitch_deck', 'other'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  accessLevel: [{
    type: String,
    enum: ['founder', 'admin', 'investor', 'boardmember', 'potential_investor', 'public']
  }],
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: {
    type: Date
  },
  lastDownloadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para búsqueda eficiente
documentSchema.index({ folder: 1, isActive: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ accessLevel: 1 });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema);

