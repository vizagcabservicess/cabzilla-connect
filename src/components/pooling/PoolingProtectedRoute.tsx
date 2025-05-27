
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { Loader2 } from 'lucide-react';

interface PoolingProtectedRouteProps {
  requiredRole?: 'guest' | 'provider' | 'admin';
}

export const PoolingProtectedRoute: React.FC<PoolingProtectedRouteProps> = ({ requiredRole }) => {
  const { isAuthenticated, user, loading } = usePoolingAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/pooling/auth" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/pooling" replace />;
  }

  return <Outlet />;
};

export const PoolingGuestRoute = () => (
  <PoolingProtectedRoute requiredRole="guest" />
);

export const PoolingProviderRoute = () => (
  <PoolingProtectedRoute requiredRole="provider" />
);

export const PoolingAdminRoute = () => (
  <PoolingProtectedRoute requiredRole="admin" />
);
