import apiClient from './client';

export const categoryApi = {
  getAll: (params) => apiClient.get('/categories', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/categories/${id}`).then((r) => r.data),
  create: (data) => apiClient.post('/categories', data).then((r) => r.data),
  update: (id, data) => apiClient.put(`/categories/${id}`, data).then((r) => r.data),
  delete: (id) => apiClient.delete(`/categories/${id}`).then((r) => r.data),
};

export const categoriesApi = categoryApi;
