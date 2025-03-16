
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
  {
    path: '/booking/:id/edit',
    element: <BookingEditPage />,
  },
  {
    path: '/receipt/:id',
    element: <ReceiptPage />,
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
