/**
 * Inventory Protection Shield Middleware
 *
 * Detects and prevents:
 *  - Reservation farming (users holding many reservations without purchasing)
 *  - Inventory hoarding (single user reserving disproportionate stock)
 *  - Rapid checkout abuse (burst reservation followed by immediate cancel cycles)
 *  - Cart abuse (adding/removing high-value items rapidly)
 *
 * This middleware is applied specifically to reservation and cart endpoints.
 */

import Reservation from '../models/reservation.model.js';
import { recordThreat } from '../services/security-shield.service.js';
import { logEvent } from '../utils/logger.js';

// ─── Thresholds ───────────────────────────────────────────────────────────────
const MAX_ACTIVE_RESERVATIONS    = 5;    // Hard cap (enforced in cart.controller too)
const HOARD_QUANTITY_THRESHOLD   = 10;   // Reserving ≥10 units of one item
const RAPID_RESERVE_WINDOW_MS    = 5 * 60 * 1000;  // 5 minutes
const RAPID_RESERVE_THRESHOLD    = 3;    // 3+ reserve actions in 5 minutes
const CART_ABUSE_WINDOW_MS       = 60 * 1000;       // 1 minute
const CART_ABUSE_THRESHOLD       = 10;   // 10+ cart mutations in 1 minute

// ─── In-memory rapid action counters ────────────────────────────────────────
const reserveCounters = new Map();
const cartCounters    = new Map();

const trackAction = (store, key, windowMs) => {
  const now  = Date.now();
  const prev = store.get(key) || { count: 0, windowStart: now };
  if (now - prev.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return 1;
  }
  prev.count += 1;
  store.set(key, prev);
  return prev.count;
};

// ─── Middleware: Reserve Stock Protection ─────────────────────────────────────

/**
 * Apply before the reserveStock controller.
 * Checks for rapid reservation abuse and inventory hoarding.
 */
export const inventoryReserveProtection = async (req, res, next) => {
  const userId   = req.user?._id;
  const ip       = req.shield?.ip || req.ip;
  const endpoint = `${req.method} ${req.path}`;
  const { productId, quantity } = req.body || {};

  if (!userId) return next();

  const userKey = String(userId);

  // ── 1. Rapid reservation cycling detection ────────────────────────────────
  const reserveCount = trackAction(reserveCounters, userKey, RAPID_RESERVE_WINDOW_MS);
  if (reserveCount > RAPID_RESERVE_THRESHOLD) {
    await recordThreat({
      ip,
      userId,
      endpoint,
      event: 'RAPID_CHECKOUT_ABUSE',
      details: { reserveActionsInWindow: reserveCount, windowMs: RAPID_RESERVE_WINDOW_MS },
    });
    logEvent('warn', 'INVENTORY_SHIELD',
      `Rapid reservation abuse detected for user ${req.user.email} (${reserveCount} in ${RAPID_RESERVE_WINDOW_MS / 1000}s)`
    );
    return res.status(429).json({
      message: 'Too many reservation attempts in a short period. Please wait before reserving again.',
    });
  }

  // ── 2. Inventory hoarding detection (large single-item quantity) ──────────
  if (quantity && Number(quantity) >= HOARD_QUANTITY_THRESHOLD) {
    await recordThreat({
      ip,
      userId,
      endpoint,
      event: 'RESERVATION_ABUSE',
      details: { productId, quantity, reason: 'hoard_quantity_threshold' },
    });
    logEvent('warn', 'INVENTORY_SHIELD',
      `Inventory hoarding detected: user ${req.user.email} attempted to reserve ${quantity} units of ${productId}`
    );
    // Don't block — just flag. Controller enforces business-level limits.
  }

  // ── 3. Active reservation farming detection ───────────────────────────────
  const activeCount = await Reservation.countDocuments({
    userId,
    status: 'active',
  });

  if (activeCount >= MAX_ACTIVE_RESERVATIONS) {
    await recordThreat({
      ip,
      userId,
      endpoint,
      event: 'RESERVATION_ABUSE',
      details: { activeReservations: activeCount, reason: 'reservation_farming' },
    });
  }

  next();
};

// ─── Middleware: Cart Abuse Protection ────────────────────────────────────────

/**
 * Apply before cart update endpoints.
 * Detects rapid add/remove patterns that indicate cart abuse or scraping.
 */
export const cartAbuseProtection = async (req, res, next) => {
  const userId   = req.user?._id;
  const ip       = req.shield?.ip || req.ip;
  const endpoint = `${req.method} ${req.path}`;

  if (!userId) return next();

  const userKey   = String(userId);
  const cartCount = trackAction(cartCounters, userKey, CART_ABUSE_WINDOW_MS);

  if (cartCount > CART_ABUSE_THRESHOLD) {
    await recordThreat({
      ip,
      userId,
      endpoint,
      event: 'CART_ABUSE',
      details: { cartActionsInWindow: cartCount, windowMs: CART_ABUSE_WINDOW_MS },
    });
    logEvent('warn', 'INVENTORY_SHIELD',
      `Cart abuse detected for user ${req.user.email} (${cartCount} mutations in ${CART_ABUSE_WINDOW_MS / 1000}s)`
    );
    return res.status(429).json({
      message: 'Too many cart modifications in a short period. Please slow down.',
    });
  }

  next();
};
