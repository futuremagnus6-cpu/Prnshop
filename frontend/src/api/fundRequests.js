import apiClient from './client';

export const fundRequestApi = {
  getAll: (params) => apiClient.get('/fund-requests', { params }).then((r) => r.data),
  getMy: (params) => apiClient.get('/fund-requests/my', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/fund-requests/${id}`).then((r) => r.data),
  create: (formData) =>
    apiClient.post('/fund-requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  update: (id, formData) =>
    apiClient.put(`/fund-requests/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  updateStatus: (id, data) => apiClient.patch(`/fund-requests/${id}/status`, data).then((r) => r.data),
  delete: (id) => apiClient.delete(`/fund-requests/${id}`).then((r) => r.data),
  downloadProof: (id) => apiClient.get(`/fund-requests/${id}/proof`).then((r) => r.data),
  exportCsv: (params) =>
    apiClient.get('/fund-requests/export/csv', { params, responseType: 'blob' }).then((r) => r.data),
};
