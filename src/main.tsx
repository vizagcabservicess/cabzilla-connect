
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Log application initialization
console.log('Application initializing...');

// Mount the app with React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root')!);

// Check if Google Maps is available
const checkGoogleMaps = () => {
  if (window.google && window.google.maps) {
    console.log('Google Maps API detected on initialization');
  } else {
    console.warn('Google Maps API not detected on initialization, waiting for script to load');
  }
};

// Start with a clean check
setTimeout(checkGoogleMaps, 500);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Add a periodic check for Google Maps availability
setTimeout(() => {
  if (window.google && window.google.maps) {
    console.log('Google Maps API confirmed loaded');
  } else {
    console.warn('Google Maps API may not be available - check network requests');
  }
}, 3000);

// Log for debugging
console.log('Application initialized successfully');
