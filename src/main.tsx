
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// More detailed application initialization logging
console.log('Application initializing...');
console.log('Current path:', window.location.pathname);
console.log('Base URL:', document.baseURI);
console.log('Environment:', import.meta.env.MODE);

// Get initial route info from window.__initialRoute or create one if not available
const initialRoute = window.__initialRoute || {
  path: window.location.pathname,
  isAdmin: window.location.pathname.startsWith('/admin'),
  baseUrl: '/',
  timestamp: Date.now(),
  debug: true
};

// Make initial route info available globally
window.__initialRoute = initialRoute;

console.log('Initial route data:', initialRoute);

// Check if we're on an admin route
if (initialRoute.isAdmin) {
  console.log('ADMIN ROUTE DETECTED - initializing admin view');
  document.title = 'Admin Dashboard - Vizag Cabs';
} else {
  console.log('Initializing regular customer view - path:', initialRoute.path);
  document.title = 'Vizag Cabs - Book Cabs in Visakhapatnam';
}

// Mount the app with React 18 createRoot API
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found! Cannot mount React application.');
} else {
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  
  // Log for debugging
  console.log('Application rendered successfully');
}

// Add global type for initialRoute
declare global {
  interface Window {
    __initialRoute?: {
      path: string;
      isAdmin: boolean;
      baseUrl?: string;
      timestamp?: number;
      debug?: boolean;
    };
  }
}
