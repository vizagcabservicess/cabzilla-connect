import { createBrowserRouter, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ScrollToTop } from './components/ScrollToTop';
import { AdminProtectedRoute } from './components/ProtectedRoute';
import { RedirectHandler } from './components/RedirectHandler';
import { useAuth } from './providers/AuthProvider';
import { UserRole, EnhancedUser } from '@/types/privileges';

// Lazy load all pages for better performance
const Index = lazy(() => import('./pages/Index'));
const NotFound = lazy(() => import('./pages/NotFound'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'));

const ToursPage = lazy(() => import('./pages/ToursPage'));
const BookingEditPage = lazy(() => import('./pages/BookingEditPage'));
const ReceiptPage = lazy(() => import('./pages/ReceiptPage'));
const AdminDatabasePage = lazy(() => import('./pages/AdminDatabasePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const FleetManagementPage = lazy(() => import('./pages/FleetManagementPage'));
const FuelManagementPage = lazy(() => import('./pages/FuelManagementPage'));
const VehicleMaintenancePage = lazy(() => import('./pages/VehicleMaintenancePage'));
const LedgerPage = lazy(() => import('./pages/LedgerPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const PaymentsManagementPage = lazy(() => import('./pages/PaymentsManagementPage'));
const CommissionManagementPage = lazy(() => import('./pages/CommissionManagementPage'));
const AdminBookingCreationPage = lazy(() => import('./pages/AdminBookingCreationPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const RefundsPage = lazy(() => import('./pages/RefundsPage'));
const CancellationRefundPolicyPage = lazy(() => import('./pages/CancellationRefundPolicyPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const PoolingPage = lazy(() => import('./pages/PoolingPage'));
const PoolingBookingPage = lazy(() => import('./pages/PoolingBookingPage'));
const PoolingDashboard = lazy(() => import('./pages/admin/PoolingDashboard'));
const PoolingAdminDashboard = lazy(() => import('./pages/admin/PoolingAdminDashboard'));
const CreateRidePage = lazy(() => import('./components/pooling/CreateRidePage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const FaresPage = lazy(() => import('./pages/FaresPage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const CustomerDashboard = lazy(() => import('./pages/DashboardPage'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const PoolingLoginPage = lazy(() => import('./pages/PoolingLoginPage'));
const PoolingProviderPage = lazy(() => import('./pages/PoolingProviderPage'));
const PoolingAdminPage = lazy(() => import('./pages/PoolingAdminPage'));
const GuestDashboardPage = lazy(() => import('./pages/GuestDashboardPage'));
const LocalTaxiPage = lazy(() => import('./pages/LocalTaxiPage').then(module => ({ default: module.LocalTaxiPage })));
const LocalTaxiPrefilledPage = lazy(() => import('./pages/LocalTaxiPrefilledPage').then(module => ({ default: module.LocalTaxiPrefilledPage })));
const OutstationTaxiPage = lazy(() => import('./pages/OutstationTaxiPage').then(module => ({ default: module.OutstationTaxiPage })));
const OutstationTaxiPrefilledPage = lazy(() => import('./pages/OutstationTaxiPrefilledPage').then(module => ({ default: module.OutstationTaxiPrefilledPage })));
const AirportTaxiPage = lazy(() => import('./pages/AirportTaxiPage').then(module => ({ default: module.AirportTaxiPage })));
const AirportTaxiPrefilledPage = lazy(() => import('./pages/AirportTaxiPrefilledPage').then(module => ({ default: module.AirportTaxiPrefilledPage })));
const RentalsPage = lazy(() => import('./pages/RentalsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage').then(module => ({ default: module.SupportPage })));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage').then(module => ({ default: module.HelpCenterPage })));
const ContactUsPage = lazy(() => import('./pages/ContactUsPage').then(module => ({ default: module.ContactUsPage })));
const TermsConditionsPage = lazy(() => import('./pages/TermsConditionsPage').then(module => ({ default: module.TermsConditionsPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(module => ({ default: module.PrivacyPolicyPage })));
const TourDetailPage = lazy(() => import('./pages/TourDetailPage'));

const RoutePage = lazy(() => import('./pages/RoutePage'));
const VehicleDetailPage = lazy(() => import('@/pages/VehicleDetailPage'));
const OperatorProfilesPage = lazy(() => import('@/pages/OperatorProfilesPage'));
const FleetPage = lazy(() => import('./pages/FleetPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const OurStoryPage = lazy(() => import('./pages/OurStoryPage'));
const VisionMissionPage = lazy(() => import('./pages/VisionMissionPage'));
const HireDriverPage = lazy(() => import('./pages/HireDriverPage'));
const PrivilegeManagement = lazy(() => import('./components/admin/PrivilegeManagement').then(module => ({ default: module.PrivilegeManagement })));

// Loading component for route transitions
const RouteLoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: '14px',
    color: '#666'
  }}>
    Loading...
  </div>
);

// Wrapper component for lazy-loaded routes
const LazyRoute = ({ component: Component }: { component: React.LazyExoticComponent<any> }) => (
  <Suspense fallback={<RouteLoadingSpinner />}>
    <Component />
  </Suspense>
);

// Root component that includes ScrollToTop and RedirectHandler
function Root() {
  return (
    <>
      <ScrollToTop />
      <RedirectHandler>
        <Outlet />
      </RedirectHandler>
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
        element: <LazyRoute component={Index} />,
      },
      {
        path: 'login',
        element: <LazyRoute component={LoginPage} />,
      },
      {
        path: 'signup',
        element: <LazyRoute component={SignupPage} />,
      },
      {
        path: 'dashboard',
        element: <LazyRoute component={DashboardPage} />,
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
            path: 'vehicles',
            element: <VehiclesPage />,
          },
          {
            path: 'drivers',
            element: <DriversPage />,
          },
          {
            path: 'fares',
            element: <FaresPage />,
          },
          {
            path: 'users',
            element: <UserManagementPage />,
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
