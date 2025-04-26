
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('Application initializing...');
console.log('Current path:', window.location.pathname);
console.log('Environment:', import.meta.env.MODE);

// Get route info from window.__initialRoute or create it if not available
// This ensures we always have route data even if index.html script didn't run
const initialRoute = window.__initialRoute || {
  path: window.location.pathname,
  isAdmin: window.location.pathname.startsWith('/admin'),
  baseUrl: '/',
  timestamp: Date.now(),
  debug: true
};

// Always store initial route info
window.__initialRoute = initialRoute;
console.log('Initial route data:', initialRoute);

// Set document title based on route
document.title = initialRoute.isAdmin ? 
  'Admin Dashboard - Vizag Cabs' : 
  'Vizag Cabs - Book Cabs in Visakhapatnam';

// Mount app using React 18 createRoot API
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found! Cannot mount React application.');
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    
    console.log('Application rendered successfully');
  } catch (error) {
    console.error('Failed to render application:', error);
    // Attempt recovery by displaying error in DOM directly
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>Application Error</h2>
        <p>Failed to initialize application. Please try refreshing the page.</p>
        <pre style="text-align: left; background: #f1f1f1; padding: 10px;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `;
  }
}

// Add global type definition for initialRoute
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
