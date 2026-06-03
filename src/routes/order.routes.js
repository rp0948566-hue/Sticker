import express from 'express';
import { createOrder, getOrders, triggerCronCleanup } from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkoutLimiter } from '../middleware/rate-limit.middleware.js';

const router = express.Router();

router.post('/', protect, checkoutLimiter, createOrder);
router.get('/', protect, getOrders);
router.get('/cron/cleanup', triggerCronCleanup);

export default router;
