
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Log application initialization
console.log('Application initializing...');

// Mount the app with React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root')!);

// Simplified initialization log for Google Maps status
if (window.google && window.google.maps) {
  console.log('✅ Google Maps API already loaded on initialization');
} else {
  console.log('⚠️ Google Maps API not detected on initialization, will be loaded via callback');
}

// Render the app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Log for debugging
console.log('Application initialized successfully');
