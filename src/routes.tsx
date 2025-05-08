
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
import ReportsPage from './pages/ReportsPage';
import FleetManagementPage from './pages/FleetManagementPage';
import FuelManagementPage from './pages/FuelManagementPage';
import VehicleMaintenancePage from './pages/VehicleMaintenancePage';
import LedgerPage from './pages/LedgerPage';
import ExpensesPage from './pages/ExpensesPage';

export const router = createBrowserRouter([
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
  {
    path: '/admin/reports',
    element: <ReportsPage />,
  },
  {
    path: '/admin/fleet',
    element: <FleetManagementPage />,
  },
  {
    path: '/admin/fuel',
    element: <FuelManagementPage />,
  },
  {
    path: '/admin/maintenance',
    element: <VehicleMaintenancePage />,
  },
  {
    path: '/admin/ledger',
    element: <LedgerPage />,
  },
  {
    path: '/admin/expenses',
    element: <ExpensesPage />,
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
    path: '/tours',
    element: <ToursPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
