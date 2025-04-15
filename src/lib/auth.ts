import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const verifyToken = async (token: string): Promise<Types.ObjectId> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return new Types.ObjectId(decoded.userId);
  } catch {
    throw new Error('Token inválido');
  }
}; 