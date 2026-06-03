import Reservation from '../models/reservation.model.js';
import Product from '../models/product.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import Settings from '../models/settings.model.js';
import { sendAdminEmail, sendCustomerEmail } from '../utils/email.js';
import { logEvent } from '../utils/logger.js';

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
export const triggerPassiveCleanup = async () => {
  const now = Date.now();
  if (now - lastCleanupTime > 5 * 60 * 1000) {
    lastCleanupTime = now;
    cleanupReservations().catch(err => logEvent('error', 'PASSIVE_CLEANUP', err.message));
  }
};
