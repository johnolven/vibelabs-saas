import mongoose from 'mongoose';

export type SubscriberStatus = 'active' | 'unsubscribed';

export interface ISubscriber extends mongoose.Document {
  email: string;
  newsletterId: mongoose.Types.ObjectId;
  status: SubscriberStatus;
  subscribedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalido'],
  },
  newsletterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Newsletter',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed'],
    default: 'active',
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

subscriberSchema.index({ email: 1, newsletterId: 1 }, { unique: true });

export default mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', subscriberSchema);
