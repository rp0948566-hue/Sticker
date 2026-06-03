import express from 'express';
import { handlePaymentWebhook } from '../controllers/webhook.controller.js';
import { verifyWebhookSignature } from '../middleware/webhook.middleware.js';

const router = express.Router();

router.post('/', verifyWebhookSignature, handlePaymentWebhook);

export default router;
