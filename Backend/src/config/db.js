import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not set in backend environment.');
  }

  // Ensure angle brackets are stripped if present
  let uri = env.mongoUri.replace(/:<([^>]+)>@/, ':$1@');

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'AgriConnectAI',
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[MongoDB Atlas] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Atlas] Connection failed: ${error.message}`);
    throw error;
  }
}
