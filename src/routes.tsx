import { createBrowserRouter, Outlet } from 'react-router-dom';
import { ScrollToTop } from './components/ScrollToTop';
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
import CancellationRefundPolicyPage from './pages/CancellationRefundPolicyPage';
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
import { LocalTaxiPage } from './pages/LocalTaxiPage';
import { LocalTaxiPrefilledPage } from './pages/LocalTaxiPrefilledPage';
import { OutstationTaxiPage } from './pages/OutstationTaxiPage';
import { OutstationTaxiPrefilledPage } from './pages/OutstationTaxiPrefilledPage';
import { AirportTaxiPage } from './pages/AirportTaxiPage';
import { AirportTaxiPrefilledPage } from './pages/AirportTaxiPrefilledPage';
import RentalsPage from './pages/RentalsPage';
import { SupportPage } from './pages/SupportPage';
import { HelpCenterPage } from './pages/HelpCenterPage';
import { ContactUsPage } from './pages/ContactUsPage';
import { TermsConditionsPage } from './pages/TermsConditionsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import TourDetailPage from './pages/TourDetailPage';
import SedanPage from './pages/SedanPage';
import SUVPage from './pages/SUVPage';
import TempoTravellerPage from './pages/TempoTravellerPage';
import RoutePage from './pages/RoutePage';
import VehicleDetailPage from '@/pages/VehicleDetailPage';
import OperatorProfilesPage from '@/pages/OperatorProfilesPage';
import FleetPage from './pages/FleetPage';
import CareersPage from './pages/CareersPage';
import OurStoryPage from './pages/OurStoryPage';
import VisionMissionPage from './pages/VisionMissionPage';

import HireDriverPage from './pages/HireDriverPage';
import { AdminProtectedRoute } from './components/ProtectedRoute';
import { PrivilegeManagement } from './components/admin/PrivilegeManagement';
import { useAuth } from './providers/AuthProvider';
import { UserRole, EnhancedUser } from '@/types/privileges';

