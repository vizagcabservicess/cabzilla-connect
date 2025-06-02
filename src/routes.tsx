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
import PoolingPage from './pages/PoolingPage';
import PoolingBookingPage from './pages/PoolingBookingPage';
import PoolingDashboard from './pages/admin/PoolingDashboard';
import PoolingAdminDashboard from './pages/admin/PoolingAdminDashboard';
import CreateRidePage from './components/pooling/CreateRidePage';
import BookingsPage from './pages/BookingsPage';
import FaresPage from './pages/FaresPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import UserManagementPage from './pages/UserManagementPage';
import CustomerDashboard from './pages/DashboardPage';
import DriverDashboard from './pages/DriverDashboard';
import PoolingLoginPage from './pages/PoolingLoginPage';
import PoolingProviderPage from './pages/PoolingProviderPage';
import PoolingAdminPage from './pages/PoolingAdminPage';
import GuestDashboardPage from './pages/GuestDashboardPage';

const router = createBrowserRouter([
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
  // Main admin routes
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
  {
    path: '/admin/pooling',
    element: <PoolingDashboard />,
  },
  {
    path: '/admin/pooling-enhanced',
    element: <PoolingAdminDashboard />,
  },
  // Add catch-all route for admin to prevent 404s on admin routes
  {
    path: '/admin/*',
    element: <AdminDashboardPage />,
  },
  // Booking routes
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
  // Service routes
  {
    path: '/cabs',
    element: <CabsPage />,
  },
  {
    path: '/cabs/:tripType',
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
  // Pooling routes
  {
    path: '/pooling',
    element: <PoolingPage />,
  },
  {
    path: '/pooling/book/:rideId',
    element: <PoolingBookingPage />,
  },
  {
    path: '/pooling/create',
    element: <CreateRidePage />,
  },
  {
    path: '/pooling/guest',
    element: <GuestDashboardPage />,
  },
  // Static pages
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
  { path: '/bookings', element: <BookingsPage /> },
  { path: '/fares', element: <FaresPage /> },
  { path: '/vehicles', element: <VehiclesPage /> },
  { path: '/drivers', element: <DriversPage /> },
  { path: '/users', element: <UserManagementPage /> },
  { path: '/admin/bookings', element: <BookingsPage /> },
  { path: '/admin/fares', element: <FaresPage /> },
  { path: '/admin/vehicles', element: <VehiclesPage /> },
  { path: '/admin/drivers', element: <DriversPage /> },
  { path: '/admin/users', element: <UserManagementPage /> },
  {
    path: '/customer',
    element: <CustomerDashboard />,
  },
  {
    path: '/driver',
    element: <DriverDashboard />,
  },
  {
    path: '/pooling/login',
    element: <PoolingLoginPage />,
  },
  {
    path: '/pooling/provider',
    element: <PoolingProviderPage />,
  },
  {
    path: '/pooling/admin',
    element: <PoolingAdminPage />,
  },
  // Catch-all route for 404s
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
