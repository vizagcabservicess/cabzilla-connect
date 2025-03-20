
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import NotFound from './pages/NotFound';
import Index from './pages/Index';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import BookingEditPage from './pages/BookingEditPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ReceiptPage from './pages/ReceiptPage';
import ToursPage from './pages/ToursPage';
import CabsPage from './pages/CabsPage';
import VehiclePage from './pages/admin/vehicles';
import MapDebugPage from './pages/MapDebugPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
    errorElement: <NotFound />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/signup',
    element: <SignupPage />
  },
  {
    path: '/dashboard',
    element: <DashboardPage />
  },
  {
    path: '/booking-confirmation',
    element: <BookingConfirmationPage />
  },
  {
    path: '/edit-booking/:id',
    element: <BookingEditPage />
  },
  {
    path: '/admin',
    element: <AdminDashboardPage />
  },
  {
    path: '/admin/vehicles',
    element: <VehiclePage />
  },
  {
    path: '/receipt/:id',
    element: <ReceiptPage />
  },
  {
    path: '/tours',
    element: <ToursPage />
  },
  {
    path: '/cabs',
    element: <CabsPage />
  },
  {
    path: '/map-debug',
    element: <MapDebugPage />
  }
]);

export default router;
