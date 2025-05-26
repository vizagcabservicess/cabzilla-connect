
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { Loader2 } from 'lucide-react';

export const PoolingProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = usePoolingAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/pooling/auth" replace />;
  }

  return <Outlet />;
};

export const PoolingGuestRoute: React.FC = () => {
  const { user, isAuthenticated, loading } = usePoolingAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'guest') {
    return <Navigate to="/pooling/auth" replace />;
  }

  return <Outlet />;
};
