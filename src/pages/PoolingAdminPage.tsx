
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { AdminDashboard } from '@/components/pooling/AdminDashboard';

export default function PoolingAdminPage() {
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

  if (user?.role !== 'admin') {
    return <Navigate to="/pooling" replace />;
  }

  return <AdminDashboard />;
}
