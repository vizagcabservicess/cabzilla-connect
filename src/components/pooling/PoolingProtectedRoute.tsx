
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { Loader2 } from 'lucide-react';

<<<<<<< HEAD
export const PoolingProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = usePoolingAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
=======
interface PoolingProtectedRouteProps {
  requiredRole?: 'guest' | 'provider' | 'admin';
}

export const PoolingProtectedRoute: React.FC<PoolingProtectedRouteProps> = ({ requiredRole }) => {
  const { isAuthenticated, user, loading } = usePoolingAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
>>>>>>> 5b221e5e (fixed pooling and home, admin pages)
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/pooling/auth" replace />;
  }

<<<<<<< HEAD
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
=======
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/pooling" replace />;
>>>>>>> 5b221e5e (fixed pooling and home, admin pages)
  }

  return <Outlet />;
};
<<<<<<< HEAD
=======

export const PoolingGuestRoute = () => (
  <PoolingProtectedRoute requiredRole="guest" />
);

export const PoolingProviderRoute = () => (
  <PoolingProtectedRoute requiredRole="provider" />
);

export const PoolingAdminRoute = () => (
  <PoolingProtectedRoute requiredRole="admin" />
);
>>>>>>> 5b221e5e (fixed pooling and home, admin pages)
