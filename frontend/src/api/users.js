import apiClient from './client';

export const userApi = {
  getUsers: (params) => apiClient.get('/users', { params }).then((r) => r.data),
  getUserById: (id) => apiClient.get(`/users/${id}`).then((r) => r.data),
  createManager: (data) => apiClient.post('/users/create-manager', data).then((r) => r.data),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data).then((r) => r.data),
  deleteUser: (id) => apiClient.delete(`/users/${id}`).then((r) => r.data),
};