// Root component that includes ScrollToTop
function Root() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      // Main admin routes
      {
        path: 'admin',
        element: <AdminProtectedRoute />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: 'database',
            element: <AdminDatabasePage />,
          },
          {
            path: 'reports',
            element: <ReportsPage />,
          },
          {
            path: 'fleet',
            element: <FleetManagementPage />,
          },
          {
            path: 'fuel',
            element: <FuelManagementPage />,
          },
          {
            path: 'maintenance',
            element: <VehicleMaintenancePage />,
          },
          {
            path: 'ledger',
            element: <LedgerPage />,
          },
          {
            path: 'expenses',
            element: <ExpensesPage />,
          },
          {
            path: 'payroll',
            element: <PayrollPage />,
          },
          {
            path: 'payments',
            element: <PaymentsManagementPage />,
          },
          {
            path: 'commission',
            element: <CommissionManagementPage />,
          },
          {
            path: 'bookings',
            element: <BookingsPage />,
          },
          {
            path: 'create-booking',
            element: <AdminBookingCreationPage />,
          },
          {
            path: 'privileges',
            element: <PrivilegeManagementWrapper />,
          },
          {
            path: 'pooling',
            element: <PoolingDashboard />,
          },
          {
            path: 'pooling-enhanced',
            element: <PoolingAdminDashboard />,
          },
          {
            path: 'operator-profiles',
            element: <OperatorProfilesPage />,
          },
        ]
      },
      // Booking routes
      {
        path: 'booking/:bookingId/confirmation',
        element: <BookingConfirmationPage />,
      },
      {
        path: 'booking-confirmation',
        element: <BookingConfirmationPage />,
      },
      {
        path: 'booking/:bookingId/edit',
        element: <BookingEditPage />,
      },
      {
        path: 'receipt/:bookingId',
        element: <ReceiptPage />,
      },
      // Service routes
      {
        path: 'cabs',
        element: <CabsPage />,
      },
      {
        path: 'cabs/:tripType',
        element: <CabsPage />,
      },
      {
        path: 'tours',
        element: <ToursPage />,
      },
      {
        path: 'tours/:tourId',
        element: <TourDetailPage />,
      },
      {
        path: 'payment',
        element: <PaymentPage />,
      },
      // New service pages
      {
        path: 'local-taxi',
        element: <LocalTaxiPage />,
      },
      {
        path: 'local-taxi/:from-to-:to',
        element: <LocalTaxiPrefilledPage />,
      },
      {
        path: 'outstation-taxi',
        element: <OutstationTaxiPage />,
      },
      {
        path: 'outstation-taxi/:from-to-:to',
        element: <OutstationTaxiPrefilledPage />,
      },
      {
        path: 'outstation-taxi/:slug',
        element: <RoutePage />,
      },
      {
        path: 'airport-taxi',
        element: <AirportTaxiPage />,
      },
      {
        path: 'airport-taxi/:from-to-:to',
        element: <AirportTaxiPrefilledPage />,
      },
      {
        path: 'rentals',
        element: <RentalsPage />,
      },
      // Pooling routes
      {
        path: 'pooling',
        element: <PoolingPage />,
      },
      {
        path: 'pooling/book/:rideId',
        element: <PoolingBookingPage />,
      },
      {
        path: 'pooling/create',
        element: <CreateRidePage />,
      },
      {
        path: 'pooling/guest',
        element: <GuestDashboardPage />,
      },
      // Static pages
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: 'contact',
        element: <ContactPage />,
      },
      {
        path: 'support',
        element: <SupportPage />,
      },
      {
        path: 'help-center',
        element: <HelpCenterPage />,
      },
      {
        path: 'contact-us',
        element: <ContactUsPage />,
      },
      {
        path: 'terms-conditions',
        element: <TermsConditionsPage />,
      },
      {
        path: 'privacy-policy',
        element: <PrivacyPolicyPage />,
      },
      {
        path: 'services',
        element: <ServicesPage />,
      },
      {
        path: 'terms',
        element: <TermsPage />,
      },
      {
        path: 'privacy',
        element: <PrivacyPage />,
      },
      {
        path: 'refunds',
        element: <RefundsPage />,
      },
      {
        path: 'cancellation-refund-policy',
        element: <CancellationRefundPolicyPage />,
      },
      {
        path: 'blog',
        element: <BlogPage />,
      },
      {
        path: 'faq',
        element: <FAQPage />,
      },
      {
        path: 'customer',
        element: <CustomerDashboard />,
      },
      {
        path: 'driver',
        element: <DriverDashboard />,
      },
      {
        path: 'pooling/login',
        element: <PoolingLoginPage />,
      },
      {
        path: 'pooling/provider',
        element: <PoolingProviderPage />,
      },
      {
        path: 'pooling/admin',
        element: <PoolingAdminPage />,
      },
      {
        path: 'sedan',
        element: <SedanPage />,
      },
      {
        path: 'suv',
        element: <SUVPage />,
      },
      {
        path: 'tempotraveller',
        element: <TempoTravellerPage />,
      },
      {
        path: 'vehicle/:vehicleId',
        element: <VehicleDetailPage />,
      },
      {
        path: 'fleet',
        element: <FleetPage />,
      },
      {
        path: 'careers',
        element: <CareersPage />,
      },
      {
        path: 'our-story',
        element: <OurStoryPage />,
      },
      {
        path: 'vision-mission',
        element: <VisionMissionPage />,
      },

      {
        path: 'hire-driver',
        element: <HireDriverPage />,
      },

      // Catch-all route for 404s
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

function PrivilegeManagementWrapper() {
  const { user } = useAuth();
  
  if (!user) {
    return <div>Please log in to access this page.</div>;
  }
  
  const enhancedUser: EnhancedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: (user.role === 'admin' || user.role === 'super_admin' ? user.role : 'guest') as UserRole,
    is_active: user.is_active,
    privileges: { 
      userId: user.id, 
      role: (user.role === 'admin' || user.role === 'super_admin' ? user.role : 'guest') as UserRole, 
      modulePrivileges: [] 
    },
  };
  
  return <PrivilegeManagement currentUser={enhancedUser} />;
}

export default router;
