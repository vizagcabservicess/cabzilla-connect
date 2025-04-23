
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BookingProvider } from './context/BookingContext'

// Mount the app with React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <BookingProvider>
      <App />
    </BookingProvider>
  </React.StrictMode>,
)

// Log for debugging
console.log('Application initialized successfully');
