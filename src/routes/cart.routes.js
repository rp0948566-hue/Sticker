import express from 'express';
import { getCart, updateCart, reserveStock, extendReservations, releaseStock } from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { extendLimiter } from '../middleware/rate-limit.middleware.js';
import { inventoryReserveProtection, cartAbuseProtection } from '../middleware/inventory-protection.middleware.js';

const router = express.Router();

router.get('/',                  protect, getCart);
router.post('/',                 protect, cartAbuseProtection, updateCart);
router.post('/reserve',          protect, inventoryReserveProtection, reserveStock);
router.post('/reserve/extend',   protect, extendLimiter, extendReservations);
router.post('/release',          protect, releaseStock);

export default router;

