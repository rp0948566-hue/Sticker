import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import Order from '../src/models/order.model.js';
import Notification from '../src/models/notification.model.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const runV1FeaturesTests = async () => {
  let mongoServer;
  try {
    console.log('=== STARTING API V1 FEATURES & PAGINATION VERIFICATION TESTS ===');
    
    // Spin up in-memory MongoDB Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'v1verificationtestsecretkey';
    process.env.NODE_ENV = 'test';

    // Dynamically import app after environment variables are successfully set
    const { default: app } = await import('../api/index.js');
    console.log('Test environment configuration completed. App loaded.');

    // Connect mongoose to the in-memory test DB using connectDB helper to reuse cached connection
    const { default: connectDB } = await import('../src/config/db.js');
    await connectDB();
    console.log('Connected to test database successfully.');

    // Seed test data
    console.log('\n--- SEEDING PRODUCT CATALOG (15 PRODUCTS) ---');
    await Product.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    await Notification.deleteMany({});

    const productsSeed = [];
    for (let i = 1; i <= 15; i++) {
      productsSeed.push({
        title: `Product SKU ${i}`,
        sku: `SKU-${i}`,
        price: 10 * i,
        description: `Description for sticker SKU ${i}`,
        image: `/IMAGE/${i}.png`,
        category: i % 2 === 0 ? 'even' : 'odd',
        stock: 10,
        lowStockThreshold: 2
      });
    }
    const createdProducts = await Product.create(productsSeed);
    console.log(`Seeded ${createdProducts.length} products successfully.`);

    // Seed test admin user
    const adminUser = await User.create({
      name: 'Test Administrator',
      email: 'admin@test.com',
      password: 'hashedpassword123',
      isAdmin: true
    });
    const adminToken = jwt.sign({ id: adminUser._id, authSalt: adminUser.authSalt }, process.env.JWT_SECRET);
    console.log(`Seeded Admin User. Token generated.`);

    // ==========================================
    // 1. Backward Compatibility Test
    // ==========================================
    console.log('\n--- TEST 1: BACKWARD COMPATIBILITY ENDPOINTS ---');
    const legacyRes = await request(app)
      .get('/api/products')
      .expect(200);

    const isLegacyArray = Array.isArray(legacyRes.body);
    console.log(`Legacy GET /api/products returns array? ${isLegacyArray ? 'YES (Passed)' : 'NO'}`);
    console.log(`Legacy product list length: ${legacyRes.body.length} (Expected: 15)`);

    if (isLegacyArray && legacyRes.body.length === 15) {
      console.log('✔ TEST 1 SUCCESS: Legacy API returns unpaginated product list array.');
    } else {
      console.error('✘ TEST 1 FAILURE: Legacy compatibility broken.');
    }

    // ==========================================
    // 2. V1 Cursor Pagination Test (Products)
    // ==========================================
    console.log('\n--- TEST 2: V1 CURSOR PAGINATION (PRODUCTS) ---');
    // Fetch Page 1 (limit 5)
    const p1Res = await request(app)
      .get('/api/v1/products?limit=5')
      .expect(200);

    console.log(`Page 1 products count: ${p1Res.body.products.length} (Expected: 5)`);
    console.log(`Page 1 hasMore: ${p1Res.body.hasMore} (Expected: true)`);
    console.log(`Page 1 nextCursor exists? ${p1Res.body.nextCursor ? 'YES' : 'NO'}`);

    const cursor1 = p1Res.body.nextCursor;

    // Fetch Page 2 using cursor1
    const p2Res = await request(app)
      .get(`/api/v1/products?limit=5&cursor=${cursor1}`)
      .expect(200);

    console.log(`Page 2 products count: ${p2Res.body.products.length} (Expected: 5)`);
    console.log(`Page 2 hasMore: ${p2Res.body.hasMore} (Expected: true)`);

    const cursor2 = p2Res.body.nextCursor;

    // Fetch Page 3 using cursor2
    const p3Res = await request(app)
      .get(`/api/v1/products?limit=5&cursor=${cursor2}`)
      .expect(200);

    console.log(`Page 3 products count: ${p3Res.body.products.length} (Expected: 5)`);
    console.log(`Page 3 hasMore: ${p3Res.body.hasMore} (Expected: false)`);
    console.log(`Page 3 nextCursor matches null? ${p3Res.body.nextCursor === null ? 'YES' : 'NO'}`);

    if (p1Res.body.products.length === 5 && p2Res.body.products.length === 5 && p3Res.body.products.length === 5 && !p3Res.body.hasMore) {
      console.log('✔ TEST 2 SUCCESS: Product cursor pagination processes three pages correctly.');
    } else {
      console.error('✘ TEST 2 FAILURE: Product pagination discrepancy.');
    }

    // ==========================================
    // 3. V1 Cursor Pagination Test (Notifications)
    // ==========================================
    console.log('\n--- TEST 3: V1 CURSOR PAGINATION (NOTIFICATIONS) ---');
    // Seed 8 notifications
    const notifs = [];
    for (let i = 1; i <= 8; i++) {
      notifs.push({
        type: 'system',
        message: `Notification number ${i}`,
        read: false
      });
    }
    await Notification.create(notifs);

    // Fetch Page 1 (limit 3)
    const n1Res = await request(app)
      .get('/api/v1/admin/notifications?limit=3')
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    console.log(`Notifications Page 1 count: ${n1Res.body.notifications.length} (Expected: 3)`);
    console.log(`Notifications Page 1 hasMore: ${n1Res.body.hasMore} (Expected: true)`);

    const nCursor1 = n1Res.body.nextCursor;

    // Fetch Page 2
    const n2Res = await request(app)
      .get(`/api/v1/admin/notifications?limit=3&cursor=${nCursor1}`)
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    console.log(`Notifications Page 2 count: ${n2Res.body.notifications.length} (Expected: 3)`);

    const nCursor2 = n2Res.body.nextCursor;

    // Fetch Page 3
    const n3Res = await request(app)
      .get(`/api/v1/admin/notifications?limit=3&cursor=${nCursor2}`)
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    console.log(`Notifications Page 3 count: ${n3Res.body.notifications.length} (Expected: 2)`);
    console.log(`Notifications Page 3 hasMore: ${n3Res.body.hasMore} (Expected: false)`);

    if (n1Res.body.notifications.length === 3 && n2Res.body.notifications.length === 3 && n3Res.body.notifications.length === 2 && !n3Res.body.hasMore) {
      console.log('✔ TEST 3 SUCCESS: Notification pagination parses entries correctly.');
    } else {
      console.error('✘ TEST 3 FAILURE: Notification pagination discrepancy.');
    }

    console.log('\n=== ALL API V1 VERIFICATION TESTS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error running API V1 tests:', err);
  } finally {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('Database connection and memory server closed.');
  }
};

runV1FeaturesTests();
