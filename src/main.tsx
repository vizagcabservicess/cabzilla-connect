
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Log environment information for debugging
console.log('Application initializing...');
console.log('Current path:', window.location.pathname);
console.log('Base URL:', document.baseURI);

// Mount the app with React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Log for debugging
console.log('Application initialized successfully');
