import mongoose from 'mongoose';
import { env, assertServerEnv } from './env.js';

export const connectDB = async () => {
  assertServerEnv();
  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000
  });
  console.log(`MongoDB connected: ${connection.connection.host}`);
  return connection;
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};
