import mongoose from 'mongoose';

export type IssueStatus = 'draft' | 'sent' | 'failed';

export interface INewsletterIssue extends mongoose.Document {
  newsletterId: mongoose.Types.ObjectId;
  subject: string;
  contentHtml: string;
  contentText: string;
  generatedAt: Date;
  sentAt?: Date;
  recipientCount: number;
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterIssueSchema = new mongoose.Schema({
  newsletterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Newsletter',
    required: true,
    index: true,
  },
  subject: {
    type: String,
    required: [true, 'El asunto es requerido'],
    trim: true,
  },
  contentHtml: {
    type: String,
    required: true,
  },
  contentText: {
    type: String,
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  sentAt: {
    type: Date,
  },
  recipientCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'failed'],
    default: 'draft',
  },
}, {
  timestamps: true,
});

export default mongoose.models.NewsletterIssue || mongoose.model<INewsletterIssue>('NewsletterIssue', newsletterIssueSchema);
