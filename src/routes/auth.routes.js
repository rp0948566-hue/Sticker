import express from 'express';
import { register, login, getMe, logout, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rate-limit.middleware.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
