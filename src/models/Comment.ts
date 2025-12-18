import mongoose from 'mongoose';

export type CommentType = 'update' | 'document' | 'metric';

export interface IComment extends mongoose.Document {
  content: string;
  author: mongoose.Types.ObjectId;
  // Thread por documento o update
  parentType: CommentType;
  parentId: mongoose.Types.ObjectId; // ID del documento, update o métrica
  // Thread de comentarios (respuestas)
  parentCommentId?: mongoose.Types.ObjectId; // Para respuestas anidadas
  // Notifications
  isRead: boolean;
  readBy: mongoose.Types.ObjectId[]; // Usuarios que han leído este comentario
  // Metadata
  editedAt?: Date;
  isEdited: boolean;
}

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'El contenido del comentario es requerido'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentType: {
    type: String,
    enum: ['update', 'document', 'metric'],
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    sparse: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  editedAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices para búsqueda eficiente
commentSchema.index({ parentType: 1, parentId: 1 });
commentSchema.index({ parentCommentId: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ createdAt: -1 });

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', commentSchema);

