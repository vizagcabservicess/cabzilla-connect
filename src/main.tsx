import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/fonts';
import './index.css';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './utils/globalErrorHandler'; // Initialize global error handler

// Note: Consent mode is initialized in index.html with default granted state
// This is intentional for production environment

// DEV PATCH: Set a test JWT and user only when VITE_DEV_AUTH is explicitly enabled
// This avoids overriding real auth during development
if (import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_AUTH === 'true') {
  const devToken = import.meta.env.VITE_DEV_AUTH_TOKEN ?? '';
  const devUser = import.meta.env.VITE_DEV_AUTH_USER ? JSON.parse(import.meta.env.VITE_DEV_AUTH_USER) : null;
  if (devToken && devUser) {
    localStorage.setItem('auth_token', devToken);
    localStorage.setItem('user', JSON.stringify(devUser));
    import('./services/api/authAPI').then(({ authAPI }) => authAPI.setToken(devToken));
  }
}

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce unnecessary refetches
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
      retry: 1, // Reduce retry attempts
      refetchOnWindowFocus: false, // Disable refetch on window focus
      refetchOnReconnect: false, // Disable refetch on reconnect
    },
    mutations: {
      retry: 1, // Reduce retry attempts for mutations
    },
  },
});



const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// App is eager so homepage renders as soon as the bundle runs (no second chunk wait)
root.render(
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);
