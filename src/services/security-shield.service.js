/**
 * Security Shield Service — Core Threat Intelligence Engine
 *
 * Responsibilities:
 *  - Track per-IP and per-user threat scores in-memory (serverless-safe via TTL map)
 *  - Persist critical security events to MongoDB via SecurityEvent model
 *  - Expose helper functions consumed by all security middleware layers
 *  - Upstash Redis-backed threat state when available (cross-serverless-instance sync)
 */

import SecurityEvent from '../models/security-event.model.js';
import { logEvent } from '../utils/logger.js';

// ─── In-memory fallback stores (bounded TTL maps) ───────────────────────────
const MAX_ENTRIES = 5000;
const THREAT_TTL_MS = 60 * 60 * 1000; // 1 hour

class BoundedTTLMap {
  constructor(ttlMs = THREAT_TTL_MS, maxEntries = MAX_ENTRIES) {
    this._map = new Map();
    this._ttl = ttlMs;
    this._max = maxEntries;
  }

  get(key) {
    const entry = this._map.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > this._ttl) {
      this._map.delete(key);
      return undefined;
    }
    return entry.val;
  }

  set(key, val) {
    if (this._map.size >= this._max) {
      // Evict oldest entry
      const oldest = this._map.keys().next().value;
      this._map.delete(oldest);
    }
    this._map.set(key, { val, ts: Date.now() });
  }

  delete(key) {
    this._map.delete(key);
  }

  has(key) {
    return this.get(key) !== undefined;
  }
}

const ipThreatStore = new BoundedTTLMap();
const userThreatStore = new BoundedTTLMap();
const ipBlocklist = new BoundedTTLMap(24 * 60 * 60 * 1000); // 24h block TTL

// ─── Threat Score Constants ──────────────────────────────────────────────────
export const THREAT_EVENTS = {
  LOGIN_FAILURE:           { score: 10, type: 'login_abuse',         severity: 'low'      },
  BRUTE_FORCE:             { score: 30, type: 'brute_force',         severity: 'high'     },
  CREDENTIAL_STUFFING:     { score: 40, type: 'credential_stuffing', severity: 'high'     },
  RESERVATION_ABUSE:       { score: 20, type: 'reservation_abuse',   severity: 'medium'   },
  CART_ABUSE:              { score: 15, type: 'cart_abuse',          severity: 'medium'   },
  API_SCRAPING:            { score: 25, type: 'api_scraping',        severity: 'medium'   },
  RATE_LIMIT_VIOLATION:    { score: 20, type: 'rate_limit_violation', severity: 'medium'  },
  ADMIN_PROBE:             { score: 50, type: 'admin_probe',         severity: 'critical' },
  SUSPICIOUS_IP:           { score: 15, type: 'suspicious_ip',       severity: 'low'      },
  RAPID_CHECKOUT_ABUSE:    { score: 35, type: 'reservation_abuse',   severity: 'high'     },
};

// ─── Protection Levels ───────────────────────────────────────────────────────
export const PROTECTION_LEVELS = {
  NONE:      0,   // score < 20
  MONITORED: 1,   // score 20–39  → rate limit
  COOLDOWN:  2,   // score 40–59  → temporary cooldown
  LOCKED:    3,   // score 60–79  → account lock
  BLOCKED:   4,   // score 80–99  → IP challenge/block
  EMERGENCY: 5,   // score ≥ 100  → emergency alert
};

export const getProtectionLevel = (score) => {
  if (score >= 100) return PROTECTION_LEVELS.EMERGENCY;
  if (score >= 80)  return PROTECTION_LEVELS.BLOCKED;
  if (score >= 60)  return PROTECTION_LEVELS.LOCKED;
  if (score >= 40)  return PROTECTION_LEVELS.COOLDOWN;
  if (score >= 20)  return PROTECTION_LEVELS.MONITORED;
  return PROTECTION_LEVELS.NONE;
};

