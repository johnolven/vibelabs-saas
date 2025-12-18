import mongoose from 'mongoose';

export type EquityType = 'common' | 'preferred' | 'SAFE' | 'warrant' | 'option';
export type ShareholderType = 'founder' | 'investor' | 'employee' | 'advisor';

export interface IShareholder {
  userId?: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  type: ShareholderType;
  equityType: EquityType;
  shares: number;
  ownershipPercentage: number;
  investmentAmount?: number;
  investmentDate?: Date;
  fullyDiluted?: boolean;
  notes?: string;
  // Vesting fields
  vestingStartDate?: Date;
  vestingCliffMonths?: number; // Período de cliff en meses (ej: 12 meses)
  vestingPeriodMonths?: number; // Período total de vesting en meses (ej: 48 meses = 4 años)
  vestingSchedule?: 'linear' | 'monthly' | 'quarterly' | 'annual'; // Tipo de vesting
}

export interface ICapTable extends mongoose.Document {
  companyName: string;
  totalShares: number;
  shareholders: IShareholder[];
  lastUpdated: Date;
  createdBy: mongoose.Types.ObjectId;
  // Cálculo automático de dilución
  fullyDilutedShares?: number;
  outstandingShares?: number;
  reservedPool?: number;
}

const shareholderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  type: {
    type: String,
    enum: ['founder', 'investor', 'employee', 'advisor'],
    required: true
  },
  equityType: {
    type: String,
    enum: ['common', 'preferred', 'SAFE', 'warrant', 'option'],
    required: true
  },
  shares: {
    type: Number,
    required: true,
    min: 0
  },
  ownershipPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  investmentAmount: {
    type: Number,
    min: 0
  },
  investmentDate: {
    type: Date
  },
  fullyDiluted: {
    type: Boolean,
    default: false
  },
      notes: {
        type: String,
        trim: true
      },
      // Vesting fields
      vestingStartDate: {
        type: Date
      },
      vestingCliffMonths: {
        type: Number,
        min: 0,
        default: 0
      },
      vestingPeriodMonths: {
        type: Number,
        min: 0
      },
      vestingSchedule: {
        type: String,
        enum: ['linear', 'monthly', 'quarterly', 'annual'],
        default: 'linear'
      }
    }, { _id: true });

const capTableSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'El nombre de la empresa es requerido'],
    trim: true
  },
  totalShares: {
    type: Number,
    required: true,
    min: 0
  },
  shareholders: [shareholderSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullyDilutedShares: {
    type: Number,
    min: 0
  },
  outstandingShares: {
    type: Number,
    min: 0
  },
  reservedPool: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

// Middleware para calcular dilución automáticamente
capTableSchema.pre('save', function(next) {
  // Calcular total de shares de shareholders
  const totalShareholderShares = this.shareholders.reduce((sum, sh) => sum + (sh.shares || 0), 0);
  
  // Actualizar outstanding shares (solo las emitidas a shareholders)
  this.outstandingShares = totalShareholderShares;
  
  // El reserved pool es parte del total autorizado, no adicional
  // Fully diluted = outstanding + reserved (ambos dentro del total autorizado)
  const reservedPool = this.reservedPool || 0;
  this.fullyDilutedShares = (this.outstandingShares || 0) + reservedPool;
  
  // Validar que outstanding + reserved no exceda el total autorizado
  if (this.totalShares > 0 && this.fullyDilutedShares > this.totalShares) {
    // Ajustar reserved pool si es necesario (no debería pasar, pero por seguridad)
    const maxReservedPool = Math.max(0, this.totalShares - (this.outstandingShares || 0));
    if (reservedPool > maxReservedPool) {
      this.reservedPool = maxReservedPool;
      this.fullyDilutedShares = this.totalShares;
    }
  }
  
  // Recalcular ownership percentages si es necesario
  if (this.fullyDilutedShares > 0) {
    this.shareholders.forEach(sh => {
      if (sh.fullyDiluted) {
        // Ownership basado en fully diluted (outstanding + reserved)
        sh.ownershipPercentage = (sh.shares / this.fullyDilutedShares) * 100;
      } else {
        // Ownership basado solo en outstanding shares
        sh.ownershipPercentage = (sh.shares / (this.outstandingShares || 1)) * 100;
      }
    });
  }
  
      this.lastUpdated = new Date();
      next();
    });

// Método virtual para calcular shares vested
shareholderSchema.virtual('vestedShares').get(function() {
  if (!this.vestingStartDate || !this.vestingPeriodMonths || !this.shares) {
    return this.shares || 0; // Si no hay vesting, todas las shares están vested
  }

  const now = new Date();
  const startDate = new Date(this.vestingStartDate);
  const monthsElapsed = Math.max(0, 
    (now.getFullYear() - startDate.getFullYear()) * 12 + 
    (now.getMonth() - startDate.getMonth())
  );

  // Aplicar cliff
  const cliffMonths = this.vestingCliffMonths || 0;
  if (monthsElapsed < cliffMonths) {
    return 0; // Todavía en período de cliff
  }

  // Calcular shares vested según el schedule
  const totalShares = this.shares || 0;
  const vestingPeriod = this.vestingPeriodMonths;
  
  if (this.vestingSchedule === 'linear') {
    // Vesting lineal: porcentaje basado en meses transcurridos
    const vestedPercentage = Math.min(100, (monthsElapsed / vestingPeriod) * 100);
    return Math.floor((totalShares * vestedPercentage) / 100);
  } else if (this.vestingSchedule === 'monthly') {
    // Vesting mensual: se veste 1/vestingPeriod cada mes después del cliff
    const monthsVested = Math.min(vestingPeriod, monthsElapsed - cliffMonths);
    return Math.floor((totalShares * monthsVested) / vestingPeriod);
  } else if (this.vestingSchedule === 'quarterly') {
    // Vesting trimestral: se veste cada 3 meses
    const quartersVested = Math.floor((monthsElapsed - cliffMonths) / 3);
    const totalQuarters = Math.floor(vestingPeriod / 3);
    return Math.floor((totalShares * quartersVested) / totalQuarters);
  } else if (this.vestingSchedule === 'annual') {
    // Vesting anual: se veste cada 12 meses
    const yearsVested = Math.floor((monthsElapsed - cliffMonths) / 12);
    const totalYears = Math.floor(vestingPeriod / 12);
    return Math.floor((totalShares * yearsVested) / totalYears);
  }

  return totalShares;
});

shareholderSchema.virtual('unvestedShares').get(function() {
  const totalShares = this.shares || 0;
  const vested = (this as any).vestedShares || 0;
  return Math.max(0, totalShares - vested);
});

// Asegurar que los virtuals se incluyan en JSON y toObject
shareholderSchema.set('toJSON', { virtuals: true });
shareholderSchema.set('toObject', { virtuals: true });

export default mongoose.models.CapTable || mongoose.model<ICapTable>('CapTable', capTableSchema);

