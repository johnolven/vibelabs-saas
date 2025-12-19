import mongoose from 'mongoose';
import { Permission } from '@/lib/permissions';

export interface IRole extends mongoose.Document {
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean; // Roles del sistema no se pueden eliminar
  createdBy: mongoose.Types.ObjectId;
}

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del rol es requerido'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  permissions: [{
    type: String,
    enum: [
      'read_cap_table',
      'write_cap_table',
      'read_documents',
      'write_documents',
      'read_updates',
      'write_updates',
      'read_metrics',
      'write_metrics',
      'comment',
      'manage_users',
      'send_updates'
    ]
  }],
  isSystemRole: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices
roleSchema.index({ name: 1 });
roleSchema.index({ isSystemRole: 1 });

export default mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);


