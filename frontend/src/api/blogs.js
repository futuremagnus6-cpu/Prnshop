import apiClient from './client';

export const blogApi = {
  getAll: (params) => apiClient.get('/blogs', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/blogs/${id}`).then((r) => r.data),
  getAdmin: (params) => apiClient.get('/blogs/admin/all', { params }).then((r) => r.data),
  create: (data) => {
    const isFormData = data instanceof FormData;
    return apiClient.post('/blogs', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then((r) => r.data);
  },
  update: (id, data) => {
    const isFormData = data instanceof FormData;
    return apiClient.put(`/blogs/${id}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then((r) => r.data);
  },
  delete: (id) => apiClient.delete(`/blogs/${id}`).then((r) => r.data),
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append('media', file);
    return apiClient.post('/blogs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
