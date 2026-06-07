import apiClient from './client';

export const monitoringApi = {
  /** Get detailed health check */
  getHealth: async () => {
    const { data } = await apiClient.get('/monitoring/health');
    return data;
  },

  /** Get full performance metrics (admin) */
  getMetrics: async () => {
    const { data } = await apiClient.get('/monitoring/metrics');
    return data;
  },

  /** Reset metrics counters (admin) */
  resetMetrics: async () => {
    const { data } = await apiClient.post('/monitoring/metrics/reset');
    return data;
  },

  /** Get recent logs (admin) */
  getLogs: async (lines = 50) => {
    const { data } = await apiClient.get(`/monitoring/logs?lines=${lines}`);
    return data;
  },

  /** Change log level dynamically (admin) */
  setLogLevel: async (level) => {
    const { data } = await apiClient.put('/monitoring/log-level', { level });
    return data;
  },
};
