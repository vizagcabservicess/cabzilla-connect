
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { GoogleMapsProvider } from '@/providers/GoogleMapsProvider';
import GuestDashboard from '@/components/pooling/GuestDashboard';

// Use the actual API key that's already being used in the system
const GOOGLE_MAPS_API_KEY = 'AIzaSyDqhYmgEp_DafM1jKJ8XHTgEdLXCg-fGy4';

export default function GuestDashboardPage() {
  const { user, isAuthenticated, isLoading } = usePoolingAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/pooling/login" replace />;
  }

  if (user?.role !== 'guest') {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'provider') {
      return <Navigate to="/pooling/provider" replace />;
    }
    if (user?.role === 'admin') {
      return <Navigate to="/pooling/admin" replace />;
    }
    return <Navigate to="/pooling" replace />;
  }

  return (
    <GoogleMapsProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <GuestDashboard />
    </GoogleMapsProvider>
  );
}
