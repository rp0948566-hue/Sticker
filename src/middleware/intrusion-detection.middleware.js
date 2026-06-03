/**
 * Intrusion Detection Middleware
 *
 * Passively inspects every inbound request for:
 *  - IP blocklist membership (immediate 403)
 *  - Repeated rate-limit violations (signals API scraping)
 *  - Admin panel probing from untrusted origins
 *  - Suspicious User-Agent patterns (scanners, bots, exploit tools)
 *  - Suspiciously long/malformed payloads (injection attempts)
 *
 * This middleware is non-blocking by default. It logs and escalates but does
 * NOT reject requests unless the IP is explicitly blocked (Level 4+). Rejection
 * is handled downstream by adaptive-protection.middleware.js.
 */

import {
  isIpBlocked,
  recordThreat,
  getIpThreatScore,
  getProtectionLevel,
  PROTECTION_LEVELS,
} from '../services/security-shield.service.js';
import { logEvent } from '../utils/logger.js';

// ─── Suspicious User-Agent patterns ─────────────────────────────────────────
const SUSPICIOUS_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /dirbuster/i,
  /gobuster/i,
  /burpsuite/i,
  /hydra/i,
  /metasploit/i,
  /python-requests/i,
  /go-http-client/i,
  /curl\/[0-9]/i,
  /libwww-perl/i,
  /scrapy/i,
  /zgrab/i,
];

// ─── Admin panel path patterns ────────────────────────────────────────────────
const ADMIN_PATH_PATTERNS = [
  /^\/api\/v1\/admin/i,
  /^\/admin/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/phpmyadmin/i,
  /\/\.env/i,
  /\/config/i,
];

// ─── High-frequency scraping sentinel (in-memory per-instance) ───────────────
const SCRAPE_WINDOW_MS = 10 * 1000; // 10 second window
const SCRAPE_THRESHOLD = 30;        // 30 requests in 10s = scraping
const scrapeCounters = new Map();

const getScrapeCount = (ip) => {
  const now = Date.now();
  const entry = scrapeCounters.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > SCRAPE_WINDOW_MS) {
    // Reset window
    const reset = { count: 1, windowStart: now };
    scrapeCounters.set(ip, reset);
    return 1;
  }
  entry.count += 1;
  scrapeCounters.set(ip, entry);
  return entry.count;
};

// Cleanup old entries periodically to avoid memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - SCRAPE_WINDOW_MS * 2;
    for (const [ip, entry] of scrapeCounters.entries()) {
      if (entry.windowStart < cutoff) scrapeCounters.delete(ip);
    }
  }, 60 * 1000);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Core intrusion detection middleware. Mount globally in api/index.js
 * BEFORE all route handlers but AFTER connectDB middleware.
 */
export const intrusionDetection = async (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const endpoint = `${req.method} ${req.path}`;
  const ua = req.headers['user-agent'] || '';

  try {
    // ── 1. Blocked IP fast-path ──────────────────────────────────────────────
    if (isIpBlocked(ip)) {
      logEvent('warn', 'IDS', `Blocked IP attempted access: ${ip} → ${endpoint}`);
      return res.status(403).json({
        message: 'Access denied. Your IP address has been temporarily restricted due to suspicious activity.',
      });
    }

    // ── 2. Admin panel probing detection ─────────────────────────────────────
    const isAdminPath = ADMIN_PATH_PATTERNS.some(p => p.test(req.path));
    if (isAdminPath) {
      const authHeader = req.headers.authorization;
      const cookieToken = req.headers.cookie?.includes('token=');
      if (!authHeader && !cookieToken) {
        // Non-blocking — do not await; never let this delay or break the request
        recordThreat({
          ip,
          endpoint,
          event: 'ADMIN_PROBE',
          details: { ua, path: req.path },
        }).catch(err => logEvent('error', 'IDS', `recordThreat failed (admin_probe): ${err.message}`));
      }
    }

    // ── 3. Suspicious User-Agent detection ───────────────────────────────────
    if (SUSPICIOUS_UA_PATTERNS.some(p => p.test(ua))) {
      // Non-blocking — do not await
      recordThreat({
        ip,
        endpoint,
        event: 'API_SCRAPING',
        details: { ua, reason: 'suspicious_user_agent' },
      }).catch(err => logEvent('error', 'IDS', `recordThreat failed (ua): ${err.message}`));
    }

    // ── 4. High-frequency scraping detection ─────────────────────────────────
    const reqCount = getScrapeCount(ip);
    if (reqCount > SCRAPE_THRESHOLD) {
      // Non-blocking — do not await
      recordThreat({
        ip,
        endpoint,
        event: 'API_SCRAPING',
        details: { requestsInWindow: reqCount, windowMs: SCRAPE_WINDOW_MS },
      }).catch(err => logEvent('error', 'IDS', `recordThreat failed (scrape): ${err.message}`));
    }

    // ── 5. Oversized payload detection (injection probe signal) ──────────────
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > 1_000_000) { // > 1MB body on non-upload routes
      logEvent('warn', 'IDS', `Oversized payload from ${ip}: ${contentLength} bytes on ${endpoint}`);
      return res.status(413).json({ message: 'Request payload too large.' });
    }

    // ── 6. Re-check IP threat score (non-blocking, best-effort) ──────────────
    //    Wrapped separately — a Redis/network failure here must NEVER block catalog
    let ipScore = 0;
    try {
      ipScore = await getIpThreatScore(ip);
    } catch (scoreErr) {
      logEvent('warn', 'IDS', `getIpThreatScore failed for ${ip}: ${scoreErr.message}. Allowing request.`);
    }

    if (getProtectionLevel(ipScore) >= PROTECTION_LEVELS.BLOCKED) {
      logEvent('warn', 'IDS', `IP ${ip} reached block threshold mid-request (score: ${ipScore}). Blocking.`);
      return res.status(403).json({
        message: 'Access denied. Your IP has been temporarily restricted.',
      });
    }

    // ── Attach threat metadata to request for downstream middleware ──────────
    req.shield = { ip, ipScore };
  } catch (err) {
    // Safety net: if ANY part of intrusion detection fails, log it and continue.
    // Security infrastructure failures must NEVER block legitimate catalog requests.
    logEvent('error', 'IDS', `intrusionDetection middleware error (allowing request): ${err.message}`);
    req.shield = { ip, ipScore: 0 };
  }

  next();
};

/**
 * Rate-limit violation tracker — call this inside your rate limiter when limit is exceeded.
 * Signals the security shield that this IP is violating rate limits repeatedly.
 */
export const recordRateLimitViolation = async (ip, endpoint) => {
  await recordThreat({
    ip,
    endpoint,
    event: 'RATE_LIMIT_VIOLATION',
    details: { reason: 'rate_limit_exceeded' },
  });
};
