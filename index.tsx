
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Service Worker is now automatically registered by vite-plugin-pwa (injectRegister: 'auto')
// This ensures reliable detection by PWA scanners.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
