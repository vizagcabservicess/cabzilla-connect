
import { createBrowserRouter } from 'react-router-dom';
import Index from './pages/Index';
import CabsPage from './pages/CabsPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import NotFound from './pages/NotFound';
import ToursPage from './pages/ToursPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BookingEditPage from './pages/BookingEditPage';
import ReceiptPage from './pages/ReceiptPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/cabs/:tripType?',
    element: <CabsPage />,
  },
  {
    path: '/booking-confirmation',
    element: <BookingConfirmationPage />,
  },
  {
    path: '/tours',
    element: <ToursPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  // IMPORTANT: Multiple route patterns for booking edit for better compatibility
  {
    path: '/booking/:id/edit',
    element: <BookingEditPage />,
  },
  {
    path: '/booking/edit/:id',
    element: <BookingEditPage />,
  },
  {
    path: '/book/edit/:id',
    element: <BookingEditPage />,
  },
  // Multiple route patterns for receipts
  {
    path: '/receipt/:id',
    element: <ReceiptPage />,
  },
  {
    path: '/booking/:id/receipt',
    element: <ReceiptPage />,
  },
  {
    path: '/booking/receipt/:id',
    element: <ReceiptPage />,
  },
  {
    path: '/booking/:id',
    element: <ReceiptPage />,
  },
  // CRITICAL FIX: Add explicit cancel routes
  {
    path: '/booking/:id/cancel',
    element: <DashboardPage />,
  },
  {
    path: '/booking/cancel/:id',
    element: <DashboardPage />,
  },
  {
    path: '/admin',
    element: <AdminDashboardPage />,
  },
  {
    path: '/admin/drivers',
    element: <AdminDashboardPage />,
  },
  {
    path: '/admin/customers',
    element: <AdminDashboardPage />,
  },
  {
    path: '/admin/reports',
    element: <AdminDashboardPage />,
  },
  {
    path: '/admin/pricing',
    element: <AdminDashboardPage />,
  },
  {
    path: '/admin/notifications',
    element: <AdminDashboardPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
