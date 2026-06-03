import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import { logEvent } from '../utils/logger.js';
import { sendCustomerEmail } from '../utils/email.js';

// Helper function to generate JWT token
const generateToken = (id, authSalt) => {
  return jwt.sign({ id, authSalt }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Merge guest user local storage cart into authenticated database cart
const mergeCarts = async (userId, cartItems) => {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) return;
  
  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], cartValue: 0 });
    }

    for (const item of cartItems) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        const existingItemIndex = cart.items.findIndex(
          i => i.productId.toString() === item.productId.toString()
        );
        if (existingItemIndex > -1) {
          cart.items[existingItemIndex].quantity += item.quantity;
        } else {
          cart.items.push({ productId: item.productId, quantity: item.quantity });
        }
      }
    }

    // Recalculate total value
    let totalValue = 0;
    for (const item of cart.items) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        totalValue += prod.price * item.quantity;
      }
    }
    cart.cartValue = totalValue;
    cart.lastActivity = new Date();
    await cart.save();
    logEvent('info', 'CART_MERGE', `Merged local storage cart into database cart for user ID: ${userId}`);
  } catch (error) {
    logEvent('error', 'CART_MERGE', `Failed to merge guest cart: ${error.message}`);
  }
};

// Security Cooldown helper logs
const handleFailureCooldown = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      if (user.failedAttempts >= 3) {
        user.cooldownUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minute cooldown
        user.failedAttempts = 0;
        logEvent('warn', 'USER_COOLDOWN', `User ${user.email} put in 15 minute checkout cooldown.`);
      }
      await user.save();
    }
  } catch (error) {
    logEvent('error', 'SYSTEM', `Failed to set cooldown: ${error.message}`);
  }
};

const handleSuccessReset = async (userId) => {
  try {
    await User.updateOne({ _id: userId }, { $set: { failedAttempts: 0, cooldownUntil: null } });
  } catch (error) {
    logEvent('error', 'SYSTEM', `Failed to reset cooldown attempts: ${error.message}`);
  }
};

// Register API
export const register = async (req, res, next) => {
  try {
    const { name, email, password, cartItems } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Password Complexity Policy Validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, and one number.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      // Obfuscated error message to prevent email enumeration
      return res.status(400).json({ message: 'Registration failed. Email is invalid or already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Disabled automatic bootstrap admin role assignment for security
    const user = await User.create({
      name: String(name),
      email: cleanEmail,
      password: hashedPassword,
      isAdmin: false
    });

    logEvent('info', 'AUTH', `User registered: ${user.email} (Admin: ${user.isAdmin})`);

    // Merge cart items if registered
    if (cartItems) {
      await mergeCarts(user._id, cartItems);
    }

    const token = generateToken(user._id, user.authSalt);

    // Set secure HttpOnly session cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token
    });
  } catch (error) {
    next(error);
  }
};

// Login API
export const login = async (req, res, next) => {
  try {
    const { email, password, cartItems } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // Lockout verification checks
    if (user && user.cooldownUntil && user.cooldownUntil > new Date()) {
      return res.status(429).json({
        message: `Account is temporarily locked due to repeated login failures. Please try again after ${user.cooldownUntil.toLocaleTimeString()}.`
      });
    }

    if (user && (await bcrypt.compare(String(password), user.password))) {
      logEvent('info', 'AUTH', `User logged in: ${user.email}`);

      // Reset login lock counters
      user.failedAttempts = 0;
      user.cooldownUntil = null;
      await user.save();

      // Merge local storage cart into DB cart upon login
      if (cartItems) {
        await mergeCarts(user._id, cartItems);
      }

      const token = generateToken(user._id, user.authSalt);

      // Set secure HttpOnly session cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token
      });
    } else {
      // Apply brute-force counter updates on match failures
      if (user) {
        user.failedAttempts = (user.failedAttempts || 0) + 1;
        if (user.failedAttempts >= 5) {
          user.cooldownUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minute lock
          user.failedAttempts = 0;
          logEvent('warn', 'AUTH_LOCKOUT', `User account ${user.email} locked for 15 minutes due to 5 consecutive login failures.`);
        }
        await user.save();
      }
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// Validate Token Check
export const getMe = async (req, res) => {
  res.json(req.user);
};

// Logout API (active session revocation)
export const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      // Invalidate current JWT signatures globally by changing user's salt
      user.authSalt = Math.random().toString(36).substring(2);
      await user.save();
      logEvent('info', 'AUTH_LOGOUT', `User logged out and session revoked: ${user.email}`);
    }
    
    // Clear HttpOnly cookie on client side
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully, session revoked.' });
  } catch (error) {
    next(error);
  }
};

// Forgot Password API (Simulates email recovery link generation)
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (user) {
      // Generate a short-lived recovery token containing user ID
      const resetToken = jwt.sign(
        { id: user._id, type: 'reset', currentSalt: user.authSalt },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const resetLink = `http://localhost:5173/reset-password.html?token=${resetToken}`;
      
      // Send simulation email
      sendCustomerEmail(
        user.email,
        'Reset Your Password',
        `Hi ${user.name},\n\nYou requested a password reset. Please use the following link within 15 minutes to reset your credentials:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`
      );
      logEvent('info', 'AUTH_FORGOT_PASSWORD', `Password reset token generated and simulation-sent for ${user.email}`);
    }

    // Generic response to mitigate email enumeration
    res.json({
      success: true,
      message: 'If the email address is registered on our platform, a recovery link has been dispatched.'
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password API (Processes token validation and resets credentials)
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // 1. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired recovery token.' });
    }

    if (decoded.type !== 'reset') {
      return res.status(400).json({ message: 'Invalid recovery token type.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.authSalt !== decoded.currentSalt) {
      return res.status(400).json({ message: 'This recovery link has expired or has already been used.' });
    }

    // 2. Enforce complexity policy check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, and one number.' });
    }

    // 3. Update password and rotate authSalt (to revoke active tokens)
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.authSalt = Math.random().toString(36).substring(2);
    await user.save();

    logEvent('info', 'AUTH_RESET_PASSWORD', `Password successfully reset for user: ${user.email}`);
    res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
