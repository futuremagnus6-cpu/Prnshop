import apiClient from './client';

export const alertApi = {
  getAll: (params) => apiClient.get('/alerts', { params }).then((r) => r.data),
  markRead: (id) => apiClient.put(`/alerts/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.put('/alerts/read-all').then((r) => r.data),
  delete: (id) => apiClient.delete(`/alerts/${id}`).then((r) => r.data),
};
