
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppLayout from '@/layouts/AppLayout';
import HomePage from '@/pages/home';
import AdminLayout from '@/layouts/AdminLayout';
import BookingPage from '@/pages/bookings';
import VehiclesPage from '@/pages/admin/vehicles';

// Define routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'bookings',
        element: <BookingPage />,
      },
      {
        path: 'admin',
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
        element: <Navigate to="/" replace />,
      },
    ],
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
