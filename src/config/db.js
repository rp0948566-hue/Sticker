import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ── Credential-safe URI sanitizer ────────────────────────────────────────────
// Strips password from mongodb+srv://user:PASSWORD@host URIs before logging.
const sanitizeUri = (uri = '') =>
  uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@)/, '$1[REDACTED]$2');

// ── Startup guard — fail immediately if MONGODB_URI is not set ───────────────
if (!process.env.MONGODB_URI) {
  console.error(
    '[DB] CRITICAL: MONGODB_URI environment variable is not set.\n' +
    '     Set it in Vercel → Project → Settings → Environment Variables.\n' +
    '     Required format: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>'
  );
  // Throw rather than process.exit so the error propagates cleanly in serverless
  throw new Error('MONGODB_URI environment variable is required but not set.');
}

const MONGODB_URI = process.env.MONGODB_URI;

// ── Vercel serverless-safe connection cache ───────────────────────────────────
let cachedConnection = global.mongoose;

if (!cachedConnection) {
  cachedConnection = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cachedConnection.conn) {
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    cachedConnection.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((m) => m);
  }

  try {
    cachedConnection.conn = await cachedConnection.promise;
  } catch (e) {
    cachedConnection.promise = null;
    // Re-throw with sanitized message — never expose the URI or password in logs
    throw new Error(
      `MongoDB connection failed [${sanitizeUri(MONGODB_URI)}]: ${e.message}`
    );
  }

  return cachedConnection.conn;
};

export default connectDB;

