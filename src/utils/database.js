import mongoose from 'mongoose';

const defaultOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
};

export async function connectDatabase(uri, options = {}) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { ...defaultOptions, ...options });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
