import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { setLogoutCallback } from './api/client';
import { logoutUser } from './store/slices/authSlice';
import frontendMonitor, { createAxiosMonitorInterceptor } from './utils/monitor';
import apiClient from './api/client';
import './index.css';

// Inject logout callback to avoid circular dependency in api/client.js
setLogoutCallback(() => {
  store.dispatch(logoutUser());
});

// Initialize frontend performance monitoring
frontendMonitor.init();

// Hook axios monitoring interceptor
createAxiosMonitorInterceptor(apiClient);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
