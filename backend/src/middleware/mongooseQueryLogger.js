/**
 * Mongoose Plugin: Query Performance Logger
 *
 * Logs slow queries and, in development, all queries with their execution time.
 * Helps identify N+1 problems, missing indexes, and inefficient aggregations.
 */

const logger = require('../utils/logger');

const SLOW_QUERY_THRESHOLD_MS = 100;
const CRITICAL_QUERY_THRESHOLD_MS = 1000;

const mongooseQueryLogger = (schema) => {
  // Track query execution times
  schema.pre('find', function () {
    this._startTime = Date.now();
  });

  schema.post('find', function (result) {
    const duration = Date.now() - this._startTime;
    logQuery('find', this, duration, result?.length);
  });

  schema.pre('findOne', function () {
    this._startTime = Date.now();
  });

  schema.post('findOne', function (result) {
    const duration = Date.now() - this._startTime;
    logQuery('findOne', this, duration, result ? 1 : 0);
  });

  schema.pre('countDocuments', function () {
    this._startTime = Date.now();
  });

  schema.post('countDocuments', function (count) {
    const duration = Date.now() - this._startTime;
    logQuery('countDocuments', this, duration, count);
  });

  schema.pre('aggregate', function () {
    this._startTime = Date.now();
  });

  schema.post('aggregate', function (result) {
    const duration = Date.now() - this._startTime;
    logQuery('aggregate', this, duration, result?.length);
  });

  schema.pre('insertMany', function () {
    this._startTime = Date.now();
  });

  schema.post('insertMany', function (result) {
    const duration = Date.now() - this._startTime;
    logQuery('insertMany', this, duration, Array.isArray(result) ? result.length : 1);
  });
};

function logQuery(operation, query, durationMs, resultCount) {
  const collectionName = query.mongooseCollection?.name || 'unknown';

  // Extract query conditions (sanitized)
  const conditions = query.getQuery ? sanitizeQuery(query.getQuery()) : {};

  // Build log context
  const logContext = {
    operation,
    collection: collectionName,
    duration: `${durationMs}ms`,
    conditions,
    resultCount: resultCount ?? 'N/A',
  };

  // Get the stack trace for deep debugging (truncated)
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    const stack = new Error().stack?.split('\n').slice(3, 8).join(' | ') || '';
    logContext.stack = stack;
  }

  if (durationMs >= CRITICAL_QUERY_THRESHOLD_MS) {
    logger.error('Critical slow database query', logContext);
  } else if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
    logger.warn('Slow database query', logContext);
  } else if (process.env.NODE_ENV !== 'production') {
    logger.debug('Database query', logContext);
  }
}

/**
 * Sanitize query conditions to remove sensitive fields and limit size
 */
function sanitizeQuery(query) {
  if (!query || typeof query !== 'object') return query;

  const sensitiveKeys = ['password', 'token', 'secret'];
  const sanitized = {};
  let count = 0;

  for (const [key, value] of Object.entries(query)) {
    if (count >= 10) break; // Limit to 10 fields
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
      count++;
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = typeof value === 'string' && value.length > 100
        ? value.substring(0, 100) + '...'
        : value;
    }
    count++;
  }

  return sanitized;
}

module.exports = mongooseQueryLogger;
