import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const sanitize = (u) => (u || '').replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@)/, '$1[REDACTED]$2');

console.log('');
console.log('=== DIAGNOSTIC: process.env.MONGODB_URI read test ===');
console.log('');

if (!uri) {
  console.log('RESULT     : ❌ MISSING — MONGODB_URI not in process.env');
  console.log('FIX        : Set MONGODB_URI in .env (local) or Vercel env vars (production)');
} else if (uri.includes('<db_password>')) {
  console.log('RESULT     : ⚠️  TEMPLATE — URI loaded but <db_password> not replaced');
  console.log('Sanitized  :', sanitize(uri));
  console.log('');
  console.log('FIX (local): Edit .env, replace <db_password> with your Atlas password');
  console.log('FIX (prod) : In Vercel → Project → Settings → Environment Variables');
  console.log('             set MONGODB_URI to the full URI including actual password');
} else {
  console.log('RESULT     : ✅ SET — MONGODB_URI is present and not a placeholder');
  console.log('Sanitized  :', sanitize(uri));
  console.log('db.js will : mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false })');
}
