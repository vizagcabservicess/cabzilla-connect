
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { GuestDashboard } from '@/components/pooling/guest/GuestDashboard';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { Loader2 } from 'lucide-react';

export default function PoolingGuestDashboardPage() {
  const { user, isAuthenticated, loading } = usePoolingAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'guest') {
    return <Navigate to="/pooling/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <GuestDashboard />
      </div>
    </div>
  );
}
