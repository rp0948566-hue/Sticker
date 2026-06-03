import crypto from 'crypto';
import { logEvent } from '../utils/logger.js';

export const verifyWebhookSignature = (req, res, next) => {
  const signatureStripe = req.headers['stripe-signature'];
  const signatureRazorpay = req.headers['x-razorpay-signature'];
  const signatureCashfree = req.headers['x-cf-signature'];
  const signaturePhonePe = req.headers['x-verify'];

  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    let isValid = false;

    if (signatureStripe) {
      const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripeSecret) {
        logEvent('error', 'PAYMENT_WEBHOOK_CRITICAL', 'STRIPE_WEBHOOK_SECRET environment variable is missing.');
        return res.status(500).json({ message: 'Stripe webhook signature validation is misconfigured on the server.' });
      }
      // Stripe signature check (t=TIMESTAMP,v1=SIGNATURE)
      const parts = signatureStripe.split(',').reduce((acc, part) => {
        const [k, v] = part.split('=');
        acc[k] = v;
        return acc;
      }, {});
      if (parts.t && parts.v1) {
        const hmac = crypto.createHmac('sha256', stripeSecret);
        const calculated = hmac.update(`${parts.t}.${rawBody}`).digest('hex');
        isValid = calculated === parts.v1;
      }
    } else if (signatureRazorpay) {
      const razorpaySecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!razorpaySecret) {
        logEvent('error', 'PAYMENT_WEBHOOK_CRITICAL', 'RAZORPAY_WEBHOOK_SECRET environment variable is missing.');
        return res.status(500).json({ message: 'Razorpay webhook signature validation is misconfigured on the server.' });
      }
      // Razorpay signature check (HMAC SHA256 hex)
      const calculated = crypto.createHmac('sha256', razorpaySecret).update(rawBody).digest('hex');
      isValid = calculated === signatureRazorpay;
    } else if (signatureCashfree) {
      const cashfreeSecret = process.env.CASHFREE_WEBHOOK_SECRET;
      if (!cashfreeSecret) {
        logEvent('error', 'PAYMENT_WEBHOOK_CRITICAL', 'CASHFREE_WEBHOOK_SECRET environment variable is missing.');
        return res.status(500).json({ message: 'Cashfree webhook signature validation is misconfigured on the server.' });
      }
      // Cashfree signature check (HMAC SHA256 hex)
      const calculated = crypto.createHmac('sha256', cashfreeSecret).update(rawBody).digest('hex');
      isValid = calculated === signatureCashfree;
    } else if (signaturePhonePe) {
      const phonepeSecret = process.env.PHONEPE_WEBHOOK_SECRET; // Format: SaltKey###SaltIndex
      if (!phonepeSecret || !phonepeSecret.includes('###')) {
        logEvent('error', 'PAYMENT_WEBHOOK_CRITICAL', 'PHONEPE_WEBHOOK_SECRET env variable is missing or invalid. Expected SaltKey###SaltIndex');
        return res.status(500).json({ message: 'PhonePe webhook signature validation is misconfigured on the server.' });
      }
      const [saltKey, saltIndex] = phonepeSecret.split('###');
      // PhonePe webhook body structure contains { response: "BASE64" }
      const base64Response = req.body.response || '';
      const calculated = crypto.createHash('sha256').update(base64Response + saltKey).digest('hex') + '###' + saltIndex;
      isValid = (calculated === signaturePhonePe);
    } else {
      logEvent('warn', 'PAYMENT_WEBHOOK_FAIL', `Unauthenticated webhook request rejected from IP ${req.ip}. No gateway header found.`);
      return res.status(401).json({ message: 'Missing webhook signature headers.' });
    }

    if (!isValid) {
      logEvent('warn', 'PAYMENT_WEBHOOK_FAIL', `Unauthenticated webhook request rejected from IP ${req.ip}`);
      return res.status(401).json({ message: 'Invalid or missing signature.' });
    }

    next();
  } catch (error) {
    logEvent('error', 'PAYMENT_WEBHOOK_ERROR', `Verification process failed: ${error.message}`);
    return res.status(400).json({ message: 'Webhook verification error' });
  }
};
