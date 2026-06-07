/**
 * NoSQL Injection Sanitization Middleware
 *
 * Replaces express-mongo-sanitize which is incompatible with Express 5
 * (Express 5 made req.query a getter-only property, so middleware that tries
 * to reassign it crashes with "Cannot set property query").
 *
 * Uses a self-contained sanitizer that works with null-prototype objects
 * (Express 5's req.query uses Object.create(null) which mongo-sanitize
 * skips due to its instanceof Object check).
 *
 * Sanitizes by removing keys starting with '$' (e.g. $gt, $ne, $regex)
 * and flattening keys containing '.' which MongoDB interprets as nested
 * document access.
 */

/**
 * Recursively sanitize an object against NoSQL injection.
 * Removes keys starting with $ and flattens keys containing dots.
 * Works with any object, including null-prototype objects.
 */
function sanitizeObject(input) {
  if (Array.isArray(input)) {
    return input.map(sanitizeObject);
  }

  if (input === null || typeof input !== 'object') {
    return input;
  }

  const result = {};

  for (const key of Object.keys(input)) {
    // Skip keys starting with $ (NoSQL operators like $gt, $ne, $regex)
    if (key.startsWith('$')) {
      continue;
    }

    const value = input[key];

    // Replace dots in keys with underscore (MongoDB interprets dots as nested
    // document access path separators, which can be exploited)
    const sanitizedKey = key.includes('.') ? key.replace(/\./g, '_') : key;

    result[sanitizedKey] = sanitizeObject(value);
  }

  return result;
}

/**
 * Express middleware that sanitizes req.body and req.query
 * against NoSQL injection attacks.
 *
 * req.params is intentionally not sanitized here because it's set by the
 * router after global middleware executes. Apply at the router level if
 * param sanitization is needed.
 */
const mongoSanitize = (req, _res, next) => {
  // req.body is a regular writable property — safe to replace directly
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // req.query is a getter-only property in Express 5 (returns new object
  // on each access) and uses null-prototype objects — we must shadow the
  // getter with a sanitized data property
  try {
    const rawQuery = req.query;
    if (rawQuery && typeof rawQuery === 'object') {
      const sanitized = sanitizeObject(rawQuery);
      Object.defineProperty(req, 'query', {
        value: sanitized,
        writable: false,
        configurable: true,
        enumerable: true,
      });
    }
  } catch {
    // If query getter fails, continue with original behavior
  }

  next();
};

module.exports = { mongoSanitize };
