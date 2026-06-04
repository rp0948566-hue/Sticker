import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from '../src/config/db.js';
import Settings from '../src/models/settings.model.js';
import { logEvent } from '../src/utils/logger.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import v1Router from '../src/routes/index.js';
import legacyRouter from '../src/routes/legacy.routes.js';
import { intrusionDetection } from '../src/middleware/intrusion-detection.middleware.js';
import { adaptiveProtection } from '../src/middleware/adaptive-protection.middleware.js';
import { runStartupRecovery } from '../src/services/security-recovery.service.js';

dotenv.config();

// ── Required environment variable guards ──────────────────────────────────────
// Both are checked immediately on boot. Clear messages tell the operator exactly
// where to set them — without logging the secret values themselves.

if (!process.env.JWT_SECRET) {
  logEvent('error', 'SYSTEM',
    'CRITICAL BOOT ERROR: JWT_SECRET is not set. ' +
    'Add it in Vercel → Project → Settings → Environment Variables.'
  );
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  logEvent('error', 'SYSTEM',
    'CRITICAL BOOT ERROR: MONGODB_URI is not set. ' +
    'Add it in Vercel → Project → Settings → Environment Variables. ' +
    'Format: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>'
  );
  process.exit(1);
}


const app = express();

// Whitelist CORS access origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));

// Enable raw body buffer access for webhook signature verification checks
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Middleware to ensure DB connection is active before processing requests (Vercel serverless safe)
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (error) {
    logEvent('error', 'DATABASE_CONNECTION_FAIL', `Database connection failure: ${error.message}`);
    res.status(500).json({ message: 'Database connection failed. Please try again.' });
  }
});

// ── Security Shield: Intrusion Detection (passive scan, before all routes) ──
app.use(intrusionDetection);

// ── Security Shield: Adaptive Protection (enforcement layer) ──
app.use(adaptiveProtection);

// Initialize Database connection eagerly on load
if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then((conn) => {
      logEvent('info', 'DATABASE', `MongoDB Atlas connected — host: ${conn.connection.host}, db: ${conn.connection.name}`);
    })
    .then(() => initSettings())
    .then(() => runStartupRecovery())
    .catch(err => logEvent('error', 'DATABASE_INIT', `Startup DB connection failed: ${err.message}`));
}

// Setup default settings on start
const initSettings = async () => {
  try {
    const duration = await Settings.findOne({ key: 'reservationDurationHours' });
    if (!duration) {
      await Settings.create({ key: 'reservationDurationHours', value: 0.25 }); // 15 mins default
      logEvent('info', 'SYSTEM', 'Default global reservation hours set to 15 minutes.');
    }
  } catch (error) {
    logEvent('error', 'SYSTEM', `Failed to initialize settings: ${error.message}`);
  }
};

// Mount routers
app.use('/api/v1', v1Router);
app.use('/api', legacyRouter);

// Root Route handler for deployment validation
app.get('/', (req, res) => {
  res.send('StickItUp E-commerce API running successfully.');
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logEvent('info', 'SYSTEM', `Server running on port ${PORT}`);
  });
}

export default app;
