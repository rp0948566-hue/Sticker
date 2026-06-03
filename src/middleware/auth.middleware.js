import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
  }
  return cookies;
};

export const protect = async (req, res, next) => {
  let token;
  const cookies = parseCookies(req.headers.cookie);
  
  if (cookies.token) {
    token = cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || req.user.authSalt !== decoded.authSalt) {
      return res.status(401).json({ message: 'Not authorized, session expired or invalidated' });
    }
    return next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};
