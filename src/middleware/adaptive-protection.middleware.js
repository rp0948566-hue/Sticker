/**
 * Adaptive Protection Middleware
 *
 * 5-Level Escalation System:
 *
 *  Level 1 (score 20–39): MONITORED  → Increased logging, standard rate limits
 *  Level 2 (score 40–59): COOLDOWN   → 60-second request cooldown per IP
 *  Level 3 (score 60–79): LOCKED     → Account locked, 429 with Retry-After
 *  Level 4 (score 80–99): BLOCKED    → IP challenge, return 403
 *  Level 5 (score ≥ 100): EMERGENCY  → Alert admin, IP hard block
 *
 * This middleware runs per-request and enforces the current protection level
 * for the requesting IP and (if authenticated) the requesting user.
 */

import User from '../models/user.model.js';
import {
  getIpThreatScore,
  getUserThreatScore,
  getProtectionLevel,
  recordThreat,
  PROTECTION_LEVELS,
  isIpBlocked,
} from '../services/security-shield.service.js';
import { triggerEmergencyAlert } from '../services/security-monitor.service.js';
import { logEvent } from '../utils/logger.js';

// ─── Cooldown Window Tracking (in-memory per-instance) ───────────────────────
const COOLDOWN_WINDOW_MS = 60 * 1000; // 60 second cooldown window
const cooldownMap = new Map();

const isInCooldown = (key) => {
  const expiry = cooldownMap.get(key);
  if (!expiry) return false;
  if (Date.now() >= expiry) {
    cooldownMap.delete(key);
    return false;
  }
  return true;
};

const setCooldown = (key, durationMs = COOLDOWN_WINDOW_MS) => {
  cooldownMap.set(key, Date.now() + durationMs);
};

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Adaptive protection enforcement.
 * Mount after intrusionDetection in api/index.js.
 */
export const adaptiveProtection = async (req, res, next) => {
  const ip = req.shield?.ip || req.ip;
  const endpoint = `${req.method} ${req.path}`;

  try {
    // ── Get IP protection level ──────────────────────────────────────────────
    let ipScore = req.shield?.ipScore ?? 0;
    try {
      ipScore = req.shield?.ipScore ?? (await getIpThreatScore(ip));
    } catch (scoreErr) {
      logEvent('warn', 'ADAPTIVE_PROTECTION', `getIpThreatScore failed: ${scoreErr.message}. Allowing request.`);
    }
    const ipLevel = getProtectionLevel(ipScore);

    // ── Level 4+: IP blocked ─────────────────────────────────────────────────
    if (ipLevel >= PROTECTION_LEVELS.BLOCKED || isIpBlocked(ip)) {
      if (ipLevel >= PROTECTION_LEVELS.EMERGENCY) {
        // Level 5: Emergency — fire and forget, never block on this
        triggerEmergencyAlert({
          ip,
          score: ipScore,
          endpoint,
          reason: 'IP reached emergency threat level',
        }).catch(() => {});
      }
      return res.status(403).json({
        message: 'Access temporarily restricted due to suspicious activity. Contact support if you believe this is an error.',
      });
    }

    // ── Level 3: IP cooldown ─────────────────────────────────────────────────
    if (ipLevel >= PROTECTION_LEVELS.LOCKED) {
      if (isInCooldown(`ip:${ip}`)) {
        const retryAfter = Math.ceil(COOLDOWN_WINDOW_MS / 1000);
        res.set('Retry-After', retryAfter);
        return res.status(429).json({
          message: 'Too many suspicious requests. Please wait before trying again.',
          retryAfter,
        });
      }
      setCooldown(`ip:${ip}`, 5 * 60 * 1000); // 5-minute cooldown for Level 3
    }

    // ── Level 2: Moderate cooldown (apply to sensitive endpoints only) ────────
    if (ipLevel >= PROTECTION_LEVELS.COOLDOWN) {
      const isSensitive = /\/(auth|checkout|reserve|order)/i.test(req.path);
      if (isSensitive && isInCooldown(`ip:${ip}:sensitive`)) {
        return res.status(429).json({
          message: 'Request rate temporarily restricted. Please try again in a moment.',
        });
      }
      if (isSensitive) {
        setCooldown(`ip:${ip}:sensitive`, COOLDOWN_WINDOW_MS);
      }
    }

    // ── User-level threat checks (only for authenticated requests) ────────────
    const userId = req.user?._id;
    if (userId) {
      let userScore = 0;
      try {
        userScore = await getUserThreatScore(String(userId));
      } catch (userScoreErr) {
        logEvent('warn', 'ADAPTIVE_PROTECTION', `getUserThreatScore failed: ${userScoreErr.message}. Skipping user check.`);
      }
      const userLevel = getProtectionLevel(userScore);

      // Level 3+: Lock user account temporarily
      if (userLevel >= PROTECTION_LEVELS.LOCKED) {
        logEvent('warn', 'ADAPTIVE_PROTECTION',
          `User ${req.user.email} reached lock level (score: ${userScore}). Blocking sensitive action.`
        );

        // Lock the account in DB if not already locked — best-effort, don't crash on failure
        const lockExpiry = new Date(Date.now() + 15 * 60 * 1000);
        User.updateOne(
          { _id: userId, $or: [{ cooldownUntil: null }, { cooldownUntil: { $lt: new Date() } }] },
          { $set: { cooldownUntil: lockExpiry } }
        ).catch(dbErr => logEvent('error', 'ADAPTIVE_PROTECTION', `DB lock failed: ${dbErr.message}`));

        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
        if (isMutation) {
          return res.status(429).json({
            message: 'Your account is temporarily restricted due to suspicious activity. Please try again in 15 minutes.',
          });
        }
      }

      // Level 1+: Attach monitoring flag for audit logging
      if (userLevel >= PROTECTION_LEVELS.MONITORED) {
        req.shield = { ...(req.shield || {}), userMonitored: true, userId };
        logEvent('info', 'ADAPTIVE_PROTECTION',
          `Monitored user ${req.user.email} performing: ${endpoint} (score: ${userScore})`
        );
      }
    }

    // ── Attach protection level for downstream use ────────────────────────────
    req.shield = {
      ...(req.shield || {}),
      ipLevel,
      ipScore,
    };
  } catch (err) {
    // Safety net: adaptive protection failures must NEVER block catalog requests.
    logEvent('error', 'ADAPTIVE_PROTECTION', `adaptiveProtection middleware error (allowing request): ${err.message}`);
  }

  next();
};

/**
 * Elevated protection — stricter checks for admin routes.
 * Apply to /admin/* routes in addition to standard adaptiveProtection.
 */
export const adminAdaptiveProtection = async (req, res, next) => {
  const ip = req.shield?.ip || req.ip;
  const ipScore = req.shield?.ipScore ?? (await getIpThreatScore(ip));
  const ipLevel = getProtectionLevel(ipScore);

  // Any elevated IP threat blocks admin access entirely
  if (ipLevel >= PROTECTION_LEVELS.MONITORED) {
    await recordThreat({
      ip,
      userId: req.user?._id,
      endpoint: `${req.method} ${req.path}`,
      event: 'ADMIN_PROBE',
      details: { reason: 'elevated_ip_score_accessing_admin', ipScore },
    });
    return res.status(403).json({
      message: 'Admin access denied due to suspicious activity from your IP.',
    });
  }

  next();
};
