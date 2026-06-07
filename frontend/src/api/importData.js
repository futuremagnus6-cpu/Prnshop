import apiClient from './client';

export const importApi = {
  importProducts: (url) => apiClient.post('/import/products', { url }).then((r) => r.data),
  importFile: (formData) =>
    apiClient.post('/import/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
};
