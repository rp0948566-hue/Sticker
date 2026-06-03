import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let cachedConnection = global.mongoose;

if (!cachedConnection) {
  cachedConnection = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cachedConnection.conn) {
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    const opts = {
      bufferCommands: false,
    };

    cachedConnection.promise = mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/stickitup',
      opts
    ).then((m) => m);
  }

  try {
    cachedConnection.conn = await cachedConnection.promise;
  } catch (e) {
    cachedConnection.promise = null;
    throw e;
  }

  return cachedConnection.conn;
};

export default connectDB;
