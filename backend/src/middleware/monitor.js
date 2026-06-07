/**
 * API Performance Monitoring Middleware
 *
 * Tracks:
 * - Request counts per route/method
 * - Response times (min, max, avg, p50, p95, p99)
 * - Error rates per route
 * - Active requests
 * - Slow requests (> threshold)
 */

const logger = require('../utils/logger');

// Metrics store
class MetricsStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
    this.responseTimes = [];
    this.routes = {};
    this.activeRequests = 0;
    this.slowRequests = [];
    this.startTime = Date.now();
    this.lastReset = new Date().toISOString();
  }

  recordRequest(method, path, statusCode, durationMs) {
    this.requestCount++;
    this.totalResponseTime += durationMs;
    this.responseTimes.push(durationMs);
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    const routeKey = `${method} ${path}`;
    if (!this.routes[routeKey]) {
      this.routes[routeKey] = { count: 0, errors: 0, totalTime: 0, times: [] };
    }
    this.routes[routeKey].count++;
    this.routes[routeKey].totalTime += durationMs;
    this.routes[routeKey].times.push(durationMs);

    if (statusCode >= 400) {
      this.errorCount++;
      this.routes[routeKey].errors++;
    }

    // Track slow requests (> 2 seconds)
    if (durationMs > 2000) {
      this.slowRequests.push({
        method,
        path,
        duration: Math.round(durationMs),
        timestamp: new Date().toISOString(),
        statusCode,
      });
      // Keep only last 100 slow requests
      if (this.slowRequests.length > 100) {
        this.slowRequests.shift();
      }

      logger.warn('Slow request detected', {
        method,
        path,
        duration: `${Math.round(durationMs)}ms`,
        statusCode,
      });
    }

    // Log very slow requests (> 5 seconds) - potential performance issue
    if (durationMs > 5000) {
      logger.error('Critical slow request', {
        method,
        path,
        duration: `${Math.round(durationMs)}ms`,
        statusCode,
      });
    }
  }

  startRequest() {
    this.activeRequests++;
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  getMetrics() {
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    const routeMetrics = {};
    for (const [key, data] of Object.entries(this.routes)) {
      const routeSorted = [...data.times].sort((a, b) => a - b);
      routeMetrics[key] = {
        count: data.count,
        errors: data.errors,
        errorRate: data.count > 0 ? `${((data.errors / data.count) * 100).toFixed(2)}%` : '0%',
        avgTime: data.count > 0 ? `${Math.round(data.totalTime / data.count)}ms` : '0ms',
        p95: `${Math.round(this.getPercentile(routeSorted, 95))}ms`,
        p99: `${Math.round(this.getPercentile(routeSorted, 99))}ms`,
      };
    }

    return {
      server: {
        uptime: `${uptime}s`,
        uptimeHuman: this.formatUptime(uptime),
        startTime: new Date(this.startTime).toISOString(),
        lastReset: this.lastReset,
        activeRequests: this.activeRequests,
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate: this.requestCount > 0 ? `${((this.errorCount / this.requestCount) * 100).toFixed(2)}%` : '0%',
        avgResponseTime: this.requestCount > 0 ? `${Math.round(this.totalResponseTime / this.requestCount)}ms` : '0ms',
        p50: `${Math.round(this.getPercentile(sorted, 50))}ms`,
        p95: `${Math.round(this.getPercentile(sorted, 95))}ms`,
        p99: `${Math.round(this.getPercentile(sorted, 99))}ms`,
        max: sorted.length > 0 ? `${Math.max(...sorted)}ms` : '0ms',
        min: sorted.length > 0 ? `${Math.min(...sorted)}ms` : '0ms',
      },
      routes: routeMetrics,
      slowRequests: this.slowRequests.slice(-20), // Last 20 slow requests
    };
  }

  formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }
}

// Singleton metrics store
const metrics = new MetricsStore();

// Reset metrics periodically (every 24 hours)
setInterval(() => {
  logger.info('Auto-resetting metrics store (24h interval)');
  metrics.reset();
}, 24 * 60 * 60 * 1000);

/**
 * Express middleware that tracks request performance
 */
const performanceMonitor = (req, res, next) => {
  metrics.startRequest();
  const start = process.hrtime.bigint();

  // Override end to capture response
  const originalEnd = res.end;
  res.end = function (...args) {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = Math.round(durationNs / 1e6);

    metrics.recordRequest(
      req.method,
      req.originalUrl || req.url,
      res.statusCode,
      durationMs
    );

    // Log request summary to logger
    const logLevel = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
      : 'info';
    logger.log(logLevel, `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${durationMs}ms`, {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${durationMs}ms`,
      userAgent: req.headers['user-agent']?.substring(0, 100),
      ip: req.ip,
    });

    return originalEnd.apply(res, args);
  };

  next();
};

/**
 * GET /api/monitoring/metrics - Expose metrics as JSON
 */
const getMetrics = (_req, res) => {
  res.json(metrics.getMetrics());
};

/**
 * GET /api/monitoring/health - Detailed health check
 */
const getHealth = (req, res) => {
  const m = metrics.getMetrics();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: m.server.uptimeHuman,
    activeRequests: m.server.activeRequests,
    requestCount: m.requests.total,
    errorRate: m.requests.errorRate,
    avgResponseTime: m.requests.avgResponseTime,
  });
};

/**
 * POST /api/monitoring/metrics/reset - Reset metrics
 */
const resetMetrics = (_req, res) => {
  metrics.reset();
  res.json({ message: 'Metrics reset successfully' });
};

module.exports = {
  performanceMonitor,
  getMetrics,
  getHealth,
  resetMetrics,
  metrics, // Exported for testing/integration
};
