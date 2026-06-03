import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Reservation from '../models/reservation.model.js';
import Cart from '../models/cart.model.js';
import Notification from '../models/notification.model.js';
import Settings from '../models/settings.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';
import { logEvent } from '../utils/logger.js';
import { sendAdminEmail, sendCustomerEmail } from '../utils/email.js';
import { cleanupReservations } from '../services/reservation.service.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

// Cooldown handlers
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

// Create Order (Checkout Initiation)
export const createOrder = async (req, res, next) => {
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

    if (req.user.cooldownUntil && req.user.cooldownUntil > new Date()) {
      throw new Error(`Account is in cooldown due to repeated failures. Retry after ${req.user.cooldownUntil.toLocaleTimeString()}.`);
    }

    const existingOrderQuery = Order.findOne({ idempotencyKey });
    const existingOrder = session ? await existingOrderQuery.session(session) : await existingOrderQuery;
    if (existingOrder) {
      return { duplicate: true, order: existingOrder };
    }

    const orderItems = [];
    let orderTotal = 0;
    const reservationIds = [];

    for (const item of cartItems) {
      const productQuery = Product.findById(item.productId);
      const product = session ? await productQuery.session(session) : await productQuery;

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const activeResQuery = Reservation.findOne({
        userId: req.user._id,
        productId: product._id,
        status: 'active'
      });
      const activeRes = session ? await activeResQuery.session(session) : await activeResQuery;

      let quantityToLock = item.quantity;
      if (activeRes) {
        quantityToLock = Math.max(0, item.quantity - activeRes.quantity);

        activeRes.status = 'completed';
        activeRes.deleteAt = new Date();
        if (session) {
          await activeRes.save({ session });
        } else {
          await activeRes.save();
        }
      }

      if (quantityToLock > 0) {
        const available = product.stock - product.reservedStock;
        if (available < quantityToLock) {
          throw new Error(`Insufficient stock for "${product.title}". Only ${available} available.`);
        }

        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: product._id,
            stock: product.stock,
            reservedStock: product.reservedStock
          },
          {
            $inc: { reservedStock: quantityToLock }
          },
          { new: true, session }
        );

        if (!updatedProduct) {
          throw new Error(`Inventory locking collision for "${product.title}". Please try checking out again.`);
        }

        if (session) {
          await updatedProduct.save({ session });
        } else {
          await updatedProduct.save();
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 
        const maxExpiresAt = new Date(Date.now() + 45 * 60 * 1000);
        const resData = {
          userId: req.user._id,
          productId: product._id,
          quantity: quantityToLock,
          expiresAt,
          maxExpiresAt,
          extensionCount: 0
        };
        
        const createdRes = session ? await Reservation.create([resData], { session }) : await Reservation.create(resData);
        const reservation = Array.isArray(createdRes) ? createdRes[0] : createdRes;
        reservationIds.push(reservation._id);
      }

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        pricePaid: product.price
      });

      orderTotal += product.price * item.quantity;
    }

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

    if (error.code === 11000 && error.message.includes('idempotencyKey')) {
      logEvent('warn', 'CHECKOUT_IDEMPOTENCY_COLLISION', `Idempotency index collision for key ${req.body.idempotencyKey}`);
      try {
        const order = await Order.findOne({ idempotencyKey: req.body.idempotencyKey });
        return res.status(200).json(order);
      } catch (findErr) {
        return res.status(400).json({ message: 'Order initialization conflict, please retry.' });
      }
    }

    if (error.message.includes('Transaction numbers are only allowed') || error.message.includes('replica set')) {
      if (process.env.NODE_ENV === 'production') {
        logEvent('error', 'CHECKOUT_FAIL', 'Strict database transactions are required in production, but replica set support is missing.');
        return res.status(500).json({ message: 'E-commerce transactions are misconfigured in production.' });
      }

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
};

// V1 User Order History (Cursor-based Pagination)
export const getOrders = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { cursor } = req.query;

    const query = { userId: req.user._id };

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded && decoded.id) {
        query._id = { $lt: decoded.id };
      }
    }

    const orders = await Order.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasMore = orders.length > limit;
    if (hasMore) {
      orders.pop();
    }

    const nextCursor = orders.length > 0
      ? encodeCursor({ id: orders[orders.length - 1]._id })
      : null;

    res.json({
      orders,
      nextCursor,
      hasMore
    });
  } catch (error) {
    next(error);
  }
};

// Legacy User Order History (Unpaginated)
export const getOrdersLegacy = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// V1 Fetch All Orders for Admin (Cursor-based Pagination)
export const adminGetOrders = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { cursor } = req.query;

    const query = {};

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded && decoded.id) {
        query._id = { $lt: decoded.id };
      }
    }

    const orders = await Order.find(query)
      .populate('userId items.productId')
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasMore = orders.length > limit;
    if (hasMore) {
      orders.pop();
    }

    const nextCursor = orders.length > 0
      ? encodeCursor({ id: orders[orders.length - 1]._id })
      : null;

    res.json({
      orders,
      nextCursor,
      hasMore
    });
  } catch (error) {
    next(error);
  }
};

// Legacy Fetch All Orders for Admin (Unpaginated)
export const adminGetOrdersLegacy = async (req, res, next) => {
  try {
    const orders = await Order.find({}).populate('userId items.productId').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// Update Order Status
export const adminUpdateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('userId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

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
};

// Fetch Inventory Dashboard Metrics
export const adminGetInventory = async (req, res, next) => {
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
};

// Settings
export const adminGetSettings = async (req, res, next) => {
  try {
    const duration = await Settings.findOne({ key: 'reservationDurationHours' });
    res.json(duration);
  } catch (error) {
    next(error);
  }
};

export const adminSaveSettings = async (req, res, next) => {
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
};

// V1 Admin Notifications (Cursor-based Pagination)
export const adminGetNotifications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const { cursor } = req.query;

    const query = {};

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded && decoded.id) {
        query._id = { $lt: decoded.id };
      }
    }

    const list = await Notification.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasMore = list.length > limit;
    if (hasMore) {
      list.pop();
    }

    const nextCursor = list.length > 0
      ? encodeCursor({ id: list[list.length - 1]._id })
      : null;

    res.json({
      notifications: list,
      nextCursor,
      hasMore
    });
  } catch (error) {
    next(error);
  }
};

// Legacy Admin Notifications (Limit 50)
export const adminGetNotificationsLegacy = async (req, res, next) => {
  try {
    const list = await Notification.find({}).sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (error) {
    next(error);
  }
};

// Mark Notification as Read
export const adminReadNotification = async (req, res, next) => {
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
};

// Fetch System Analytics Statistics
export const adminGetAnalytics = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments({});
    
    const activeOrders = await Order.find({
      status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
    });
    const revenue = activeOrders.reduce((sum, order) => sum + order.total, 0);

    const totalCarts = await Cart.countDocuments({});
    const conversionRate = totalCarts > 0 ? (totalOrders / totalCarts) * 100 : 0;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const abandonedCartsCount = await Cart.countDocuments({
      lastActivity: { $lt: oneDayAgo },
      'items.0': { $exists: true }
    });

    const abandonedCarts = await Cart.find({
      lastActivity: { $lt: oneDayAgo },
      'items.0': { $exists: true }
    }).populate('userId items.productId');

    const topProducts = await Product.find({}).sort({ soldCount: -1 }).limit(5);

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
};

// Cron cleanup
export const triggerCronCleanup = async (req, res, next) => {
  try {
    await cleanupReservations();
    res.json({ success: true, message: 'Reservation cleanup sweep executed successfully.' });
  } catch (error) {
    next(error);
  }
};
