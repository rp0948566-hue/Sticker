/**
 * Security Recovery Service
 *
 * Auto-recovery engine that:
 *  - Automatically expires stale IP blocks after their TTL
 *  - Releases DB-locked user accounts after cooldown expires
 *  - Self-heals inventory reservation states after system disruptions
 *  - Provides manual recovery actions for admin use
 *
 * Runs as a serverless-safe polling service (triggered on startup and
 * periodically via a lightweight heartbeat in api/index.js).
 */

import User from '../models/user.model.js';
import Reservation from '../models/reservation.model.js';
import Product from '../models/product.model.js';
import { logEvent } from '../utils/logger.js';
import { clearUserThreat } from '../services/security-shield.service.js';

// ─── Recovery: Release expired user account lockouts ─────────────────────────

/**
 * Scans for users whose cooldownUntil has passed and clears their lock.
 * Safe to call on every serverless invocation — uses an atomic findAndUpdate
 * to avoid race conditions.
 */
export const releaseExpiredAccountLockouts = async () => {
  try {
    const result = await User.updateMany(
      {
        cooldownUntil: { $lte: new Date() },
        failedAttempts: { $gt: 0 }
      },
      {
        $set: { failedAttempts: 0, cooldownUntil: null }
      }
    );

    if (result.modifiedCount > 0) {
      logEvent('info', 'SECURITY_RECOVERY',
        `Auto-released ${result.modifiedCount} expired account lockout(s).`
      );
    }
  } catch (err) {
    logEvent('error', 'SECURITY_RECOVERY', `Failed to release account lockouts: ${err.message}`);
  }
};

// ─── Recovery: Fix inventory desync from reservation expiry ──────────────────

/**
 * Scans for expired reservations that have not yet decremented reservedStock.
 * This handles edge cases where the reservation TTL sweep missed a record
 * (e.g., serverless cold start, crash during cleanup).
 *
 * Strategy:
 *  1. Find reservations with status='active' and expiresAt in the past
 *  2. Atomically expire them
 *  3. Recalculate and repair reservedStock for affected products
 */
export const repairExpiredReservations = async () => {
  try {
    const now     = new Date();
    const expired = await Reservation.find({
      status: 'active',
      expiresAt: { $lte: now },
    }).lean();

    if (expired.length === 0) return;

    logEvent('info', 'SECURITY_RECOVERY',
      `Found ${expired.length} dangling expired reservation(s). Repairing...`
    );

    for (const res of expired) {
      // Mark as expired atomically
      const updated = await Reservation.findOneAndUpdate(
        { _id: res._id, status: 'active' }, // check status still active
        { $set: { status: 'expired', deleteAt: now } },
        { new: true }
      );

      if (!updated) continue; // Another process already handled it

      // Decrement reservedStock and floor at 0
      await Product.findOneAndUpdate(
        { _id: res.productId },
        { $inc: { reservedStock: -res.quantity } }
      );
      await Product.updateOne(
        { _id: res.productId, reservedStock: { $lt: 0 } },
        { $set: { reservedStock: 0 } }
      );

      logEvent('info', 'SECURITY_RECOVERY',
        `Repaired reservation ${res._id} for product ${res.productId} (qty: ${res.quantity})`
      );
    }
  } catch (err) {
    logEvent('error', 'SECURITY_RECOVERY', `Failed to repair expired reservations: ${err.message}`);
  }
};

// ─── Recovery: Full inventory recalculation for a product ────────────────────

/**
 * Recalculates and corrects the reservedStock field for a specific product
 * by summing all active reservations. Use as a manual admin repair tool.
 *
 * @param {string} productId - MongoDB ObjectId string
 */
export const recalculateProductReservedStock = async (productId) => {
  try {
    const activeReservations = await Reservation.find({
      productId,
      status: 'active',
    }).lean();

    const correctReservedStock = activeReservations.reduce(
      (sum, r) => sum + (r.quantity || 0),
      0
    );

    await Product.updateOne(
      { _id: productId },
      { $set: { reservedStock: correctReservedStock } }
    );

    logEvent('info', 'SECURITY_RECOVERY',
      `Recalculated reservedStock for product ${productId}: ${correctReservedStock} units`
    );

    return { productId, correctedReservedStock: correctReservedStock };
  } catch (err) {
    logEvent('error', 'SECURITY_RECOVERY', `Failed to recalculate product reserved stock: ${err.message}`);
    throw err;
  }
};

// ─── Recovery: Clear user threat profile (admin reset) ───────────────────────

/**
 * Clears a user's threat score and resets their account lock.
 * Used by admin when a false positive is identified.
 *
 * @param {string} userId
 */
export const clearUserSecurityProfile = async (userId) => {
  try {
    await User.updateOne(
      { _id: userId },
      { $set: { failedAttempts: 0, cooldownUntil: null } }
    );
    clearUserThreat(userId);
    logEvent('info', 'SECURITY_RECOVERY', `Security profile cleared for user ${userId} by admin`);
  } catch (err) {
    logEvent('error', 'SECURITY_RECOVERY', `Failed to clear user security profile: ${err.message}`);
    throw err;
  }
};

// ─── Startup Recovery Runner ──────────────────────────────────────────────────

/**
 * Run all non-destructive recovery tasks on startup or periodic heartbeat.
 * Safe to call multiple times — each operation is idempotent.
 */
export const runStartupRecovery = async () => {
  logEvent('info', 'SECURITY_RECOVERY', 'Running startup security recovery sweep...');
  await Promise.allSettled([
    releaseExpiredAccountLockouts(),
    repairExpiredReservations(),
  ]);
  logEvent('info', 'SECURITY_RECOVERY', 'Startup security recovery complete.');
};
