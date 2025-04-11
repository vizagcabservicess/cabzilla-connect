
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import CabsPage from './pages/CabsPage';
import BookingEditPage from './pages/BookingEditPage';
import ReceiptPage from './pages/ReceiptPage';
import AdminDatabasePage from './pages/AdminDatabasePage';

// Import the useIsMobile hook
import { useIsMobile } from './hooks/use-mobile';

// Create a conditional wrapper component for mobile detection
const MobileAwareRoute = ({ element, mobileHidden = false }) => {
  const isMobile = useIsMobile();
  
  // Force component to re-render and check mobile status
  React.useEffect(() => {
    const forceUpdate = () => {
      console.log('Mobile detection updated:', isMobile);
    };
    forceUpdate();
    window.addEventListener('resize', forceUpdate);
    return () => window.removeEventListener('resize', forceUpdate);
  }, [isMobile]);
  
  return !isMobile || !mobileHidden ? element : <NotFound />;
};

// Define the routes
const getRoutes = () => [
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
  // Main admin route
  {
    path: '/admin',
    element: <AdminDashboardPage />,
  },
  {
    path: '/admin/database',
    element: <AdminDatabasePage />,
  },
  // Add catch-all route for admin to prevent 404s on admin routes
  {
    path: '/admin/*',
    element: <AdminDashboardPage />,
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
    path: '*',
    element: <NotFound />,
  },
];

// Export the router with the routes
export const router = createBrowserRouter(getRoutes());

export default router;
