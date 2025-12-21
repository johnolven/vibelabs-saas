import mongoose from 'mongoose';

export interface IVersion extends mongoose.Document {
  entityType: 'document' | 'cap_table' | 'metric' | 'update' | 'other';
  entityId: mongoose.Types.ObjectId;
  version: number;
  versionLabel?: string; // v1.0, v2.1, etc.
  period?: {
    type: 'month' | 'quarter' | 'year';
    value: string; // '2024-01', '2024-Q1', '2024'
  };
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    description?: string;
  }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  metadata?: {
    description?: string;
    tags?: string[];
    isMajor?: boolean; // Major version (1.0, 2.0) vs minor (1.1, 1.2)
  };
}

const versionSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['document', 'cap_table', 'metric', 'update', 'other'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true,
    min: 1
  },
  versionLabel: {
    type: String,
    trim: true
  },
  period: {
    type: {
      type: String,
      enum: ['month', 'quarter', 'year']
    },
    value: String
  },
  changes: [{
    field: {
      type: String,
      required: true
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    description: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    description: String,
    tags: [String],
    isMajor: Boolean
  }
}, {
  timestamps: true
});

// Índices para búsqueda eficiente
versionSchema.index({ entityType: 1, entityId: 1, version: -1 });
versionSchema.index({ entityType: 1, entityId: 1, 'period.value': 1 });
versionSchema.index({ createdAt: -1 });

// Método para obtener la siguiente versión
versionSchema.statics.getNextVersion = async function(entityType: string, entityId: mongoose.Types.ObjectId) {
  const lastVersion = await this.findOne(
    { entityType, entityId },
    {},
    { sort: { version: -1 } }
  );
  
  return lastVersion ? lastVersion.version + 1 : 1;
};

// Método para generar label de versión
versionSchema.methods.generateVersionLabel = function() {
  if (this.metadata?.isMajor) {
    return `v${this.version}.0`;
  }
  // Minor version: incrementa el decimal
  const major = Math.floor(this.version);
  const minor = this.version % 1 === 0 ? 0 : Math.round((this.version % 1) * 10);
  return `v${major}.${minor}`;
};

export default mongoose.models.Version || mongoose.model<IVersion>('Version', versionSchema);


