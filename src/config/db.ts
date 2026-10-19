
import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);

  console.log('MongoDB connected successfully');
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
