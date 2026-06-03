/**
 * Security Monitor Service
 *
 * Responsibilities:
 *  - Send admin notifications when critical threats are detected
 *  - Trigger emergency alerts (Level 5) with full incident context
 *  - Provide a notification channel (email + in-DB notification)
 *  - Track system health anomalies
 *
 * Uses the existing email utility and Notification model for persistence.
 */

import Notification from '../models/notification.model.js';
import { logEvent } from '../utils/logger.js';
import { sendCustomerEmail } from '../utils/email.js';

// ─── Alert Deduplication (avoid alert storms) ────────────────────────────────
const recentAlerts = new Map();
const ALERT_DEDUP_WINDOW_MS = 10 * 60 * 1000; // Don't re-alert for same IP within 10 min

const isDuplicateAlert = (key) => {
  const last = recentAlerts.get(key);
  if (!last) return false;
  if (Date.now() - last > ALERT_DEDUP_WINDOW_MS) {
    recentAlerts.delete(key);
    return false;
  }
  return true;
};

const markAlertSent = (key) => {
  recentAlerts.set(key, Date.now());
};

// ─── Admin Notification via DB ────────────────────────────────────────────────

const createAdminNotification = async ({ title, message, severity = 'high', metadata = {} }) => {
  try {
    await Notification.create({
      type: 'security_alert',
      title,
      message,
      severity,
      metadata,
      isRead: false,
    });
  } catch (err) {
    logEvent('error', 'SECURITY_MONITOR', `Failed to create admin notification: ${err.message}`);
  }
};

// ─── Email Alert ──────────────────────────────────────────────────────────────

const sendSecurityEmail = async ({ subject, body }) => {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logEvent('warn', 'SECURITY_MONITOR', 'No ADMIN_ALERT_EMAIL configured. Skipping email alert.');
    return;
  }
  try {
    await sendCustomerEmail(adminEmail, subject, body);
  } catch (err) {
    logEvent('error', 'SECURITY_MONITOR', `Failed to send security alert email: ${err.message}`);
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Trigger an emergency security alert (Level 5).
 * Called by adaptive-protection when IP reaches emergency threshold.
 */
export const triggerEmergencyAlert = async ({ ip, score, endpoint, reason }) => {
  const dedupKey = `emergency:${ip}`;
  if (isDuplicateAlert(dedupKey)) return;
  markAlertSent(dedupKey);

  const title   = `🚨 EMERGENCY SECURITY ALERT — IP: ${ip}`;
  const message = `Threat Level CRITICAL detected.\n\nIP: ${ip}\nScore: ${score}\nEndpoint: ${endpoint}\nReason: ${reason}\nTime: ${new Date().toISOString()}`;

  logEvent('error', 'SECURITY_MONITOR', title, { ip, score, endpoint, reason });

  await Promise.all([
    createAdminNotification({ title, message, severity: 'critical', metadata: { ip, score, endpoint } }),
    sendSecurityEmail({ subject: title, body: message }),
  ]);
};

/**
 * Send an admin security notification for elevated threats.
 * Called when a notable (but non-emergency) threat event occurs.
 */
export const notifyAdminThreat = async ({ ip, userId, eventType, severity, details = {} }) => {
  const dedupKey = `threat:${ip}:${eventType}`;
  if (isDuplicateAlert(dedupKey)) return;
  markAlertSent(dedupKey);

  const title   = `⚠️ Security Alert: ${eventType}`;
  const message = `Threat event detected.\n\nType: ${eventType}\nSeverity: ${severity}\nIP: ${ip}\nUser: ${userId || 'anonymous'}\nDetails: ${JSON.stringify(details, null, 2)}\nTime: ${new Date().toISOString()}`;

  logEvent('warn', 'SECURITY_MONITOR', title, { ip, userId, eventType, severity });

  await createAdminNotification({ title, message, severity, metadata: { ip, userId, eventType, details } });

  // Only email for high/critical severity
  if (['high', 'critical'].includes(severity)) {
    await sendSecurityEmail({ subject: title, body: message });
  }
};

/**
 * Notify admin of suspicious admin panel probe.
 */
export const notifyAdminProbe = async ({ ip, endpoint, userAgent }) => {
  const dedupKey = `probe:${ip}`;
  if (isDuplicateAlert(dedupKey)) return;
  markAlertSent(dedupKey);

  const title   = `🔐 Admin Panel Probe Detected`;
  const message = `Unauthorized admin access attempt.\n\nIP: ${ip}\nEndpoint: ${endpoint}\nUser-Agent: ${userAgent}\nTime: ${new Date().toISOString()}`;

  logEvent('warn', 'SECURITY_MONITOR', title, { ip, endpoint });
  await createAdminNotification({ title, message, severity: 'high', metadata: { ip, endpoint } });
};
