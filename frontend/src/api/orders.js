import apiClient from './client';

export const orderApi = {
  getAll: (params) => apiClient.get('/orders', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/orders/${id}`).then((r) => r.data),
  getMyOrders: () => apiClient.get('/orders/my').then((r) => r.data),
  getPending: () => apiClient.get('/orders/pending').then((r) => r.data),
  getStats: () => apiClient.get('/orders/stats').then((r) => r.data),
  create: (data) => apiClient.post('/orders', data).then((r) => r.data),
  createPOS: (data) => apiClient.post('/orders/pos', data).then((r) => r.data),
  createOnline: (data) => apiClient.post('/orders/online', data).then((r) => r.data),
  updateStatus: (id, status) =>
    apiClient.put(`/orders/${id}/status`, { status }).then((r) => r.data),
  updateShipping: (id, data) =>
    apiClient.put(`/orders/${id}/shipping`, data).then((r) => r.data),
  getPreOrders: (params) => apiClient.get('/orders/pre-orders', { params }).then((r) => r.data),
  confirmPreOrder: (id) => apiClient.put(`/orders/${id}/confirm`).then((r) => r.data),
  updatePreOrder: (id, data) => apiClient.put(`/orders/${id}/pre-order`, data).then((r) => r.data),
  checkTransactionId: (txnId) => apiClient.get(`/orders/check-transaction/${encodeURIComponent(txnId)}`).then((r) => r.data),
};

export const ordersApi = orderApi;
