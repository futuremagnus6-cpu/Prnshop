const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getMetrics, getHealth, resetMetrics, metrics } = require('../middleware/monitor');
const logger = require('../utils/logger');

const router = express.Router();

// Detailed health check - authenticated users
router.get('/health', authenticate, getHealth);

// Full metrics - admin only
router.get('/metrics', authenticate, authorize('admin', 'superadmin'), getMetrics);

// Reset metrics - admin only
router.post('/metrics/reset', authenticate, authorize('admin', 'superadmin'), resetMetrics);

// Accept client-side metrics reports (lightweight, no auth required, rate-limited via general limiter)
router.post('/client-metrics', (req, res) => {
  try {
    // Reject oversized payloads (protect against abuse)
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > 102400) { // 100KB max
      logger.warn('Oversized client metrics payload rejected', { size: contentLength });
      return res.status(413).json({ message: 'Payload too large' });
    }

    const { metrics: clientMetrics, events, userAgent, screenSize } = req.body;

    if (!clientMetrics) {
      return res.status(400).json({ message: 'No metrics data provided' });
    }

    // Log client-side metrics
    logger.info('Client metrics report', {
      uptime: clientMetrics.uptime,
      apiCalls: clientMetrics.apiCalls,
      renderPerformance: clientMetrics.renderPerformance,
      userAgent: userAgent?.substring(0, 150),
      screenSize,
    });

    // Log any critical client-side errors
    if (events && Array.isArray(events)) {
      const errors = events.filter((e) => e.category === 'error');
      for (const err of errors) {
        logger.warn('Client-side error', {
          message: err.data?.message,
          url: err.url,
          timestamp: err.timestamp,
        });
      }

      const longTasks = events.filter((e) => e.category === 'long_task');
      for (const task of longTasks) {
        if (task.data?.duration > 500) {
          logger.warn('Client long task detected', {
            duration: task.data.duration,
            url: task.url,
          });
        }
      }
    }

    res.json({ accepted: true });
  } catch (error) {
    logger.error('Failed to process client metrics', { error: error.message });
    res.status(500).json({ message: 'Failed to process metrics' });
  }
});

// Log level control - admin only (useful for debugging production issues)
router.put('/log-level', authenticate, authorize('admin', 'superadmin'), (req, res) => {
  const { level } = req.body;
  const validLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLevels.includes(level)) {
    return res.status(400).json({ message: `Invalid level. Valid: ${validLevels.join(', ')}` });
  }
  logger.level = level;
  logger.info(`Log level changed to: ${level}`);
  res.json({ message: `Log level changed to ${level}`, level });
});

// Recent log tail (last N lines from combined.log) - admin only
router.get('/logs', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.resolve(__dirname, '../../logs/combined.log');
    const lines = parseInt(req.query.lines) || 50;
    const maxLines = Math.min(lines, 500);

    if (!fs.existsSync(logFile)) {
      return res.json({ logs: [], source: 'combined.log', lines: 0 });
    }

    const data = fs.readFileSync(logFile, 'utf8');
    const allLines = data.split('\n').filter(Boolean);
    const recentLines = allLines.slice(-maxLines).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { message: line };
      }
    });

    res.json({
      logs: recentLines,
      source: 'combined.log',
      lines: recentLines.length,
      totalLinesInFile: allLines.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to read logs' });
  }
});

module.exports = router;
