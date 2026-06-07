import apiClient from './client';

export const dealerApi = {
  getAll: (params) => apiClient.get('/dealers', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/dealers/${id}`).then((r) => r.data),
  create: (data) => apiClient.post('/dealers', data).then((r) => r.data),
  update: (id, data) => apiClient.put(`/dealers/${id}`, data).then((r) => r.data),
  delete: (id) => apiClient.delete(`/dealers/${id}`).then((r) => r.data),
};
