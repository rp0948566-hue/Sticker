import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const check = (label, file, mustContain, mustNotContain = []) => {
  const src = readFileSync(file, 'utf-8');
  let pass = true;
  for (const s of mustContain) {
    if (!src.includes(s)) { console.log(`FAIL [${label}] missing: "${s}"`); pass = false; }
  }
  for (const s of mustNotContain) {
    if (src.includes(s)) { console.log(`FAIL [${label}] must NOT contain: "${s}"`); pass = false; }
  }
  if (pass) console.log(`PASS  ${label}`);
};

console.log('\n──────────────────────────────────────────');
console.log('STATIC FILE AUDIT');
console.log('──────────────────────────────────────────');

check('db.js: reads process.env.MONGODB_URI',
  'src/config/db.js',
  ['process.env.MONGODB_URI', 'MONGODB_URI environment variable is required']
);
check('db.js: no hardcoded localhost fallback',
  'src/config/db.js',
  [],
  ['localhost:27017']
);
check('db.js: credential sanitizer',
  'src/config/db.js',
  ['sanitizeUri', '[REDACTED]']
);
check('api/index.js: MONGODB_URI boot guard',
  'api/index.js',
  ['process.env.MONGODB_URI', 'MONGODB_URI is not set']
);
check('api/index.js: JWT_SECRET boot guard',
  'api/index.js',
  ['process.env.JWT_SECRET', 'JWT_SECRET is not set']
);
check('api/index.js: Atlas connection success log',
  'api/index.js',
  ['MongoDB Atlas connected', 'conn.connection.host']
);
check('product.model.js: enum is Out of Stock (lowercase o)',
  'src/models/product.model.js',
  ["'Out of Stock'"]
);
check('product.model.js: NO Out Of Stock (capital O)',
  'src/models/product.model.js',
  [],
  ["'Out Of Stock'"]
);
check('vite.config.js: /api proxy to :5000 present',
  'vite.config.js',
  ["'/api'", 'localhost:5000', 'proxy']
);
check('lazy-load.js: fetches /api/v1/products',
  'src/lazy-load.js',
  ['/api/v1/products']
);
check('vercel.json: /api/* routed to api/index.js',
  'vercel.json',
  ['/api/(.*)', '/api/index.js']
);

console.log('\n──────────────────────────────────────────');
console.log('ENVIRONMENT VARIABLE AUDIT');
console.log('──────────────────────────────────────────');

const uri = process.env.MONGODB_URI || '';
const sanitize = (u) => u.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@)/, '$1[REDACTED]$2');
const isPlaceholder = uri.includes('<db_password>');
const isAtlas = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');

console.log('MONGODB_URI present  :', uri ? 'YES' : 'NO  ← MISSING');
console.log('MONGODB_URI filled   :', isPlaceholder ? 'NO  ← <db_password> not replaced' : 'YES');
console.log('MONGODB_URI is Atlas :', isAtlas ? 'YES' : 'NO  ← not an Atlas URI');
console.log('MONGODB_URI (safe)   :', sanitize(uri) || '(empty)');
console.log('JWT_SECRET present   :', process.env.JWT_SECRET ? 'YES' : 'NO  ← MISSING');

console.log('\n──────────────────────────────────────────');
console.log('FIRST FAILING STEP');
console.log('──────────────────────────────────────────');

if (!uri) {
  console.log('FAIL → ENV: MONGODB_URI not set');
  console.log('FIX  → Set MONGODB_URI in Vercel Project Settings → Environment Variables');
} else if (isPlaceholder) {
  console.log('FAIL → ENV: MONGODB_URI contains placeholder <db_password>');
  console.log('FIX  → In Vercel: Project → Settings → Environment Variables');
  console.log('       Set MONGODB_URI to the full URI with actual password');
  console.log('       mongodb+srv://STICKER:<PASSWORD>@stickitup.ll3zitw.mongodb.net/stickitup?retryWrites=true&w=majority&appName=stickitup');
} else {
  console.log('PASS → ENV looks correct. Run server to test Atlas connection.');
}
