import apiClient from './client';

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data).then((r) => r.data),
  login: (data) => apiClient.post('/auth/login', data).then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  getMe: () => apiClient.get('/auth/me').then((r) => r.data),
  verifyEmail: (token) => apiClient.get(`/auth/verify-email/${token}`).then((r) => r.data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, password) =>
    apiClient.post(`/auth/reset-password/${token}`, { password }).then((r) => r.data),
  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh-token', { refreshToken }).then((r) => r.data),
  updateProfile: (data) => apiClient.put('/auth/update-profile', data).then((r) => r.data),
  changePassword: (data) => apiClient.put('/auth/change-password', data).then((r) => r.data),
};
