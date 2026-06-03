import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import connectDB from '../src/config/db.js';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import Cart from '../src/models/cart.model.js';
import Order from '../src/models/order.model.js';
import Reservation from '../src/models/reservation.model.js';
import Notification from '../src/models/notification.model.js';
import Settings from '../src/models/settings.model.js';
import { protect, admin } from '../src/middleware/auth.middleware.js';
import { sendAdminEmail, sendCustomerEmail } from '../src/utils/email.js';
import { logEvent } from '../src/utils/logger.js';
import { errorHandler } from '../src/middleware/error.middleware.js';

dotenv.config();

// Ensure JWT secret is explicitly set on boot
if (!process.env.JWT_SECRET) {
  logEvent('error', 'SYSTEM', 'CRITICAL BOOT ERROR: JWT_SECRET environment variable is missing.');
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

// Simple in-memory rate limiter to prevent dependencies count inflation
const ipRequestCounts = new Map();
const rateLimiter = (limit, windowMs) => {
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!ipRequestCounts.has(ip)) {
      ipRequestCounts.set(ip, []);
    }

    const requestTimes = ipRequestCounts.get(ip);
    const activeRequests = requestTimes.filter(time => now - time < windowMs);

    if (activeRequests.length >= limit) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    activeRequests.push(now);
    ipRequestCounts.set(ip, activeRequests);
    next();
  };
};

const authLimiter = rateLimiter(15, 15 * 60 * 1000); // 15 requests per 15 minutes
const checkoutLimiter = rateLimiter(5, 5 * 60 * 1000); // 5 requests per 5 minutes

// Initialize Database connection
if (process.env.NODE_ENV !== 'test') {
  connectDB();
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

if (process.env.NODE_ENV !== 'test') {
  initSettings();
}

// Security Cooldown helper logs
const handleFailureCooldown = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      if (user.failedAttempts >= 3) {
        user.cooldownUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minute cooldown
        user.failedAttempts = 0;
        logEvent('warn', 'USER_COOLDOWN', `User ${user.email} put in 15 minute checkout cooldown.`);
      }
      await user.save();
    }
  } catch (error) {
    logEvent('error', 'SYSTEM', `Failed to set cooldown: ${error.message}`);
  }
};

const handleSuccessReset = async (userId) => {
  try {
    await User.updateOne({ _id: userId }, { $set: { failedAttempts: 0, cooldownUntil: null } });
  } catch (error) {
    logEvent('error', 'SYSTEM', `Failed to reset cooldown attempts: ${error.message}`);
  }
};

// Merge guest user local storage cart into authenticated database cart
const mergeCarts = async (userId, cartItems) => {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) return;
  
  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], cartValue: 0 });
    }

    for (const item of cartItems) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        const existingItemIndex = cart.items.findIndex(
          i => i.productId.toString() === item.productId.toString()
        );
        if (existingItemIndex > -1) {
          cart.items[existingItemIndex].quantity += item.quantity;
        } else {
          cart.items.push({ productId: item.productId, quantity: item.quantity });
        }
      }
    }

    // Recalculate total value
    let totalValue = 0;
    for (const item of cart.items) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        totalValue += prod.price * item.quantity;
      }
    }
    cart.cartValue = totalValue;
    cart.lastActivity = new Date();
    await cart.save();
    logEvent('info', 'CART_MERGE', `Merged local storage cart into database cart for user ID: ${userId}`);
  } catch (error) {
    logEvent('error', 'CART_MERGE', `Failed to merge guest cart: ${error.message}`);
  }
};

