import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { GoogleMapsProvider } from './providers/GoogleMapsProvider'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleMapsProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <RouterProvider router={router} />
    </GoogleMapsProvider>
  </React.StrictMode>,
)
