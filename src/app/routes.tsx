
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import VehiclesPage from '@/pages/admin/vehicles';

// Define routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
    children: [],
  },
  {
    path: '/admin',
    element: <AdminDashboardPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/vehicles" replace />,
      },
      {
        path: 'vehicles',
        element: <VehiclesPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export function AppRoutes() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </>
  );
}
