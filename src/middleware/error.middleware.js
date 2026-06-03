import { logEvent } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logEvent('error', 'API_ERROR', err.message, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};