// Passive reservations clean-up & notifications function
export const cleanupReservations = async () => {
  try {
    const now = new Date();

    // 1. Send expiring soon emails (30 mins warning) - Only relevant if reservation exceeds 30 mins
    const warningTime = new Date(now.getTime() + 30 * 60 * 1000);
    const expiringSoon = await Reservation.find({
      status: 'active',
      expiresAt: { $lte: warningTime, $gt: now },
      expiringSoonEmailSent: false
    }).populate('productId userId');

    for (const res of expiringSoon) {
      res.expiringSoonEmailSent = true;
      await res.save();
      if (res.userId && res.productId) {
        sendCustomerEmail(
          res.userId.email,
          'Reservation Expiring Soon',
          `Hello ${res.userId.name},\n\nYour reservation for "${res.productId.title}" (Quantity: ${res.quantity}) will expire in less than 30 minutes. Please complete your checkout to guarantee your items.`
        );
      }
    }

    // 2. Clear expired reservations and return stock
    const expired = await Reservation.find({
      status: 'active',
      expiresAt: { $lte: now }
    });

    for (const res of expired) {
      res.status = 'expired';
      res.deleteAt = new Date(); // Marks for TTL collection removal
      await res.save();

      const product = await Product.findById(res.productId);
      if (product) {
        // Atomic release of reservedStock
        await Product.updateOne(
          { _id: product._id },
          { $inc: { reservedStock: -res.quantity } }
        );
        await Product.updateOne(
          { _id: product._id, reservedStock: { $lt: 0 } },
          { $set: { reservedStock: 0 } }
        );
        
        // Fetch updated to calculate availableStock correctly on save/hook execution
        const updatedProduct = await Product.findById(product._id);
        if (updatedProduct) {
          await updatedProduct.save();
        }

        // Create Admin Notification
        await Notification.create({
          type: 'inventory',
          message: `Reservation expired for "${product.title}" (${res.quantity} unit(s)). Stock returned to inventory.`
        });

        // Email Alert
        sendAdminEmail(
          'Reservation Expired Notification',
          `Reservation for "${product.title}" has expired. ${res.quantity} items returned to available stock.`
        );

        // Customer Notification Email
        const user = await User.findById(res.userId);
        if (user) {
          sendCustomerEmail(
            user.email,
            'Your Stock Reservation Expired',
            `Hi ${user.name},\n\nYour reservation for ${res.quantity} unit(s) of "${product.title}" has expired, and the items have been returned to available store stock.`
          );
        }
      }
    }
  } catch (error) {
    logEvent('error', 'SYSTEM_CLEANUP', `Error during reservation cleanup: ${error.message}`);
  }
};

// Throttle passive cleanups to run at most once every 5 minutes on public endpoint hits
let lastCleanupTime = 0;
const triggerPassiveCleanup = async () => {
  const now = Date.now();
  if (now - lastCleanupTime > 5 * 60 * 1000) {
    lastCleanupTime = now;
    cleanupReservations().catch(err => logEvent('error', 'PASSIVE_CLEANUP', err.message));
  }
};

// Helper function to generate JWT token
const generateToken = (id, authSalt) => {
  return jwt.sign({ id, authSalt }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

/* ================= AUTHENTICATION ================= */

// Register API
app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password, cartItems } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // If first user, make them Admin
    const isFirstUser = (await User.countDocuments({})) === 0;

    const user = await User.create({
      name: String(name),
      email: cleanEmail,
      password: hashedPassword,
      isAdmin: isFirstUser
    });

    logEvent('info', 'AUTH', `User registered: ${user.email} (Admin: ${user.isAdmin})`);

    // Merge cart items if registered
    if (cartItems) {
      await mergeCarts(user._id, cartItems);
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id, user.authSalt)
    });
  } catch (error) {
    next(error);
  }
});

// Login API
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password, cartItems } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (user && (await bcrypt.compare(String(password), user.password))) {
      logEvent('info', 'AUTH', `User logged in: ${user.email}`);

      // Merge local storage cart into DB cart upon login
      if (cartItems) {
        await mergeCarts(user._id, cartItems);
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id, user.authSalt)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
});

// Validate Token Check
app.get('/api/auth/me', protect, async (req, res) => {
  res.json(req.user);
});

/* ================= PRODUCT SYSTEM ================= */

