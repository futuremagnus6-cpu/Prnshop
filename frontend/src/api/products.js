import apiClient from './client';

export const productApi = {
  getAll: (params) => apiClient.get('/products', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/products/${id}`).then((r) => r.data),
  getByBarcode: (barcode) => apiClient.get(`/products/barcode/${barcode}`).then((r) => r.data),
  getBestSelling: () => apiClient.get('/products/best-selling').then((r) => r.data),
  getLowStock: () => apiClient.get('/products/low-stock/all').then((r) => r.data),
  getExpiring: () => apiClient.get('/products/expiring/all').then((r) => r.data),
  create: (data) => apiClient.post('/products', data).then((r) => r.data),
  update: (id, data) => apiClient.put(`/products/${id}`, data).then((r) => r.data),
  delete: (id) => apiClient.delete(`/products/${id}`).then((r) => r.data),
  updateStock: (id, quantity, notes) =>
    apiClient.put(`/products/${id}/stock`, { quantity, notes }).then((r) => r.data),
};
