
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// More detailed application initialization logging
console.log('Application initializing...');
console.log('Current path:', window.location.pathname);
console.log('Base URL:', document.baseURI);
console.log('Environment:', import.meta.env.MODE);

// Get initial route info if provided by server-side rendering
const initialRoute = window.__initialRoute || {
  path: window.location.pathname,
  isAdmin: window.location.pathname.startsWith('/admin')
};

console.log('Initial route data:', initialRoute);

// Check if we're on an admin route
if (initialRoute.isAdmin) {
  console.log('Initializing admin panel view - path:', initialRoute.path);
  document.title = 'Admin Dashboard - Vizag Cabs';
} else {
  console.log('Initializing regular customer view - path:', initialRoute.path);
}

// Mount the app with React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Log for debugging
console.log('Application rendered successfully');

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
