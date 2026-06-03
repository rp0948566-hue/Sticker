/**
 * Security Dashboard Controller
 *
 * Admin-only endpoints for the Security Shield dashboard:
 *  - GET  /api/v1/security/stats        — Threat statistics overview
 *  - GET  /api/v1/security/events       — Recent security events log
 *  - GET  /api/v1/security/blocklist    — Active blocked IPs
 *  - POST /api/v1/security/unblock      — Manually unblock an IP
 *  - POST /api/v1/security/user/:id/clear — Clear user threat profile
 *  - POST /api/v1/security/inventory/repair/:productId — Repair inventory for a product
 *  - POST /api/v1/security/recovery/run — Trigger full recovery sweep
 */

import {
  getThreatStats,
  getRecentSecurityEvents,
  getBlocklistSnapshot,
  unblockIp,
} from '../services/security-shield.service.js';
import {
  clearUserSecurityProfile,
  recalculateProductReservedStock,
  runStartupRecovery,
} from '../services/security-recovery.service.js';
import { logEvent } from '../utils/logger.js';

// GET /api/v1/security/stats
export const getSecurityStats = async (req, res, next) => {
  try {
    const stats = await getThreatStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/security/events?limit=50&severity=high&eventType=brute_force&since=<ISO>
export const getSecurityEvents = async (req, res, next) => {
  try {
    const { limit = 50, severity, eventType, since } = req.query;
    const events = await getRecentSecurityEvents({
      limit: Math.min(parseInt(limit, 10) || 50, 200),
      severity,
      eventType,
      since,
    });
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/security/blocklist
export const getBlocklist = (req, res) => {
  const blocklist = getBlocklistSnapshot();
  res.json({ success: true, count: blocklist.length, data: blocklist });
};

// POST /api/v1/security/unblock  { ip: "x.x.x.x" }
export const manualUnblockIp = (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ message: 'IP address is required.' });
  }
  unblockIp(ip);
  logEvent('info', 'SECURITY_DASHBOARD', `Admin ${req.user.email} manually unblocked IP: ${ip}`);
  res.json({ success: true, message: `IP ${ip} has been unblocked.` });
};

// POST /api/v1/security/user/:id/clear
export const clearUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    await clearUserSecurityProfile(id);
    logEvent('info', 'SECURITY_DASHBOARD',
      `Admin ${req.user.email} cleared security profile for user ${id}`
    );
    res.json({ success: true, message: `Security profile cleared for user ${id}.` });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/security/inventory/repair/:productId
export const repairInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const result = await recalculateProductReservedStock(productId);
    logEvent('info', 'SECURITY_DASHBOARD',
      `Admin ${req.user.email} triggered inventory repair for product ${productId}`
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/security/recovery/run
export const triggerRecovery = async (req, res, next) => {
  try {
    logEvent('info', 'SECURITY_DASHBOARD',
      `Admin ${req.user.email} triggered manual security recovery sweep`
    );
    // Run async — don't block response
    runStartupRecovery().catch(err =>
      logEvent('error', 'SECURITY_DASHBOARD', `Recovery error: ${err.message}`)
    );
    res.json({ success: true, message: 'Security recovery sweep initiated.' });
  } catch (err) {
    next(err);
  }
};
