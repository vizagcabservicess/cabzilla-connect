
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import AdminLayout from '@/layouts/AdminLayout';
import VehiclesPage from '@/pages/admin/vehicles';

// Define routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
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
