/**
 * FULL-CHAIN DIAGNOSTIC — StickItUp Catalog
 *
 * Tests every layer in order and stops at the first failure:
 *   ENV → MongoDB → Route → Controller → Query → Response Schema → Frontend Parser
 *
 * Run: node scratch/diagnose.mjs
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Step 0: Load .env manually ────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 0 — ENVIRONMENT VARIABLES');
console.log('══════════════════════════════════════════════');

const envPath = resolve(ROOT, '.env');
if (!existsSync(envPath)) {
  console.log('❌ .env file NOT FOUND at', envPath);
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
for (const line of envLines) {
  const [k, ...rest] = line.split('=');
  const v = rest.join('=').trim();
  process.env[k.trim()] = v;
}

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET  = process.env.JWT_SECRET;
const PORT        = process.env.PORT || 5000;

console.log('MONGODB_URI source : .env line →', envLines.find(l => l.startsWith('MONGODB_URI')) || 'NOT FOUND');
console.log('MONGODB_URI value  :', MONGODB_URI || '❌ NOT SET');
console.log('JWT_SECRET         :', JWT_SECRET  ? '✅ SET' : '❌ NOT SET');
console.log('PORT               :', PORT);

if (!MONGODB_URI) {
  console.log('\n❌ FIRST FAILURE → STEP 0: MONGODB_URI not set in .env');
  process.exit(1);
}

// ─── Step 1: MongoDB Connection ─────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 1 — MONGODB CONNECTION TEST');
console.log('══════════════════════════════════════════════');
console.log('Connecting to:', MONGODB_URI);

let mongoose, dbConnected = false;
try {
  const m = await import('mongoose');
  mongoose = m.default;
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000, bufferCommands: false });
  dbConnected = true;
  console.log('✅ MongoDB CONNECTED');
  console.log('   readyState :', mongoose.connection.readyState, '(1 = connected)');
  console.log('   host       :', mongoose.connection.host);
  console.log('   db name    :', mongoose.connection.name);
} catch (err) {
  console.log('❌ FIRST FAILURE → STEP 1: MongoDB connection REFUSED');
  console.log('   Error      :', err.message);
  console.log('\n   FIX: Update MONGODB_URI in .env to your Atlas URI:');
  console.log('   MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/stickitup');
  process.exit(1);
}

// ─── Step 2: Collection exists + document count ──────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 2 — DATABASE CONTENTS');
console.log('══════════════════════════════════════════════');

const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();
const collectionNames = collections.map(c => c.name);
console.log('Collections found  :', collectionNames.join(', ') || '(none)');

if (!collectionNames.includes('products')) {
  console.log('❌ FIRST FAILURE → STEP 2: "products" collection does NOT EXIST');
  console.log('   The database is empty. No products have been seeded.');
  process.exit(1);
}

const productCount = await db.collection('products').countDocuments();
console.log('products count     :', productCount);

if (productCount === 0) {
  console.log('❌ FIRST FAILURE → STEP 2: products collection is EMPTY (0 documents)');
  console.log('   The catalog has no products to display.');
  process.exit(1);
}
console.log('✅ Products collection OK —', productCount, 'documents');

// ─── Step 3: Raw MongoDB query (exact query the controller runs) ─────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 3 — EXACT CONTROLLER QUERY EXECUTION');
console.log('══════════════════════════════════════════════');

const LIMIT = 20;
const query = {}; // no cursor, no category, no search — first page
console.log('Query              :', JSON.stringify(query));
console.log('Sort               : { _id: -1 }');
console.log('Limit              :', LIMIT + 1, '(limit+1 to detect hasMore)');

let rawProducts;
try {
  rawProducts = await db.collection('products')
    .find(query)
    .sort({ _id: -1 })
    .limit(LIMIT + 1)
    .toArray();

  console.log('✅ Query executed — returned', rawProducts.length, 'raw documents');
  if (rawProducts.length > 0) {
    const sample = rawProducts[0];
    console.log('   First doc _id   :', String(sample._id));
    console.log('   First doc keys  :', Object.keys(sample).join(', '));
    const missingFields = ['title', 'price', 'image', 'inventoryStatus'].filter(f => !(f in sample));
    if (missingFields.length > 0) {
      console.log('⚠️  Missing schema fields in document:', missingFields.join(', '));
    } else {
      console.log('   Schema fields   : title ✅  price ✅  image ✅  inventoryStatus ✅');
    }
  }
} catch (err) {
  console.log('❌ FIRST FAILURE → STEP 3: Query threw exception');
  console.log('   Error:', err.message);
  process.exit(1);
}

// ─── Step 4: Response shape — does it match what frontend expects? ────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 4 — RESPONSE SCHEMA VALIDATION');
console.log('══════════════════════════════════════════════');

const hasMore = rawProducts.length > LIMIT;
if (hasMore) rawProducts.pop();

// Simulate encodeCursor
const encodeCursor = (data) => Buffer.from(JSON.stringify(data)).toString('base64');
const nextCursor = rawProducts.length > 0
  ? encodeCursor({ id: rawProducts[rawProducts.length - 1]._id })
  : null;

const backendResponse = { products: rawProducts, nextCursor, hasMore };

console.log('Backend response shape:');
console.log('  products          :', Array.isArray(backendResponse.products) ? `Array(${backendResponse.products.length})` : '❌ NOT AN ARRAY');
console.log('  nextCursor        :', backendResponse.nextCursor ? `"${backendResponse.nextCursor.substring(0, 20)}..."` : 'null (no more pages)');
console.log('  hasMore           :', backendResponse.hasMore);

// Frontend expects (src/lazy-load.js line 236-237):
//   data.nextCursor  → nextCursor
//   data.hasMore     → hasMore
//   data.products    → array of product objects
console.log('\nFrontend parser (lazy-load.js:236-237) expects:');
console.log('  data.products     :', 'nextCursor' in backendResponse ? '✅ present' : '❌ MISSING');
console.log('  data.nextCursor   :', 'products' in backendResponse ? '✅ present' : '❌ MISSING');
console.log('  data.hasMore      :', 'hasMore' in backendResponse ? '✅ present' : '❌ MISSING');

// Check each product has fields the card renderer needs (lazy-load.js:102-134)
const cardRequiredFields = ['_id', 'title', 'price', 'image', 'inventoryStatus'];
let schemaFail = false;
for (const p of backendResponse.products.slice(0, 3)) {
  for (const field of cardRequiredFields) {
    if (!(field in p)) {
      console.log(`❌ Product ${p._id} missing field: "${field}" — card renderer will crash`);
      schemaFail = true;
    }
  }
}
if (!schemaFail) {
  console.log('✅ All required card fields present in documents');
}

// ─── Step 5: Start Express server and fire real HTTP request ─────────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 5 — LIVE HTTP REQUEST THROUGH EXPRESS');
console.log('══════════════════════════════════════════════');

await mongoose.disconnect();

// Dynamically import the actual Express app
let app;
try {
  const mod = await import('../api/index.js');
  app = mod.default;
  console.log('✅ api/index.js imported successfully');
} catch (err) {
  console.log('❌ FIRST FAILURE → STEP 5: api/index.js import failed');
  console.log('   Error:', err.message);
  process.exit(1);
}

// Spin up a test HTTP server on a free port
const TEST_PORT = 5099;
const server = http.createServer(app);
await new Promise(r => server.listen(TEST_PORT, r));
console.log('✅ Test server listening on port', TEST_PORT);

// Wait for DB to connect inside the app
await new Promise(r => setTimeout(r, 2000));

// Fire the exact request the frontend makes
const REQUEST_URL = `http://localhost:${TEST_PORT}/api/v1/products?limit=20`;
console.log('\nRequest URL        :', REQUEST_URL);

let httpStatus, httpBody, httpHeaders;
try {
  const response = await fetch(REQUEST_URL);
  httpStatus  = response.status;
  httpHeaders = Object.fromEntries(response.headers.entries());
  httpBody    = await response.text();
  console.log('HTTP Status        :', httpStatus);
  console.log('Content-Type       :', httpHeaders['content-type']);
  console.log('Response body      :', httpBody.substring(0, 500));
} catch (err) {
  console.log('❌ FIRST FAILURE → STEP 5: fetch threw exception');
  console.log('   Error:', err.message);
  server.close();
  process.exit(1);
}

// ─── Step 6: Parse response body as frontend would ──────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 6 — FRONTEND JSON PARSING (lazy-load.js)');
console.log('══════════════════════════════════════════════');
console.log('Simulating: if (!res.ok) throw new Error("API server returned error")');

if (httpStatus !== 200) {
  console.log('❌ FIRST FAILURE → STEP 6: res.ok is FALSE (status', httpStatus + ')');
  console.log('   lazy-load.js:230 will throw → catch block → renderRetryButton()');
  console.log('   Shown to user: "Failed to Load Catalog / The connection timed out or a server error occurred."');
  console.log('\n   Raw response body:', httpBody);
  server.close();
  process.exit(1);
}

let parsedData;
try {
  parsedData = JSON.parse(httpBody);
  console.log('✅ JSON.parse succeeded');
} catch (err) {
  console.log('❌ FIRST FAILURE → STEP 6: JSON.parse threw SyntaxError');
  console.log('   Error:', err.message);
  console.log('   Raw body:', httpBody.substring(0, 200));
  server.close();
  process.exit(1);
}

console.log('parsedData.products  :', Array.isArray(parsedData.products) ? `Array(${parsedData.products.length})` : String(parsedData.products));
console.log('parsedData.nextCursor:', parsedData.nextCursor);
console.log('parsedData.hasMore   :', parsedData.hasMore);

// ─── Step 7: Frontend render check ──────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 7 — FRONTEND RENDER COMPATIBILITY');
console.log('══════════════════════════════════════════════');
console.log('Checking each product card field (lazy-load.js:102-134):');

let renderFail = false;
for (const [i, p] of (parsedData.products || []).slice(0, 5).entries()) {
  const missing = cardRequiredFields.filter(f => p[f] === undefined || p[f] === null);
  if (missing.length > 0) {
    console.log(`❌ Product[${i}] _id=${p._id} — missing render fields: ${missing.join(', ')}`);
    renderFail = true;
  } else {
    const inv = p.inventoryStatus;
    const validStatuses = ['In Stock', 'Low Stock', 'Out of Stock'];
    if (!validStatuses.includes(inv)) {
      console.log(`⚠️  Product[${i}] inventoryStatus="${inv}" — unexpected value, card renders but badge color wrong`);
    }
  }
}
if (!renderFail) {
  console.log('✅ All product card fields present and renderable');
}

// ─── Step 8: Vite proxy check ────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('STEP 8 — VITE DEV SERVER PROXY');
console.log('══════════════════════════════════════════════');
const vcPath = resolve(ROOT, 'vite.config.js');
const vc = readFileSync(vcPath, 'utf-8');
const hasProxy = vc.includes('proxy');
console.log('vite.config.js has proxy:', hasProxy ? '✅ YES' : '❌ NO');
if (!hasProxy) {
  console.log('⚠️  No Vite proxy defined.');
  console.log('   In dev (npm run dev), Vite serves on :5173.');
  console.log('   fetch("/api/v1/products") → hits :5173, NOT Express on :5000');
  console.log('   Vite returns 404 HTML for unknown API paths.');
  console.log('   JSON.parse("<html>...") → SyntaxError → retry button shown.');
  console.log('\n   THIS IS THE FAILURE IN LOCAL DEV MODE.');
}

// ─── Final Summary ────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('DIAGNOSTIC COMPLETE');
console.log('══════════════════════════════════════════════');
server.close();
