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
  // View tracking
  viewCount: number;
  views?: Array<{
    userId: mongoose.Types.ObjectId;
    startTime: Date;
    endTime?: Date;
    duration?: number; // en segundos
  }>;
  version: number;
  isActive: boolean;
  period?: {
    type: 'month' | 'quarter' | 'year';
    value: string; // '2024-01', '2024-Q1', '2024'
  };
  // Share links
  shareLinks?: Array<{
    linkId: string; // ID único del enlace
    password?: string; // Hash de la contraseña (opcional)
    isPublic: boolean; // Si requiere login o no
    createdAt: Date;
    createdBy: mongoose.Types.ObjectId;
    expiresAt?: Date; // Fecha de expiración (opcional)
    viewCount: number;
    views: Array<{
      email?: string; // Si es público
      userId?: mongoose.Types.ObjectId; // Si está logueado
      startTime: Date;
      endTime?: Date;
      duration?: number; // en segundos
    }>;
  }>;
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
  // View tracking
  viewCount: {
    type: Number,
    default: 0
  },
  views: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number // en segundos
    }
  }],
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  period: {
    type: {
      type: String,
      enum: ['month', 'quarter', 'year']
    },
    value: String
  },
  // Share links
  shareLinks: [{
    linkId: {
      type: String,
      required: true
    },
    password: {
      type: String // Hash de la contraseña
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    allowDownload: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expiresAt: {
      type: Date
    },
    viewCount: {
      type: Number,
      default: 0
    },
    views: [{
      email: {
        type: String
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      startTime: {
        type: Date,
        required: true,
        default: Date.now
      },
      endTime: {
        type: Date
      },
      duration: {
        type: Number // en segundos
      }
    }]
  }]
}, {
  timestamps: true
});

// Índices para búsqueda eficiente
documentSchema.index({ folder: 1, isActive: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ accessLevel: 1 });
documentSchema.index({ 'shareLinks.linkId': 1 });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema);

