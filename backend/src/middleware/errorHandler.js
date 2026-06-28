const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  // Build structured error context
  const errorContext = {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      userAgent: req.headers?.['user-agent']?.substring(0, 150),
    },
    user: req.user ? { id: req.user.id, role: req.user.role } : undefined,
  };

  // Add request body for validation errors (sanitized)
  if (err.name === 'ValidationError' && req.body) {
    const allowedFields = ['email', 'name', 'phone', 'address', 'role', 'category', 'price', 'stock', 'description'];
    errorContext.body = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        errorContext.body[field] = req.body[field];
      }
    }
  }

  // Log with appropriate level
  if (err.statusCode >= 500) {
    logger.error('Internal server error', errorContext);
  } else if (err.statusCode >= 400) {
    logger.warn('Client error', errorContext);
  } else {
    logger.info('Request error', errorContext);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `${field} already exists.` });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format.' });
  }

  // Multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired.' });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
