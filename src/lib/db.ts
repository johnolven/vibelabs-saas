import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Por favor, define la variable de entorno MONGODB_URI');
}

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

async function connectDB(): Promise<typeof mongoose> {
  try {
    if (isConnected) {
      return mongoose;
    }

    const opts = {
      bufferCommands: false,
    };

    await mongoose.connect(MONGODB_URI, opts);
    isConnected = true;
    return mongoose;
  } catch (error) {
    isConnected = false;
    throw error;
  }
}

export default connectDB; 