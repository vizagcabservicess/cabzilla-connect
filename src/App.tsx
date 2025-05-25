import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastToaster } from "@/components/ui/toaster";
import { AuthProvider } from './providers/AuthProvider';
import router from './routes';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleMapsProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
          <RouterProvider router={router} />
          <Toaster />
          <ToastToaster />
        </GoogleMapsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
