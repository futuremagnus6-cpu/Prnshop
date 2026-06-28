import apiClient from './client';

export const paymentApi = {
  getKey: () => apiClient.get('/payments/key').then((r) => r.data),
  createOrder: (data) => apiClient.post('/payments/create-order', data).then((r) => r.data),
  verifyPayment: (data) => apiClient.post('/payments/verify', data).then((r) => r.data),
};

// Load Razorpay checkout script dynamically
export const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });

// Initialize and open Razorpay checkout modal
export const openRazorpayCheckout = async ({ key, amount, orderId, name, description, prefill, theme }) => {
  await loadRazorpayScript();

  const options = {
    key,
    amount,
    currency: 'INR',
    name: name || 'Prandhara Medical Store',
    description: description || 'Medicine & Healthcare Order',
    order_id: orderId,
    prefill: {
      name: prefill?.name || '',
      contact: prefill?.phone || '',
      email: prefill?.email || '',
    },
    theme: {
      color: theme || '#059669',
    },
    modal: {
      ondismiss: () => {
        console.log('Payment modal dismissed');
      },
    },
  };

  return new Promise((resolve, reject) => {
    options.handler = (response) => {
      resolve(response);
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (err) => {
      reject(err);
    });
    rzp.open();
  });
};
