import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './utils/globalErrorHandler'; // Initialize global error handler

// Note: Consent mode is initialized in index.html with default granted state
// This is intentional for production environment

// DEV PATCH: Always set a valid JWT and user in localStorage for testing
if (import.meta.env.MODE === 'development') {
  const devToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTIxNTAzNzAsImV4cCI6MTc1MjE1Mzk3MCwidXNlcl9pZCI6OSwiZW1haWwiOiJqb2VsbmFnaXJlZGR5QGdtYWlsLmNvbSIsInJvbGUiOiJzdXBlcl9hZG1pbiJ9.Ru5niRlUx_idt1ChI3l1wufFFMFFyu3yR6P8NGE_iTI';
  const devUser = {
    id: 9,
    email: "joelnagireddy@gmail.com",
    role: "super_admin"
  };
  
  localStorage.setItem('auth_token', devToken);
  localStorage.setItem('user', JSON.stringify(devUser));
  
  // Also set the token in authAPI instance
  import('./services/api/authAPI').then(({ authAPI }) => {
    authAPI.setToken(devToken);
  });
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

// Load fonts after first paint so they don't block FCP (critical CSS uses system font)
const loadFontsAfterPaint = () => {
  const cb = () => import('./lib/fonts');
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 1);
  }
};
loadFontsAfterPaint();
