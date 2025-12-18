import mongoose from 'mongoose';

export type MetricType = 'mrr' | 'users' | 'burn_rate' | 'runway' | 'arr' | 'cac' | 'ltv' | 'custom';
export type MetricUnit = 'currency' | 'number' | 'percentage' | 'days' | 'months';

export interface IMetricValue {
  date: Date;
  value: number;
  notes?: string;
}

export interface IMetric extends mongoose.Document {
  name: string;
  type: MetricType;
  unit: MetricUnit;
  description?: string;
  // Input manual mensual
  values: IMetricValue[];
  // Configuración
  isActive: boolean;
  displayOrder: number;
  // Gráficas
  targetValue?: number;
  // Export
  lastExportedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
}

const metricValueSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true });

const metricSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la métrica es requerido'],
    trim: true
  },
  type: {
    type: String,
    enum: ['mrr', 'users', 'burn_rate', 'runway', 'arr', 'cac', 'ltv', 'custom'],
    required: true
  },
  unit: {
    type: String,
    enum: ['currency', 'number', 'percentage', 'days', 'months'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  values: [metricValueSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  targetValue: {
    type: Number
  },
  lastExportedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices para búsqueda eficiente
metricSchema.index({ type: 1, isActive: 1 });
metricSchema.index({ createdBy: 1 });
metricSchema.index({ 'values.date': 1 });

export default mongoose.models.Metric || mongoose.model<IMetric>('Metric', metricSchema);

