import React from 'react';

/**
 * Frontend Performance Monitoring Utility
 *
 * Tracks:
 * - API call durations and error rates
 * - Page/component render times via User Timing API
 * - Resource loading performance
 * - Client-side errors
 * - Navigation timings
 *
 * Reports to backend monitoring endpoint when available.
 */

const REPORT_INTERVAL = 120000; // Report every 120 seconds (was 60s)
const MAX_BUFFERED_EVENTS = 100; // Max buffered events (was 200)

class FrontendMonitor {
  constructor() {
    this.events = [];
    this.apiMetrics = { count: 0, errors: 0, totalTime: 0, times: [] };
    this.renderMetrics = {};
    this.startTime = performance.now();
    this.initialized = false;
  }

  /**
   * Initialize monitoring - call once at app startup
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Report metrics periodically
    setInterval(() => this.report(), REPORT_INTERVAL);

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.trackEvent('error', {
        type: 'unhandled',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('error', {
        type: 'promise_rejection',
        message: event.reason?.message || String(event.reason),
      });
    });

    // Capture navigation timing on page unload
    if (document.readyState === 'complete') {
      this.captureNavigationTiming();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.captureNavigationTiming(), 0);
      });
    }

    // Monitor long tasks (blocking main thread > 50ms)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackEvent('long_task', {
              duration: Math.round(entry.duration),
              startTime: Math.round(entry.startTime),
              name: entry.name,
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // PerformanceObserver not supported
      }

      // Monitor Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            this.trackEvent('lcp', {
              value: Math.round(lastEntry.startTime),
              size: lastEntry.size,
              url: lastEntry.url?.substring(0, 200),
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }

      // Monitor First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackEvent('fid', {
              value: Math.round(entry.processingStart - entry.startTime),
              type: 'first-input',
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported
      }
    }
  }

  /**
   * Track an API call
   */
  trackApiCall(method, url, statusCode, durationMs) {
    this.apiMetrics.count++;
    this.apiMetrics.totalTime += durationMs;
    this.apiMetrics.times.push(durationMs);

    if (statusCode >= 400) {
      this.apiMetrics.errors++;
    }

    this.trackEvent('api', {
      method,
      url: url?.substring(0, 200),
      statusCode,
      duration: `${Math.round(durationMs)}ms`,
    });
  }

  /**
   * Track component render time using React profiler or User Timing API
   */
  startRender(name) {
    const key = `render_${name}`;
    performance.mark(`${key}_start`);
  }

  endRender(name) {
    const key = `render_${name}`;
    try {
      performance.mark(`${key}_end`);
      performance.measure(key, `${key}_start`, `${key}_end`);
      const entries = performance.getEntriesByName(key);
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        if (!this.renderMetrics[name]) {
          this.renderMetrics[name] = { count: 0, totalTime: 0, maxTime: 0 };
        }
        this.renderMetrics[name].count++;
        this.renderMetrics[name].totalTime += duration;
        this.renderMetrics[name].maxTime = Math.max(this.renderMetrics[name].maxTime, duration);

        this.trackEvent('render', {
          component: name,
          duration: `${Math.round(duration)}ms`,
        });
      }
      performance.clearMarks(`${key}_start`);
      performance.clearMarks(`${key}_end`);
      performance.clearMeasures(key);
    } catch (e) {
      // Performance API not available
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(category, data = {}) {
    this.events.push({
      category,
      data,
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
    });

    // Trim buffer
    if (this.events.length > MAX_BUFFERED_EVENTS) {
      this.events.splice(0, this.events.length - MAX_BUFFERED_EVENTS);
    }
  }

  /**
   * Capture Navigation Timing metrics
   */
  captureNavigationTiming() {
    if (!performance.getEntriesByType) return;

    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      this.trackEvent('navigation', {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
        load: Math.round(nav.loadEventEnd),
        domInteractive: Math.round(nav.domInteractive),
        firstByte: Math.round(nav.responseStart - nav.requestStart),
        total: Math.round(nav.loadEventEnd - nav.startTime),
        type: nav.type,
      });
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    const sorted = [...this.apiMetrics.times].sort((a, b) => a - b);
    const uptime = Math.round((performance.now() - this.startTime) / 1000);

    const renderSummary = {};
    for (const [name, data] of Object.entries(this.renderMetrics)) {
      renderSummary[name] = {
        count: data.count,
        avgTime: data.count > 0 ? `${Math.round(data.totalTime / data.count)}ms` : '0ms',
        maxTime: `${Math.round(data.maxTime)}ms`,
      };
    }

    return {
      uptime: `${uptime}s`,
      apiCalls: {
        total: this.apiMetrics.count,
        errors: this.apiMetrics.errors,
        errorRate: this.apiMetrics.count > 0
          ? `${((this.apiMetrics.errors / this.apiMetrics.count) * 100).toFixed(2)}%`
          : '0%',
        avgTime: this.apiMetrics.count > 0
          ? `${Math.round(this.apiMetrics.totalTime / this.apiMetrics.count)}ms`
          : '0ms',
        p95: sorted.length > 0
          ? `${Math.round(sorted[Math.ceil(0.95 * sorted.length) - 1])}ms`
          : '0ms',
      },
      renderPerformance: renderSummary,
      recentEvents: this.events.slice(-20),
    };
  }

  /**
   * Report metrics to the backend monitoring endpoint
   */
  async report() {
    if (this.apiMetrics.count === 0 && this.events.length === 0) return;

    const metrics = this.getMetrics();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/monitoring/client-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          metrics,
          events: this.events.slice(-50), // Last 50 events
          userAgent: navigator.userAgent?.substring(0, 200),
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Clear sent events
        this.events = [];
      }
    } catch {
      // Silently fail - don't disrupt user experience
      this.trackEvent('monitoring_error', { message: 'Failed to report metrics' });
    }
  }
}

// Singleton instance
const frontendMonitor = new FrontendMonitor();

/**
 * Axios interceptor integratio - call from api/client.js
 */
export const createAxiosMonitorInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.request.use((config) => {
    config._monitorStart = performance.now();
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      const duration = performance.now() - (response.config._monitorStart || performance.now());
      frontendMonitor.trackApiCall(
        response.config.method?.toUpperCase(),
        response.config.url,
        response.status,
        duration
      );
      return response;
    },
    (error) => {
      if (error.config) {
        const duration = performance.now() - (error.config._monitorStart || performance.now());
        frontendMonitor.trackApiCall(
          error.config.method?.toUpperCase(),
          error.config.url,
          error.response?.status || 0,
          duration
        );
      }
      return Promise.reject(error);
    }
  );
};

/**
 * React component wrapper for Profiler-like render tracking
 * Note: uses createElement to avoid JSX dependency in .js files
 */
export const withRenderTracking = (Component, name) => {
  const Wrapped = (props) => {
    frontendMonitor.startRender(name);
    // Use requestAnimationFrame to capture render end
    requestAnimationFrame(() => {
      frontendMonitor.endRender(name);
    });
    return React.createElement(Component, props);
  };
  Wrapped.displayName = `Tracked(${name})`;
  return Wrapped;
};

export default frontendMonitor;
