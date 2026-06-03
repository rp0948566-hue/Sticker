import express from 'express';
import { register, login, getMe, logout, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { getProductsLegacy, getProductById } from '../controllers/product.controller.js';
import { getCart, updateCart, reserveStock, extendReservations, releaseStock } from '../controllers/cart.controller.js';
import { 
  createOrder, 
  getOrdersLegacy, 
  adminGetOrdersLegacy, 
  adminUpdateOrderStatus, 
  adminGetInventory, 
  adminGetAnalytics, 
  adminGetSettings, 
  adminSaveSettings, 
  adminGetNotificationsLegacy, 
  adminReadNotification,
  triggerCronCleanup 
} from '../controllers/order.controller.js';
import { handlePaymentWebhook } from '../controllers/webhook.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';
import { authLimiter, checkoutLimiter, extendLimiter } from '../middleware/rate-limit.middleware.js';
import { verifyWebhookSignature } from '../middleware/webhook.middleware.js';

const router = express.Router();

// Auth Compatibility
router.post('/auth/register', authLimiter, register);
router.post('/auth/login', authLimiter, login);
router.get('/auth/me', protect, getMe);
router.post('/auth/logout', protect, logout);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// Products Compatibility
router.get('/products', getProductsLegacy);
router.get('/products/:id', getProductById);

// Cart Compatibility
router.get('/cart', protect, getCart);
router.post('/cart', protect, updateCart);
router.post('/cart/reserve', protect, reserveStock);
router.post('/cart/reserve/extend', protect, extendLimiter, extendReservations);
router.post('/cart/release', protect, releaseStock);

// Order Compatibility
router.post('/orders', protect, checkoutLimiter, createOrder);
router.get('/orders', protect, getOrdersLegacy);

// Webhook Compatibility
router.post('/payments/webhook', verifyWebhookSignature, handlePaymentWebhook);

// Admin Compatibility
router.get('/admin/orders', protect, admin, adminGetOrdersLegacy);
router.put('/admin/orders/:id/status', protect, admin, adminUpdateOrderStatus);
router.get('/admin/inventory', protect, admin, adminGetInventory);
router.get('/admin/analytics', protect, admin, adminGetAnalytics);
router.get('/admin/settings', protect, admin, adminGetSettings);
router.post('/admin/settings', protect, admin, adminSaveSettings);
router.get('/admin/notifications', protect, admin, adminGetNotificationsLegacy);
router.post('/admin/notifications/:id/read', protect, admin, adminReadNotification);

// System Crons
router.get('/cron/cleanup', triggerCronCleanup);

export default router;
