
import { createBrowserRouter } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import CabsPage from './pages/CabsPage';
import ToursPage from './pages/ToursPage';
import BookingEditPage from './pages/BookingEditPage';
import ReceiptPage from './pages/ReceiptPage';
import AdminDatabasePage from './pages/AdminDatabasePage';

// Create routes with proper nesting and path handling
export const router = createBrowserRouter([
  // Main frontend routes
  {
    path: '/',
    element: <Index />,
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
  {
    path: '/booking/:bookingId/confirmation',
    element: <BookingConfirmationPage />,
  },
  {
    path: '/booking-confirmation',
    element: <BookingConfirmationPage />,
  },
  {
    path: '/booking/:bookingId/edit',
    element: <BookingEditPage />,
  },
  {
    path: '/receipt/:bookingId',
    element: <ReceiptPage />,
  },
  {
    path: '/cabs',
    element: <CabsPage />,
  },
  {
    path: '/tours',
    element: <ToursPage />,
  },
  
  // Admin routes - exact match for root admin route
  {
    path: '/admin',
    element: <AdminDashboardPage />,
  },
  
  // Specific admin routes - these must come before the catch-all
  {
    path: '/admin/database',
    element: <AdminDatabasePage />,
  },
  
  // Catch-all for admin nested routes
  {
    path: '/admin/*',
    element: <AdminDashboardPage />,
  },
  
  // Global 404 - must be last
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
