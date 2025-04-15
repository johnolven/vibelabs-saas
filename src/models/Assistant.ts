import mongoose from 'mongoose';

export interface IAssistant extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  objective: string;
  openingPhrase: string;
  knowledgeBase: string;
  links: string[];
}

const assistantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Por favor ingresa un nombre para el CEO virtual'],
    trim: true
  },
  objective: {
    type: String,
    required: [true, 'Por favor define el objetivo principal del CEO virtual'],
    trim: true
  },
  openingPhrase: {
    type: String,
    required: [true, 'Por favor ingresa una frase de apertura'],
    trim: true
  },
  knowledgeBase: {
    type: String,
    required: [true, 'Por favor ingresa la base de conocimientos'],
    trim: true
  },
  links: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

export default mongoose.models.Assistant || mongoose.model<IAssistant>('Assistant', assistantSchema); 