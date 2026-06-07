import axios from 'axios';

// Simple in-memory cache for GET requests
const requestCache = new Map();
const pendingRequests = new Map();

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Add reasonable timeouts
  timeout: 15000,
});

// Track whether we're already refreshing to avoid infinite loops
let isRefreshing = false;
let onLogout = null;

// Function to set the logout callback (called from main.jsx to avoid circular deps)
export const setLogoutCallback = (cb) => {
  onLogout = cb;
};

// Clear the cache (useful after mutations)
export const clearRequestCache = (pattern) => {
  if (!pattern) {
    requestCache.clear();
    return;
  }
  // Clear cache entries matching a URL pattern
  for (const key of requestCache.keys()) {
    if (key.includes(pattern)) {
      requestCache.delete(key);
    }
  }
};

// Cache configuration — TTL is auto-selected based on URL pattern
const CACHE_TTL_DEFAULT = 30000; // 30 seconds default

const getCacheTtl = (url) => {
  if (!url) return CACHE_TTL_DEFAULT;
  if (url.includes('/categories')) return 120000;   // 2min for categories
  if (url.includes('/products') || url.includes('/best-selling')) return 60000; // 60s for products
  if (url.includes('/blogs')) return 60000;          // 60s for blogs
  if (url.includes('/dashboard')) return 30000;     // 30s for dashboard
  return CACHE_TTL_DEFAULT;
};

const getCacheKey = (config) => {
  const { method, url, params } = config;
  if (method !== 'get') return null;
  const paramString = params ? JSON.stringify(params) : '';
  return `${url}|${paramString}`;
};

// Request interceptor to attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for caching and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    const { config } = response;
    if (config.method === 'get' && response.status === 200) {
      const cacheKey = getCacheKey(config);
      if (cacheKey && !config.headers['x-skip-cache']) {
        const ttl = config.headers['x-cache-ttl'] || getCacheTtl(config.url);
        requestCache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
          ttl,
        });
        // Clean up the cache key from pending requests
        pendingRequests.delete(cacheKey);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const cacheKey = originalRequest ? getCacheKey(originalRequest) : null;

    // Clean up pending request
    if (cacheKey) {
      pendingRequests.delete(cacheKey);
    }

    // Skip refresh logic for auth endpoints to prevent infinite 401 loops
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/logout', '/auth/refresh-token', '/auth/forgot-password', '/auth/reset-password'];
    const isAuthEndpoint = authEndpoints.some((endpoint) =>
      originalRequest.url?.includes(endpoint)
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing && !isAuthEndpoint) {
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          onLogout?.();
          return Promise.reject(error);
        }

        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh-token`,
          { refreshToken }
        );
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return apiClient(originalRequest);
      } catch {
        // Clear auth state immediately
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        onLogout?.();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Override the get method to add request deduplication and caching
const originalGet = apiClient.get;
apiClient.get = async (url, config = {}) => {
  // Build a minimal config for cache key
  const cacheConfig = { method: 'get', url, params: config.params };
  const cacheKey = getCacheKey(cacheConfig);

  if (cacheKey) {
    // If skip-cache header is present, bypass the cache
    if (config.headers?.['x-skip-cache']) {
      requestCache.delete(cacheKey);
    } else {
      // Check cache first
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }

      // Deduplicate in-flight requests
      if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
      }
    }
  }

  // Make the actual request
  const promise = originalGet(url, config).catch((err) => {
    // Remove from pending on error
    if (cacheKey) pendingRequests.delete(cacheKey);
    throw err;
  });

  if (cacheKey) {
    pendingRequests.set(cacheKey, promise);
  }

  return promise;
};

export default apiClient;
