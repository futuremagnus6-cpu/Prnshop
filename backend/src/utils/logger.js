const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format with timestamp and structured JSON
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Sanitize sensitive data from logs
const sanitize = winston.format((info) => {
  if (info.body) {
    info.body = sanitizeObject(info.body);
  }
  if (info.headers) {
    if (info.headers.authorization) info.headers.authorization = '[REDACTED]';
    if (info.headers['x-auth-token']) info.headers['x-auth-token'] = '[REDACTED]';
    if (info.headers.cookie) info.headers.cookie = '[REDACTED]';
  }
  if (info.query && info.query.token) info.query.token = '[REDACTED]';
  return info;
});

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'creditCard', 'cvv', 'ssn'];
  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  return sanitized;
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(sanitize()),
  transports: [
    // Console transport - colorized for dev, plain for prod
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? jsonFormat
        : winston.format.combine(winston.format.colorize(), logFormat),
    }),

    // File transports
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),

    // Performance metrics log (separate file for easy analysis)
    new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      format: jsonFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
      tailable: true,
    }),
  ],
  // Don't exit on uncaught errors - let the error handler deal with them
  exitOnError: false,
});

// Create a stream object for Morgan integration
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Development helper - log to console with full detail in dev
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Logger initialized in development mode');
}

module.exports = logger;
