import apiClient from './client';

export const cartApi = {
  getCart: () => apiClient.get('/cart').then((r) => r.data),
  syncCart: (items) => apiClient.put('/cart', { items }).then((r) => r.data),
  clearCart: () => apiClient.delete('/cart').then((r) => r.data),
};
