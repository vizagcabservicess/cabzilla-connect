
import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './lib/fonts';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

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
