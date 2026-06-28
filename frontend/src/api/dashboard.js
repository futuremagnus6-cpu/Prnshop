import apiClient from './client';

export const dashboardApi = {
  getStats: () => apiClient.get('/dashboard').then((r) => r.data),
};
