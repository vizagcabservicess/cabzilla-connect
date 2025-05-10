
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
    console.log('✅ Google Maps API detected on initialization');
  } else {
    console.warn('⚠️ Google Maps API not detected on initialization, waiting for script to load');
  }
};

// Start with a clean check
setTimeout(checkGoogleMaps, 500);

// Event listener to detect when Google Maps loads
window.addEventListener('load', () => {
  const googleMapsInterval = setInterval(() => {
    if (window.google && window.google.maps) {
      console.log('✅ Google Maps API confirmed loaded');
      clearInterval(googleMapsInterval);
      // Dispatch an event to notify components that Google Maps is loaded
      window.dispatchEvent(new Event('google-maps-loaded'));
    }
  }, 1000);
  
  // Stop checking after 10 seconds to avoid infinite checking
  setTimeout(() => {
    clearInterval(googleMapsInterval);
  }, 10000);
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Log for debugging
console.log('Application initialized successfully');
