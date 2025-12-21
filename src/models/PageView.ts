import mongoose, { Schema, Document } from 'mongoose';

export interface IPageView extends Document {
  userId?: mongoose.Types.ObjectId;
  email?: string;
  path: string;
  section: string; // 'dashboard', 'cap-table', 'documents', etc.
  documentId?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration?: number; // en segundos
  metadata?: {
    folder?: string;
    action?: string; // 'view', 'download', 'preview', etc.
    [key: string]: any;
  };
  createdAt: Date;
}

const PageViewSchema = new Schema<IPageView>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  email: {
    type: String,
    required: false
  },
  path: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: false
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: false
  },
  duration: {
    type: Number,
    required: false
  },
  metadata: {
    type: Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
PageViewSchema.index({ userId: 1, createdAt: -1 });
PageViewSchema.index({ section: 1, createdAt: -1 });
PageViewSchema.index({ documentId: 1, createdAt: -1 });
PageViewSchema.index({ createdAt: -1 });

const PageView = mongoose.models.PageView || mongoose.model<IPageView>('PageView', PageViewSchema);

export default PageView;

