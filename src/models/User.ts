import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'user' | 'client';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'none';
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  googleId?: string;
  role: UserRole;
  status: UserStatus;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  // Stripe fields
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionCurrentPeriodEnd?: Date;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor ingresa tu nombre'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Por favor ingresa tu correo electrónico'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un correo electrónico válido'],
  },
  password: {
    type: String,
    required: [true, 'Por favor ingresa una contraseña'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'client'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  // Stripe fields
  stripeCustomerId: {
    type: String,
    sparse: true,
    unique: true
  },
  subscriptionId: {
    type: String,
    sparse: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing', 'none'],
    default: 'none'
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  subscriptionCurrentPeriodEnd: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Asegurar que role siempre se incluye en la serialización
      if (!ret.role) {
        ret.role = doc.role || 'user';
      }
      return ret;
    }
  }
});

// Hash de la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Error al hashear la contraseña'));
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema); 