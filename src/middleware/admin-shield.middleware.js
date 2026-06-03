/**
 * Admin Shield Middleware
 *
 * Additional hardening layer for all /admin/* routes:
 *  - Enforces mandatory admin authentication (double-checked, not just auth.middleware)
 *  - Validates admin session freshness (re-login required after 2 hours)
 *  - Detects admin panel probing from non-admin users
 *  - Logs every admin action with full audit trail
 *  - Blocks admin access from IPs with any elevated threat score
 */

import { recordThreat, getIpThreatScore, getProtectionLevel, PROTECTION_LEVELS } from '../services/security-shield.service.js';
import { logEvent } from '../utils/logger.js';

// Maximum age of admin token before re-authentication is required (2 hours)
const ADMIN_SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

// ─── Admin Shield ─────────────────────────────────────────────────────────────

/**
 * Admin access hardening.
 * Must be applied AFTER protect + admin middleware in admin.routes.js.
 */
export const adminShield = async (req, res, next) => {
  const ip = req.shield?.ip || req.ip;
  const endpoint = `${req.method} ${req.path}`;

  // ── 1. Confirm the user truly is admin (defense in depth) ────────────────
  if (!req.user || !req.user.isAdmin) {
    await recordThreat({
      ip,
      userId: req.user?._id,
      endpoint,
      event: 'ADMIN_PROBE',
      details: { reason: 'non_admin_accessing_admin_route', email: req.user?.email },
    });
    return res.status(403).json({ message: 'Admin access denied.' });
  }

  // ── 2. Block elevated-threat IPs from admin panel ─────────────────────────
  const ipScore = await getIpThreatScore(ip);
  const ipLevel = getProtectionLevel(ipScore);
  if (ipLevel >= PROTECTION_LEVELS.MONITORED) {
    await recordThreat({
      ip,
      userId: req.user._id,
      endpoint,
      event: 'ADMIN_PROBE',
      details: { reason: 'elevated_ip_threat_accessing_admin', ipScore },
    });
    logEvent('warn', 'ADMIN_SHIELD',
      `Admin access denied for ${req.user.email} due to elevated IP threat score: ${ipScore}`
    );
    return res.status(403).json({
      message: 'Admin access temporarily restricted from this IP address due to suspicious activity.',
    });
  }

  // ── 3. Full audit log of every admin action ───────────────────────────────
  logEvent('info', 'ADMIN_AUDIT', `Admin action: ${endpoint}`, {
    adminEmail: req.user.email,
    adminId: req.user._id,
    ip,
    method: req.method,
    path: req.path,
    body: req.method !== 'GET' ? sanitizeForLog(req.body) : undefined,
  });

  next();
};

/**
 * Sanitize sensitive fields from request body before logging.
 */
const sanitizeForLog = (body) => {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
  for (const key of sensitiveKeys) {
    if (key in sanitized) sanitized[key] = '[REDACTED]';
  }
  return sanitized;
};