// Product Listings API
app.get('/api/products', async (req, res, next) => {
  try {
    await triggerPassiveCleanup();
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Product Details API
app.get('/api/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    next(error);
  }
});

// Admin Product Create
app.post('/api/products', protect, admin, async (req, res, next) => {
  try {
    const { title, sku, price, compareAtPrice, description, image, category, tags, stock, lowStockThreshold, reservationEnabled, reservationHours } = req.body;

    const product = new Product({
      title,
      sku,
      price,
      compareAtPrice,
      description,
      image,
      category,
      tags: tags || [],
      stock: stock || 0,
      lowStockThreshold: lowStockThreshold || 5,
      reservationEnabled: reservationEnabled !== false,
      reservationHours: reservationHours || 0.25
    });

    const createdProduct = await product.save();
    logEvent('info', 'PRODUCT_CRUD', `Product created: ${createdProduct.title} (SKU: ${createdProduct.sku})`);
    res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
});

// Admin Product Update
app.put('/api/products/:id', protect, admin, async (req, res, next) => {
  try {
    const { title, sku, price, compareAtPrice, description, image, category, tags, stock, lowStockThreshold, reservationEnabled, reservationHours } = req.body;

    const product = await Product.findById(req.params.id);
    if (product) {
      const oldStock = product.stock;
      const stockChanged = stock !== undefined && oldStock !== Number(stock);
      
      product.title = title ?? product.title;
      product.sku = sku ?? product.sku;
      product.price = price ?? product.price;
      product.compareAtPrice = compareAtPrice ?? product.compareAtPrice;
      product.description = description ?? product.description;
      product.image = image ?? product.image;
      product.category = category ?? product.category;
      product.tags = tags ?? product.tags;
      product.stock = stock ?? product.stock;
      product.lowStockThreshold = lowStockThreshold ?? product.lowStockThreshold;
      product.reservationEnabled = reservationEnabled ?? product.reservationEnabled;
      product.reservationHours = reservationHours ?? product.reservationHours;

      const updatedProduct = await product.save();

      if (stockChanged) {
        logEvent('info', 'PRODUCT_STOCK', `Admin manually updated stock for "${product.title}" from ${oldStock} to ${product.stock}.`);
        await Notification.create({
          type: 'inventory',
          message: `Product "${product.title}" stock manually updated to ${product.stock} units.`
        });
      }

      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    next(error);
  }
});

// Admin Product Delete
app.delete('/api/products/:id', protect, admin, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      logEvent('info', 'PRODUCT_CRUD', `Product removed: ${product.title}`);
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    next(error);
  }
});

/* ================= INVENTORY RESERVATION SYSTEM ================= */

// Reserve Stock API
app.post('/api/cart/reserve', protect, async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid productId or quantity' });
    }

    // 1. Enforce validation cooldown window checks
    if (req.user.cooldownUntil && req.user.cooldownUntil > new Date()) {
      return res.status(429).json({
        message: `Account is in cooldown due to repeated reservation failures. Please retry after ${req.user.cooldownUntil.toLocaleTimeString()}.`
      });
    }

    // 2. Enforce Max Active Reservations limit per user (max 5 active)
    const activeCount = await Reservation.countDocuments({ userId: req.user._id, status: 'active' });
    if (activeCount >= 5) {
      await handleFailureCooldown(req.user._id);
      return res.status(400).json({ message: 'Maximum active reservations limit (5) reached. Please complete your checkouts first.' });
    }

    // 3. Enforce Max Active Reservations limit per product per user (max 2 active)
    const productActiveCount = await Reservation.countDocuments({ userId: req.user._id, productId, status: 'active' });
    if (productActiveCount >= 2) {
      await handleFailureCooldown(req.user._id);
      return res.status(400).json({ message: 'Maximum active reservations per product (2) reached for this item.' });
    }

    // 4. Fetch product details
    const product = await Product.findById(productId);
    if (!product) {
      await handleFailureCooldown(req.user._id);
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.reservationEnabled) {
      await handleFailureCooldown(req.user._id);
      return res.status(400).json({ message: 'Reservation is disabled for this product' });
    }

    // 5. Multi-User Protection: Atomic Stock Check using Optimistic Locking
    const available = product.stock - product.reservedStock;
    if (available < quantity) {
      await handleFailureCooldown(req.user._id);
      return res.status(400).json({ message: `Insufficient stock. Only ${available} items available.` });
    }

    // Optimistically update the product's reserved stock in a thread-safe way
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        stock: product.stock,
        reservedStock: product.reservedStock
      },
      {
        $inc: { reservedStock: quantity }
      },
      { new: true }
    );

    if (!updatedProduct) {
      await handleFailureCooldown(req.user._id);
      return res.status(409).json({ message: 'Inventory update collision. Please retry your reservation.' });
    }

    // Save calculation fields
    await updatedProduct.save();

    // 6. Retrieve reservation duration configuration (default 15 minutes, i.e. 0.25 hours)
    let hours = product.reservationHours;
    if (!hours) {
      const globalSetting = await Settings.findOne({ key: 'reservationDurationHours' });
      hours = globalSetting ? globalSetting.value : 0.25;
    }
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const maxExpiresAt = new Date(Date.now() + 45 * 60 * 1000); // Hard maximum lifetime of 45 minutes

    // 7. Create reservation record catching compound unique index violations atomically
    try {
      const reservation = await Reservation.create({
        userId: req.user._id,
        productId,
        quantity,
        expiresAt,
        maxExpiresAt,
        extensionCount: 0
      });

      await handleSuccessReset(req.user._id);
      logEvent('info', 'RESERVATION', `Stock reserved by ${req.user.email} for ${product.title} (Quantity: ${quantity})`);
      res.status(201).json(reservation);
    } catch (dbError) {
      // Revert product reservedStock increment on index collision
      await Product.updateOne({ _id: productId }, { $inc: { reservedStock: -quantity } });
      await Product.updateOne({ _id: productId, reservedStock: { $lt: 0 } }, { $set: { reservedStock: 0 } });
      
      const revertedProduct = await Product.findById(productId);
      if (revertedProduct) {
        await revertedProduct.save();
      }

      await handleFailureCooldown(req.user._id);

      if (dbError.code === 11000) {
        return res.status(400).json({ message: 'You already have an active reservation for this product' });
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
});

