import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import Reservation from '../models/reservation.model.js';
import Settings from '../models/settings.model.js';
import User from '../models/user.model.js';
import { logEvent } from '../utils/logger.js';

// Cooldown handler helpers
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

// Fetch User Cart
export const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart) {
      return res.json({ items: [], cartValue: 0 });
    }
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

// Update/Save User Cart
export const updateCart = async (req, res, next) => {
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
};

// Reserve Stock API
export const reserveStock = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || quantity === undefined || quantity < 1 || !Number.isInteger(Number(quantity))) {
      return res.status(400).json({ message: 'Invalid productId or quantity (must be a positive integer)' });
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
};

// Extend Reservations Heartbeat API
export const extendReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({
      userId: req.user._id,
      status: 'active'
    });

    let count = 0;
    const now = Date.now();
    const limitWindow = 3 * 60 * 1000; // 3 minutes expiring warning window

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

      // Enforce check: only allow extension if the reservation has less than 3 minutes remaining
      const timeRemaining = r.expiresAt.getTime() - now;
      if (timeRemaining > limitWindow) {
        continue; // Prevents premature heartbeat spamming
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
};

// Release Stock API (User manual remove from cart)
export const releaseStock = async (req, res, next) => {
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
};
