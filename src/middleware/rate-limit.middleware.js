import { logEvent } from '../utils/logger.js';
import { recordRateLimitViolation } from '../middleware/intrusion-detection.middleware.js';

const ipRequestCounts = new Map();

export const rateLimiter = (limit, windowMs) => {
  return async (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    // Upstash Redis configuration check (Serverless-safe rate limiting)
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      try {
        const windowIndex = Math.floor(now / windowMs);
        const key = `rate_limit:${ip.replace(/:/g, '_')}:${windowIndex}`;

        // Atomically increment and set TTL in a single request to Upstash REST pipeline
        const response = await fetch(`${redisUrl}/pipeline`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([
            ['INCR', key],
            ['EXPIRE', key, Math.ceil(windowMs / 1000)]
          ])
        });

        if (response.ok) {
          const results = await response.json();
          const count = results[0]?.result;
          if (count && count > limit) {
            // Signal shield about repeated violation
            recordRateLimitViolation(ip, `${req.method} ${req.path}`).catch(() => {});
            return res.status(429).json({ message: 'Too many requests. Please try again later.' });
          }
          return next();
        } else {
          logEvent('warn', 'RATE_LIMIT_REDIS_FAIL', `Upstash Redis returned status ${response.status}. Falling back to memory.`);
        }
      } catch (err) {
        logEvent('error', 'RATE_LIMIT_REDIS_ERROR', `Upstash Redis error: ${err.message}. Falling back to memory.`);
      }
    }

    if (!ipRequestCounts.has(ip)) {
      ipRequestCounts.set(ip, []);
    }

    const requestTimes = ipRequestCounts.get(ip);
    const activeRequests = requestTimes.filter(time => now - time < windowMs);

    if (activeRequests.length >= limit) {
      // Signal shield about repeated violation
      recordRateLimitViolation(ip, `${req.method} ${req.path}`).catch(() => {});
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    activeRequests.push(now);
    ipRequestCounts.set(ip, activeRequests);
    next();
  };
};

export const authLimiter = rateLimiter(15, 15 * 60 * 1000); // 15 requests per 15 minutes
export const checkoutLimiter = rateLimiter(5, 5 * 60 * 1000); // 5 requests per 5 minutes
export const extendLimiter = rateLimiter(3, 60 * 1000); // 3 requests per 1 minute

