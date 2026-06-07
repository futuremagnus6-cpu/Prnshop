import apiClient from './client';

export const storeSettingsApi = {
  get: () => apiClient.get('/store-settings').then((r) => r.data),
  update: (data) => apiClient.put('/store-settings', data).then((r) => r.data),
};