// Extend Reservations Heartbeat API
app.post('/api/cart/reserve/extend', protect, async (req, res, next) => {
  try {
    const reservations = await Reservation.find({
      userId: req.user._id,
      status: 'active'
    });

    let count = 0;
    const now = Date.now();

    for (const r of reservations) {
      // If we have already hit 2 extensions or max lifetime is passed, skip/release
      if (r.extensionCount >= 2 || now >= r.maxExpiresAt.getTime()) {
        r.status = 'expired';
        r.deleteAt = new Date();
        await r.save();

        const product = await Product.findById(r.productId);
        if (product) {
          await Product.updateOne({ _id: product._id }, { $inc: { reservedStock: -r.quantity } });
          await Product.updateOne({ _id: product._id, reservedStock: { $lt: 0 } }, { $set: { reservedStock: 0 } });
          const updatedProduct = await Product.findById(product._id);
          if (updatedProduct) {
            await updatedProduct.save();
          }
        }
        continue;
      }

      // Extend by 15 minutes, capped at maxExpiresAt
      const extendedTime = now + 15 * 60 * 1000;
      r.expiresAt = new Date(Math.min(extendedTime, r.maxExpiresAt.getTime()));
      r.extensionCount += 1;
      await r.save();
      count++;
    }

    logEvent('info', 'RESERVATION_EXTEND', `Extended ${count} reservations for user ${req.user.email} (releases handled).`);
    res.json({ message: 'Reservations extended successfully', count });
  } catch (error) {
    next(error);
  }
});

// Release Stock API (User manual remove from cart)
app.post('/api/cart/release', protect, async (req, res, next) => {
  try {
    const { productId } = req.body;
    const reservation = await Reservation.findOne({
      userId: req.user._id,
      productId,
      status: 'active'
    });

    if (!reservation) {
      return res.status(404).json({ message: 'No active reservation found for this product' });
    }

    reservation.status = 'expired';
    reservation.deleteAt = new Date();
    await reservation.save();

    const product = await Product.findById(productId);
    if (product) {
      await Product.updateOne(
        { _id: product._id },
        { $inc: { reservedStock: -reservation.quantity } }
      );
      await Product.updateOne(
        { _id: product._id, reservedStock: { $lt: 0 } },
        { $set: { reservedStock: 0 } }
      );
      
      const updatedProduct = await Product.findById(product._id);
      if (updatedProduct) {
        await updatedProduct.save();
      }
    }

    logEvent('info', 'RESERVATION_RELEASE', `Reservation released manually for product ${productId} by ${req.user.email}`);
    res.json({ message: 'Reservation released successfully' });
  } catch (error) {
    next(error);
  }
});

/* ================= CART MANAGEMENT ================= */

// Fetch User Cart
app.get('/api/cart', protect, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart) {
      return res.json({ items: [], cartValue: 0 });
    }
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

