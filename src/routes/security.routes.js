/**
 * Security Dashboard Routes
 *
 * All routes are admin-only.
 * Protected by: protect → admin → adminShield (no elevated threats allowed)
 */

import express from 'express';
import {
  getSecurityStats,
  getSecurityEvents,
  getBlocklist,
  manualUnblockIp,
  clearUserProfile,
  repairInventory,
  triggerRecovery,
} from '../controllers/security.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';
import { adminShield } from '../middleware/admin-shield.middleware.js';

const router = express.Router();

// All security routes require admin authentication + admin shield
router.use(protect, admin, adminShield);

router.get('/stats',                       getSecurityStats);
router.get('/events',                      getSecurityEvents);
router.get('/blocklist',                   getBlocklist);
router.post('/unblock',                    manualUnblockIp);
router.post('/user/:id/clear',             clearUserProfile);
router.post('/inventory/repair/:productId', repairInventory);
router.post('/recovery/run',               triggerRecovery);

export default router;