// ─── Upstash Redis helpers (optional, serverless-safe) ───────────────────────
const hasRedis = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redisPipeline = async (commands) => {
  try {
    const resp = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
};

// ─── Core API ────────────────────────────────────────────────────────────────

/**
 * Record a threat event for an IP and/or user, escalating their threat score.
 * @param {Object} opts
 * @param {string} opts.ip
 * @param {string} [opts.userId]
 * @param {string} opts.endpoint
 * @param {keyof THREAT_EVENTS} opts.event
 * @param {Object} [opts.details]
 */
export const recordThreat = async ({ ip, userId, endpoint, event, details = {} }) => {
  const def = THREAT_EVENTS[event];
  if (!def) return;

  // ── Update in-memory IP score ──
  const currentIpScore = ipThreatStore.get(ip) || 0;
  const newIpScore = currentIpScore + def.score;
  ipThreatStore.set(ip, newIpScore);

  // ── Update in-memory user score ──
  let newUserScore = 0;
  if (userId) {
    const currentUserScore = userThreatStore.get(String(userId)) || 0;
    newUserScore = currentUserScore + def.score;
    userThreatStore.set(String(userId), newUserScore);
  }

  // ── Sync to Upstash Redis if available ──
  if (hasRedis()) {
    const ipKey  = `shield:ip:${ip.replace(/:/g, '_')}`;
    const ttlSec = Math.ceil(THREAT_TTL_MS / 1000);
    const cmds   = [
      ['INCRBY', ipKey, def.score],
      ['EXPIRE', ipKey, ttlSec],
    ];
    if (userId) {
      const uKey = `shield:user:${userId}`;
      cmds.push(['INCRBY', uKey, def.score], ['EXPIRE', uKey, ttlSec]);
    }
    await redisPipeline(cmds);
  }

  // ── Auto-block critical threats ──
  const ipLevel = getProtectionLevel(newIpScore);
  if (ipLevel >= PROTECTION_LEVELS.BLOCKED) {
    ipBlocklist.set(ip, { blockedAt: Date.now(), score: newIpScore, reason: def.type });
    logEvent('warn', 'SECURITY_SHIELD', `IP ${ip} auto-blocked. Score: ${newIpScore}`, { event, endpoint });
  }

  // ── Persist to MongoDB (non-blocking, fire-and-forget for performance) ──
  SecurityEvent.create({
    ip,
    userId: userId || undefined,
    endpoint,
    eventType: def.type,
    severity: def.severity,
    threatScore: def.score,
    details,
  }).catch(err => logEvent('error', 'SECURITY_SHIELD', `Failed to persist security event: ${err.message}`));

  logEvent(
    def.severity === 'critical' ? 'error' : 'warn',
    'SECURITY_SHIELD',
    `Threat recorded: ${event} | IP: ${ip} | Score: ${newIpScore}`,
    { userId, endpoint, details }
  );
};

/**
 * Get the current threat score for an IP address.
 */
export const getIpThreatScore = async (ip) => {
  if (hasRedis()) {
    const results = await redisPipeline([['GET', `shield:ip:${ip.replace(/:/g, '_')}`]]);
    const redisScore = results?.[0]?.result;
    if (redisScore !== null && redisScore !== undefined) {
      return parseInt(redisScore, 10) || 0;
    }
  }
  return ipThreatStore.get(ip) || 0;
};

/**
 * Get the current threat score for a user.
 */
export const getUserThreatScore = async (userId) => {
  if (hasRedis()) {
    const results = await redisPipeline([['GET', `shield:user:${userId}`]]);
    const redisScore = results?.[0]?.result;
    if (redisScore !== null && redisScore !== undefined) {
      return parseInt(redisScore, 10) || 0;
    }
  }
  return userThreatStore.get(String(userId)) || 0;
};

/**
 * Check if an IP is currently blocked.
 */
export const isIpBlocked = (ip) => {
  return ipBlocklist.has(ip);
};

/**
 * Manually unblock an IP (admin action).
 */
export const unblockIp = (ip) => {
  ipBlocklist.delete(ip);
  ipThreatStore.delete(ip);
  if (hasRedis()) {
    redisPipeline([
      ['DEL', `shield:ip:${ip.replace(/:/g, '_')}`],
    ]);
  }
  logEvent('info', 'SECURITY_SHIELD', `IP ${ip} manually unblocked by admin`);
};

/**
 * Reset threat score for a user (admin clear).
 */
export const clearUserThreat = (userId) => {
  userThreatStore.delete(String(userId));
  if (hasRedis()) {
    redisPipeline([['DEL', `shield:user:${userId}`]]);
  }
};

/**
 * Get current blocklist snapshot for admin dashboard.
 */
export const getBlocklistSnapshot = () => {
  const entries = [];
  // Access internal map directly for snapshot
  for (const [ip, entry] of ipBlocklist._map.entries()) {
    if (Date.now() - entry.ts < 24 * 60 * 60 * 1000) {
      entries.push({ ip, ...entry.val, blockedSince: new Date(entry.ts) });
    }
  }
  return entries;
};

/**
 * Get recent security events from MongoDB.
 */
export const getRecentSecurityEvents = async ({ limit = 50, severity, eventType, since } = {}) => {
  const query = {};
  if (severity) query.severity = severity;
  if (eventType) query.eventType = eventType;
  if (since) query.timestamp = { $gte: new Date(since) };

  return SecurityEvent
    .find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * Aggregate threat statistics for dashboard.
 */
export const getThreatStats = async () => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [total, bySeverity, byType] = await Promise.all([
    SecurityEvent.countDocuments({ timestamp: { $gte: since24h } }),
    SecurityEvent.aggregate([
      { $match: { timestamp: { $gte: since24h } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    SecurityEvent.aggregate([
      { $match: { timestamp: { $gte: since24h } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    last24h: total,
    bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
    topEventTypes: byType.map(t => ({ type: t._id, count: t.count })),
    activeBlockedIPs: getBlocklistSnapshot().length,
  };
};