// Update/Save User Cart
app.post('/api/cart', protect, async (req, res, next) => {
  try {
    const { items } = req.body; // array of { productId, quantity }
    let cart = await Cart.findOne({ userId: req.user._id });

    // Calculate cart value
    let totalValue = 0;
    for (const item of items) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        totalValue += prod.price * item.quantity;
      }
    }

    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        items,
        cartValue: totalValue,
        lastActivity: new Date()
      });
    } else {
      cart.items = items;
      cart.cartValue = totalValue;
      cart.lastActivity = new Date();
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

/* ================= CHECKOUT & ORDERS ================= */

// Pre-Order initiation (POST /api/orders)
app.post('/api/orders', protect, checkoutLimiter, async (req, res, next) => {
  const runOrderCreation = async (session = null) => {
    const { customerName, customerPhone, shippingAddress, orderNotes, idempotencyKey, cartItems } = req.body;

    if (!customerName || !customerPhone || !shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pinCode) {
      throw new Error('Customer contact name, phone, and complete shipping address are required.');
    }
    if (!idempotencyKey) {
      throw new Error('Idempotency key is required to secure request operations.');
    }
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart items list is empty.');
    }

    // Check cooldown status
    if (req.user.cooldownUntil && req.user.cooldownUntil > new Date()) {
      throw new Error(`Account is in cooldown due to repeated failures. Retry after ${req.user.cooldownUntil.toLocaleTimeString()}.`);
    }

    // 1. Prevent duplicate submissions using Idempotency Key check
    const existingOrderQuery = Order.findOne({ idempotencyKey });
    const existingOrder = session ? await existingOrderQuery.session(session) : await existingOrderQuery;
    if (existingOrder) {
      return { duplicate: true, order: existingOrder };
    }

    const orderItems = [];
    let orderTotal = 0;
    const reservationIds = [];

    // 2. Validate availability and create atomic reservations (15 mins window)
    for (const item of cartItems) {
      const productQuery = Product.findById(item.productId);
      const product = session ? await productQuery.session(session) : await productQuery;

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      // Check stock availability
      const available = product.stock - product.reservedStock;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock for "${product.title}". Only ${available} available.`);
      }

      // Reserve stock atomically via update
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: product.stock,
          reservedStock: product.reservedStock
        },
        {
          $inc: { reservedStock: item.quantity }
        },
        { new: true, session }
      );

      if (!updatedProduct) {
        throw new Error(`Inventory locking collision for "${product.title}". Please try checking out again.`);
      }

      await updatedProduct.save({ session });

      // Create Reservation record (15 mins duration default, 45 mins cap)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 
      const maxExpiresAt = new Date(Date.now() + 45 * 60 * 1000);
      const resData = {
        userId: req.user._id,
        productId: product._id,
        quantity: item.quantity,
        expiresAt,
        maxExpiresAt,
        extensionCount: 0
      };
      
      const createdRes = session ? await Reservation.create([resData], { session }) : await Reservation.create(resData);
      const reservation = Array.isArray(createdRes) ? createdRes[0] : createdRes;
      reservationIds.push(reservation._id);

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        pricePaid: product.price
      });

      orderTotal += product.price * item.quantity;
    }

    // 3. Create Order Record in pending / unpaid state
    const gatewayOrderId = `order_mock_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const orderData = {
      userId: req.user._id,
      items: orderItems,
      total: orderTotal,
      status: 'pending',
      customerName: String(customerName),
      customerPhone: String(customerPhone),
      shippingAddress,
      orderNotes: orderNotes ? String(orderNotes) : '',
      paymentStatus: 'unpaid',
      paymentGateway: 'mock_gateway',
      gatewayOrderId,
      idempotencyKey: String(idempotencyKey)
    };

    const createdOrder = session ? await Order.create([orderData], { session }) : await Order.create(orderData);
    const order = Array.isArray(createdOrder) ? createdOrder[0] : createdOrder;

    // Clear backend cart
    const cartUpdateData = { items: [], cartValue: 0, lastActivity: new Date() };
    await Cart.findOneAndUpdate({ userId: req.user._id }, cartUpdateData, { session });

    return { duplicate: false, order, orderTotal };
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await runOrderCreation(session);
    await session.commitTransaction();
    session.endSession();

    if (result.duplicate) {
      logEvent('warn', 'CHECKOUT_DUPLICATE', `Order with idempotency key ${req.body.idempotencyKey} already exists. Returning duplicate.`);
      return res.status(200).json(result.order);
    }

    await handleSuccessReset(req.user._id);
    logEvent('info', 'ORDER_CREATED', `Pending order #${result.order._id} created for ${req.user.email} (Total: ${result.orderTotal})`);
    res.status(201).json(result.order);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    await handleFailureCooldown(req.user._id);

    // Catch database-level unique constraint collision for idempotencyKey
    if (error.code === 11000 && error.message.includes('idempotencyKey')) {
      logEvent('warn', 'CHECKOUT_IDEMPOTENCY_COLLISION', `Idempotency index collision for key ${req.body.idempotencyKey}`);
      try {
        const order = await Order.findOne({ idempotencyKey: req.body.idempotencyKey });
        return res.status(200).json(order);
      } catch (findErr) {
        return res.status(400).json({ message: 'Order initialization conflict, please retry.' });
      }
    }

    // Standalone replica set connection error handler
    if (error.message.includes('Transaction numbers are only allowed') || error.message.includes('replica set')) {
      logEvent('warn', 'TRANSACTION_FALLBACK', 'Mongoose transactions not supported in environment. Running sequential fallback.');
      try {
        const result = await runOrderCreation(null);
        if (result.duplicate) {
          return res.status(200).json(result.order);
        }
        await handleSuccessReset(req.user._id);
        return res.status(201).json(result.order);
      } catch (fallbackError) {
        await handleFailureCooldown(req.user._id);
        if (fallbackError.code === 11000 && fallbackError.message.includes('idempotencyKey')) {
          const order = await Order.findOne({ idempotencyKey: req.body.idempotencyKey });
          return res.status(200).json(order);
        }
        logEvent('error', 'CHECKOUT_FAIL', `Fallback checkout failed: ${fallbackError.message}`);
        return res.status(400).json({ message: fallbackError.message });
      }
    }

    logEvent('error', 'CHECKOUT_FAIL', `Checkout failed: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
});

// Fetch Order History for User
app.get('/api/orders', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

/* ================= WEBHOOKS & PAYMENTS GATEWAY ================= */

// Webhook callback (POST /api/payments/webhook)
app.post('/api/payments/webhook', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    // Standard mock verification of body elements
    const { event, data } = req.body;
    if (!event || !data || !data.gatewayOrderId) {
      return res.status(400).json({ message: 'Invalid webhook payload structure' });
    }

    session.startTransaction();

    const order = await Order.findOne({ gatewayOrderId: data.gatewayOrderId }).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Order not found for specified gatewayOrderId' });
    }

    // Idempotent webhook trigger check
    if (order.status !== 'pending') {
      await session.commitTransaction();
      session.endSession();
      logEvent('info', 'WEBHOOK_IDEMPOTENT', `Webhook already processed for order ${order._id}`);
      return res.status(200).json({ message: 'Webhook already processed' });
    }

    if (event === 'payment.success') {
      order.status = 'confirmed';
      order.paymentStatus = 'paid';
      order.gatewayPaymentId = data.gatewayPaymentId || 'pay_mock_success';
      await order.save({ session });

      // Deduct stock permanently and complete reservations
      for (const item of order.items) {
        // Concurrent safe atomic decrement
        await Product.updateOne(
          { _id: item.productId },
          {
            $inc: {
              stock: -item.quantity,
              reservedStock: -item.quantity,
              soldCount: item.quantity
            }
          },
          { session }
        );

        // Fetch document and run pre-save hooks to enforce bounds and recalculate availableStock
        const product = await Product.findById(item.productId).session(session);
        if (product) {
          if (product.stock < 0) product.stock = 0;
          if (product.reservedStock < 0) product.reservedStock = 0;
          await product.save({ session });

          // Mark active reservations as completed
          await Reservation.updateMany(
            { userId: order.userId, productId: product._id, status: 'active' },
            { $set: { status: 'completed', deleteAt: new Date() } }
          ).session(session);

          // Inventory Alert Triggers
          const available = product.stock - product.reservedStock;
          if (available === 0) {
            await Notification.create([{
              type: 'inventory',
              message: `Product "${product.title}" is now OUT OF STOCK!`
            }], { session });
            sendAdminEmail('Out Of Stock Alert', `Product "${product.title}" (ID: ${product._id}) has run out of stock.`);
          } else if (available <= product.lowStockThreshold) {
            await Notification.create([{
              type: 'inventory',
              message: `Product "${product.title}" has low stock: ${available} left.`
            }], { session });
            sendAdminEmail('Low Stock Alert', `Product "${product.title}" has reached low stock threshold. Only ${available} available.`);
          }
        }
      }

      // Order Notification Logs
      await Notification.create([{
        type: 'order',
        message: `New order #${order._id} confirmed for Rs. ${order.total.toFixed(2)}.`
      }], { session });

      // High Value Alert Check
      if (order.total >= 5000) {
        await Notification.create([{
          type: 'order',
          message: `ALERT: High Value Order #${order._id} placed! Total: Rs. ${order.total.toFixed(2)}.`
        }], { session });
        sendAdminEmail('High Value Order Alert', `Order #${order._id} total is Rs. ${order.total.toFixed(2)}. Review immediately.`);
      }

      await session.commitTransaction();
      session.endSession();

      // Trigger Dispatch emails (async)
      const user = await User.findById(order.userId);
      if (user) {
        sendCustomerEmail(user.email, 'Order Confirmation', `Thank you for your order, ${user.name}! Your order #${order._id} total is Rs. ${order.total}. Shipping details:\n${order.shippingAddress.address}, ${order.shippingAddress.city}.`);
        sendAdminEmail('New Order Placed', `Order #${order._id} was successfully placed by ${user.name}. Total: Rs. ${order.total}`);
      }

      logEvent('info', 'PAYMENT_SUCCESS', `Payment succeeded for order ${order._id}. Stock decremented.`);
      res.json({ success: true, message: 'Payment webhook applied successfully.' });

    } else if (event === 'payment.failed') {
      order.status = 'cancelled';
      order.paymentStatus = 'failed';
      await order.save({ session });

      // Release reserved stock locks
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { reservedStock: -item.quantity } },
          { session }
        );

        const product = await Product.findById(item.productId).session(session);
        if (product) {
          if (product.reservedStock < 0) product.reservedStock = 0;
          await product.save({ session });

          // Cancel active reservations
          await Reservation.updateMany(
            { userId: order.userId, productId: product._id, status: 'active' },
            { $set: { status: 'expired', deleteAt: new Date() } }
          ).session(session);
        }
      }

      await session.commitTransaction();
      session.endSession();

      const user = await User.findById(order.userId);
      if (user) {
        sendCustomerEmail(user.email, 'Checkout Failed', `Hi ${user.name},\n\nWe encountered a failure processing payment details for your order #${order._id}. The reserved items have been returned to available stock.`);
      }

      logEvent('warn', 'PAYMENT_FAILED', `Payment failed for order ${order._id}. Reservational locks released.`);
      res.json({ success: true, message: 'Failed payment processed.' });
    }

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Check transaction error support and fall back
    if (error.message.includes('Transaction numbers are only allowed') || error.message.includes('replica set')) {
      logEvent('warn', 'WEBHOOK_FALLBACK', 'Mongoose transactions not supported in webhook context. Running sequential operations.');
      try {
        const { event, data } = req.body;
        const order = await Order.findOne({ gatewayOrderId: data.gatewayOrderId });
        if (!order || order.status !== 'pending') {
          return res.status(200).json({ message: 'Processed or not found' });
        }

        if (event === 'payment.success') {
          order.status = 'confirmed';
          order.paymentStatus = 'paid';
          order.gatewayPaymentId = data.gatewayPaymentId || 'pay_mock_success';
          await order.save();

          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.productId },
              {
                $inc: {
                  stock: -item.quantity,
                  reservedStock: -item.quantity,
                  soldCount: item.quantity
                }
              }
            );

            const product = await Product.findById(item.productId);
            if (product) {
              if (product.stock < 0) product.stock = 0;
              if (product.reservedStock < 0) product.reservedStock = 0;
              await product.save();

              await Reservation.updateMany(
                { userId: order.userId, productId: product._id, status: 'active' },
                { $set: { status: 'completed', deleteAt: new Date() } }
              );
            }
          }
          logEvent('info', 'PAYMENT_SUCCESS', `Payment webhook fallback processed for ${order._id}`);
          return res.status(200).json({ success: true });
        } else {
          order.status = 'cancelled';
          order.paymentStatus = 'failed';
          await order.save();

          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { reservedStock: -item.quantity } }
            );

            const product = await Product.findById(item.productId);
            if (product) {
              if (product.reservedStock < 0) product.reservedStock = 0;
              await product.save();

              await Reservation.updateMany(
                { userId: order.userId, productId: product._id, status: 'active' },
                { $set: { status: 'expired', deleteAt: new Date() } }
              );
            }
          }
          return res.status(200).json({ success: true });
        }
      } catch (fallbackError) {
        logEvent('error', 'WEBHOOK_FAIL', `Fallback webhook processing failed: ${fallbackError.message}`);
        return res.status(500).json({ message: fallbackError.message });
      }
    }

    logEvent('error', 'WEBHOOK_FAIL', `Webhook processing error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

/* ================= ADMIN & ANALYTICS ================= */

// Inventory Dashboard Metrics API
app.get('/api/admin/inventory', protect, admin, async (req, res, next) => {
  try {
    const products = await Product.find({});
    let totalStock = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let totalSold = 0;
    const lowStockItems = [];
    const outOfStockItems = [];

    products.forEach((p) => {
      totalStock += p.stock;
      totalReserved += p.reservedStock;
      totalAvailable += p.availableStock;
      totalSold += p.soldCount;

      if (p.availableStock === 0) {
        outOfStockItems.push(p);
      } else if (p.availableStock <= p.lowStockThreshold) {
        lowStockItems.push(p);
      }
    });

    const activeReservations = await Reservation.find({ status: 'active' }).populate('productId userId');

    res.json({
      totalStock,
      totalReserved,
      totalAvailable,
      totalSold,
      lowStockItems,
      outOfStockItems,
      reservationQueue: activeReservations
    });
  } catch (error) {
    next(error);
  }
});

// Update Order Status API
app.put('/api/admin/orders/:id/status', protect, admin, async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('userId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    // If order was cancelled or refunded, restore physical stock
    if ((status === 'cancelled' || status === 'refunded') && oldStatus !== 'cancelled' && oldStatus !== 'refunded') {
      for (const item of order.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          prod.stock += item.quantity;
          prod.soldCount = Math.max(0, prod.soldCount - item.quantity);
          await prod.save();
        }
      }
      
      logEvent('info', 'ORDER_STATUS', `Order #${order._id} updated status to ${status.toUpperCase()}. Restored stock.`);
      
      await Notification.create({
        type: 'inventory',
        message: `Order #${order._id} ${status.toUpperCase()}. Quantities returned to stock.`
      });
    }

    // Customer email alert
    if (order.userId) {
      sendCustomerEmail(
        order.userId.email,
        `Order Status Updated: ${status.toUpperCase()}`,
        `Hello ${order.userId.name},\n\nThe status of your order #${order._id} has been updated to: ${status.toUpperCase()}.`
      );
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Fetch All Orders
app.get('/api/admin/orders', protect, admin, async (req, res, next) => {
  try {
    const orders = await Order.find({}).populate('userId items.productId').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Admin Settings
app.get('/api/admin/settings', protect, admin, async (req, res, next) => {
  try {
    const duration = await Settings.findOne({ key: 'reservationDurationHours' });
    res.json(duration);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/settings', protect, admin, async (req, res, next) => {
  try {
    const { value } = req.body;
    if (!value || isNaN(value)) {
      return res.status(400).json({ message: 'Invalid settings value' });
    }

    const duration = await Settings.findOneAndUpdate(
      { key: 'reservationDurationHours' },
      { value: Number(value) },
      { new: true, upsert: true }
    );
    logEvent('info', 'SETTINGS_UPDATE', `Admin updated global reservation hours to ${value} hours.`);
    res.json(duration);
  } catch (error) {
    next(error);
  }
});

// Fetch Notifications List
app.get('/api/admin/notifications', protect, admin, async (req, res, next) => {
  try {
    const list = await Notification.find({}).sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (error) {
    next(next);
  }
});

// Mark Notification as Read
app.post('/api/admin/notifications/:id/read', protect, admin, async (req, res, next) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (notif) {
      notif.read = true;
      await notif.save();
      res.json(notif);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    next(error);
  }
});

// Fetch System Analytics Statistics API
app.get('/api/admin/analytics', protect, admin, async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments({});
    
    // Revenue calculations (confirmed, processing, shipped, delivered count towards revenue)
    const activeOrders = await Order.find({
      status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
    });
    const revenue = activeOrders.reduce((sum, order) => sum + order.total, 0);

    // Conversion rate: Orders count / total Carts count
    const totalCarts = await Cart.countDocuments({});
    const conversionRate = totalCarts > 0 ? (totalOrders / totalCarts) * 100 : 0;

    // Abandoned Carts count (lastActivity > 24 hours ago, and items.length > 0)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const abandonedCartsCount = await Cart.countDocuments({
      lastActivity: { $lt: oneDayAgo },
      'items.0': { $exists: true }
    });

    // Abandoned Carts list for dashboard tracking
    const abandonedCarts = await Cart.find({
      lastActivity: { $lt: oneDayAgo },
      'items.0': { $exists: true }
    }).populate('userId items.productId');

    // Top Products
    const topProducts = await Product.find({}).sort({ soldCount: -1 }).limit(5);

    // Reservation success rate
    const totalRes = await Reservation.countDocuments({});
    const successRes = await Reservation.countDocuments({ status: 'completed' });
    const reservationSuccessRate = totalRes > 0 ? (successRes / totalRes) * 100 : 0;

    res.json({
      totalOrders,
      revenue,
      conversionRate,
      abandonedCartsCount,
      abandonedCarts,
      topProducts,
      reservationSuccessRate
    });
  } catch (error) {
    next(error);
  }
});

// Manual Stock Editor API
app.post('/api/admin/products/:id/stock', protect, admin, async (req, res, next) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || isNaN(stock)) {
      return res.status(400).json({ message: 'Invalid stock count value' });
    }

    const product = await Product.findById(req.params.id);
    if (product) {
      const oldStock = product.stock;
      product.stock = Number(stock);
      await product.save();

      logEvent('info', 'PRODUCT_STOCK_EDIT', `Admin manually updated stock for ${product.title} from ${oldStock} to ${product.stock}.`);

      await Notification.create({
        type: 'inventory',
        message: `Admin manually edited stock of "${product.title}" from ${oldStock} to ${product.stock}.`
      });

      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    next(error);
  }
});

// Cron cleanup trigger (GET /api/cron/cleanup)
app.get('/api/cron/cleanup', async (req, res, next) => {
  try {
    await cleanupReservations();
    res.json({ success: true, message: 'Reservation cleanup sweep executed successfully.' });
  } catch (error) {
    next(error);
  }
});

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
