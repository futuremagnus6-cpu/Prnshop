import apiClient from './client';

export const customerApi = {
  getAll: (params) => apiClient.get('/customers', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/customers/${id}`).then((r) => r.data),
  getByCustomerId: (customerId) => apiClient.get(`/customers/id/${customerId}`).then((r) => r.data),
  create: (data) => apiClient.post('/customers', data).then((r) => r.data),
  update: (id, data) => apiClient.put(`/customers/${id}`, data).then((r) => r.data),
  delete: (id) => apiClient.delete(`/customers/${id}`).then((r) => r.data),
};
