import apiClient from './client';

export const feedbackApi = {
  create: (data) => apiClient.post('/feedback', data).then((r) => r.data),
  getAll: (params) => apiClient.get('/feedback', { params }).then((r) => r.data),
  markRead: (id) => apiClient.put(`/feedback/${id}/read`).then((r) => r.data),
  delete: (id) => apiClient.delete(`/feedback/${id}`).then((r) => r.data),
};
