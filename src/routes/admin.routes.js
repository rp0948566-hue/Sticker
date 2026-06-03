import express from 'express';
import { 
  adminGetOrders, 
  adminUpdateOrderStatus, 
  adminGetInventory, 
  adminGetAnalytics, 
  adminGetSettings, 
  adminSaveSettings, 
  adminGetNotifications, 
  adminReadNotification 
} from '../controllers/order.controller.js';
import { updateProductStock } from '../controllers/product.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';
import { adminShield } from '../middleware/admin-shield.middleware.js';

const router = express.Router();

router.get('/orders',               protect, admin, adminShield, adminGetOrders);
router.put('/orders/:id/status',    protect, admin, adminShield, adminUpdateOrderStatus);
router.get('/inventory',            protect, admin, adminShield, adminGetInventory);
router.get('/analytics',            protect, admin, adminShield, adminGetAnalytics);
router.get('/settings',             protect, admin, adminShield, adminGetSettings);
router.post('/settings',            protect, admin, adminShield, adminSaveSettings);
router.get('/notifications',        protect, admin, adminShield, adminGetNotifications);
router.post('/notifications/:id/read', protect, admin, adminShield, adminReadNotification);
router.post('/products/:id/stock',  protect, admin, adminShield, updateProductStock);

export default router;

