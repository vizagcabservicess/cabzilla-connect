
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import AdminLayout from '@/layouts/AdminLayout';
import VehiclesPage from '@/pages/admin/vehicles';
import DashboardPage from '@/pages/DashboardPage';
import BookingConfirmationPage from '@/pages/BookingConfirmationPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';

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
      {
        path: 'bookings',
        element: <DashboardPage />,
      },
      {
        path: 'financials',
        element: <AdminDashboardPage />,
      },
      {
        path: 'reports',
        element: <AdminDashboardPage />,
      },
      {
        path: 'users',
        element: <AdminDashboardPage />,
      },
      {
        path: 'drivers',
        element: <AdminDashboardPage />,
      },
      {
        path: 'customers',
        element: <AdminDashboardPage />,
      },
      {
        path: 'notifications',
        element: <AdminDashboardPage />,
      },
      {
        path: 'settings',
        element: <AdminDashboardPage />,
      },
    ],
  },
  {
    path: '/booking-confirmation/:id',
    element: <BookingConfirmationPage />,
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
