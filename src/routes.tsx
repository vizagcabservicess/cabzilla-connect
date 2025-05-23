
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
import PayrollPage from './pages/PayrollPage';
import PaymentsManagementPage from './pages/PaymentsManagementPage';
import CommissionManagementPage from './pages/CommissionManagementPage';
import AdminBookingCreationPage from './pages/AdminBookingCreationPage';
import PaymentPage from './pages/PaymentPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ServicesPage from './pages/ServicesPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import RefundsPage from './pages/RefundsPage';
import BlogPage from './pages/BlogPage';
import FAQPage from './pages/FAQPage';

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
  {
    path: '/admin/payroll',
    element: <PayrollPage />,
  },
  {
    path: '/admin/payments',
    element: <PaymentsManagementPage />,
  },
  {
    path: '/admin/commission',
    element: <CommissionManagementPage />,
  },
  {
    path: '/admin/create-booking',
    element: <AdminBookingCreationPage />,
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
    path: '/payment',
    element: <PaymentPage />,
  },
  // New pages
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '/services',
    element: <ServicesPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/refunds',
    element: <RefundsPage />,
  },
  {
    path: '/blog',
    element: <BlogPage />,
  },
  {
    path: '/faq',
    element: <FAQPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
