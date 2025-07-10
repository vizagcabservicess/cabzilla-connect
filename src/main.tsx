
import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './lib/fonts';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

// DEV PATCH: Always set a valid JWT and user in localStorage for testing
if (import.meta.env.MODE === 'development') {
  localStorage.setItem('auth_token', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTIxNTAzNzAsImV4cCI6MTc1MjE1Mzk3MCwidXNlcl9pZCI6OSwiZW1haWwiOiJqb2VsbmFnaXJlZGR5QGdtYWlsLmNvbSIsInJvbGUiOiJzdXBlcl9hZG1pbiJ9.Ru5niRlUx_idt1ChI3l1wufFFMFFyu3yR6P8NGE_iTI');
  localStorage.setItem('user', JSON.stringify({
    id: 9,
    email: "joelnagireddy@gmail.com",
    role: "super_admin"
  }));
}

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
);
