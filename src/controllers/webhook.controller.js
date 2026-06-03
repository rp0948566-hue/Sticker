import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Reservation from '../models/reservation.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';
import { logEvent } from '../utils/logger.js';
import { sendAdminEmail, sendCustomerEmail } from '../utils/email.js';

export const handlePaymentWebhook = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
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

        // Atomic bounds check using a single query to ensure stock/reservedStock cannot fall below zero, eliminating read-modify-write races
        await Product.updateOne(
          { _id: item.productId },
          [
            {
              $set: {
                stock: { $cond: { if: { $lt: ["$stock", 0] }, then: 0, else: "$stock" } },
                reservedStock: { $cond: { if: { $lt: ["$reservedStock", 0] }, then: 0, else: "$reservedStock" } }
              }
            }
          ],
          { session }
        );

        // Fetch document in read-only mode to trigger low-stock alerts without calling product.save()
        const product = await Product.findById(item.productId).session(session);

        if (product) {
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
};
