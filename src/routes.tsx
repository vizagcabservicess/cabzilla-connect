import React from 'react';
import { createBrowserRouter, Outlet, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { vehicleLoader } from './loaders/vehicleLoader';
import { lazy, Suspense, startTransition } from 'react';
import { ScrollToTop } from './components/ScrollToTop';
import { AdminProtectedRoute } from './components/ProtectedRoute';
import { RedirectHandler } from './components/RedirectHandler';
import { useAuth } from './providers/AuthProvider';
import { UserRole, EnhancedUser } from '@/types/privileges';
import { HeroSkeleton, PageSkeleton } from './components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { FaWhatsapp } from 'react-icons/fa';
import { lazyWithRetry } from './utils/dynamicImportRetry';
import DynamicImportErrorBoundary from './components/DynamicImportErrorBoundary';

// Homepage loaded eagerly to avoid "Failed to fetch dynamically imported module" (no separate Index chunk)
import Index from './pages/Index';
const NotFound = lazy(() => import('./pages/NotFound'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const DashboardPage = lazyWithRetry(
  () => import('./pages/DashboardPage'),
  {
    moduleName: 'DashboardPage',
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retrying DashboardPage import (attempt ${attempt})`);
    },
    onMaxRetriesReached: (error) => {
      console.error('DashboardPage failed to load after all retries');
    }
  }
);
const AdminDashboardPage = lazyWithRetry(
  () => import('./pages/AdminDashboardPage'),
  {
    moduleName: 'AdminDashboardPage',
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retrying AdminDashboardPage import (attempt ${attempt})`);
    },
    onMaxRetriesReached: (error) => {
      console.error('AdminDashboardPage failed to load after all retries');
    }
  }
);
const BookingConfirmationPage = lazyWithRetry(
  () => import('./pages/BookingConfirmationPage'),
  {
    moduleName: 'BookingConfirmationPage',
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retrying BookingConfirmationPage import (attempt ${attempt})`);
    },
    onMaxRetriesReached: (error) => {
      console.error('BookingConfirmationPage failed to load after all retries');
    }
  }
);

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
const PaymentPage = lazyWithRetry(
  () => import('./pages/PaymentPage'),
  {
    moduleName: 'PaymentPage',
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retrying PaymentPage import (attempt ${attempt})`);
    },
    onMaxRetriesReached: (error) => {
      console.error('PaymentPage failed to load after all retries');
    }
  }
);
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const RefundsPage = lazy(() => import('./pages/RefundsPage'));
const CancellationRefundPolicyPage = lazy(() => import('./pages/CancellationRefundPolicyPage'));
const PoolingPage = lazy(() => import('./pages/PoolingPage'));
const PoolingBookingPage = lazy(() => import('./pages/PoolingBookingPage'));
const PoolingDashboard = lazy(() => import('./pages/admin/PoolingDashboard'));
const PoolingAdminDashboard = lazy(() => import('./pages/admin/PoolingAdminDashboard'));
const GroupToursManagementPage = lazy(() => import('./pages/admin/GroupToursManagementPage'));
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
const UserAgreementPage = lazy(() => import('./pages/UserAgreementPage').then(module => ({ default: module.UserAgreementPage })));
const TourDetailPage = lazy(() => import('./pages/TourDetailPage'));
const DataDeletionPage = lazy(() => import('./pages/DataDeletionPage'));

const RoutePage = lazy(() => import('./pages/RoutePage'));
const VehicleDetailPage = lazy(() => import('@/pages/VehicleDetailPage'));
const OperatorProfilesPage = lazy(() => import('@/pages/OperatorProfilesPage'));
const FleetPage = lazy(() => import('./pages/FleetPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const OurStoryPage = lazy(() => import('./pages/OurStoryPage'));
const VisionMissionPage = lazy(() => import('./pages/VisionMissionPage'));
const HireDriverPage = lazy(() => import('./pages/HireDriverPage'));
const HireDriverTermsPage = lazy(() => import('./pages/HireDriverTermsPage').then(module => ({ default: module.HireDriverTermsPage })));
const TempoTravellerRentalPage = lazy(() => import('./pages/TempoTravellerRentalPage'));
const UrbaniaRentalVizagPage = lazy(() => import('./pages/UrbaniaRentalVizagPage'));
const LocalCarpoolingPage = lazy(() => import('./pages/LocalCarpoolingPage'));
const SeventeenSeaterTempoTravellerPage = lazy(() => import('./pages/SeventeenSeaterTempoTravellerPage'));
const TwelveSeaterTempoTravellerPage = lazy(() => import('./pages/TwelveSeaterTempoTravellerPage'));
const GroupTravelTempoTravellerPage = lazy(() => import('./pages/GroupTravelTempoTravellerPage'));
const CorporateTempoTravellerPage = lazy(() => import('./pages/CorporateTempoTravellerPage'));
const WeddingTempoTravellerPage = lazy(() => import('./pages/WeddingTempoTravellerPage'));
const PilgrimageTempoTravellerPage = lazy(() => import('./pages/PilgrimageTempoTravellerPage'));
const EighteenSeaterTempoTravellerPage = lazy(() => import('./pages/EighteenSeaterTempoTravellerPage'));
const MiniBusTravelsPage = lazy(() => import('./pages/MiniBusTravelsPage'));
const ArakuTourPackagesPage = lazy(() => import('./pages/ArakuTourPackagesPage'));
const VizagToArakuBusPage = lazy(() => import('./pages/VizagToArakuBusPage'));
const GroupTourLandingPage = lazy(() => import('./pages/group-tour/GroupTourLandingPage'));
const GroupTourSearchPage = lazy(() => import('./pages/group-tour/GroupTourSearchPage'));
const GroupTourSeatSelectionPage = lazy(() => import('./pages/group-tour/GroupTourSeatSelectionPage'));
const GroupTourBoardingPointPage = lazy(() => import('./pages/group-tour/GroupTourBoardingPointPage'));
const GroupTourPassengerDetailsPage = lazy(() => import('./pages/group-tour/GroupTourPassengerDetailsPage'));
const GroupTourConfirmationPage = lazy(() => import('./pages/group-tour/GroupTourConfirmationPage'));
const PrivilegeManagement = lazy(() => import('./components/admin/PrivilegeManagement').then(module => ({ default: module.PrivilegeManagement })));

// Loading component for route transitions
const RouteLoadingSpinner = () => <PageSkeleton />;

// Wrapper component for lazy-loaded routes
const LazyRoute = ({ component: Component }: { component: React.LazyExoticComponent<any> }) => (
  <Suspense fallback={<RouteLoadingSpinner />}>
    <Component />
  </Suspense>
);

// Root component that includes ScrollToTop and RedirectHandler
function Root() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const getWhatsAppMessage = () => {
    const path = location.pathname;
    
    // Check for vehicle detail pages first (dynamic paths)
    if (path.startsWith('/vehicle/')) {
      const vehicleName = path.split('/vehicle/')[1];
      // Convert URL format to readable name (e.g., "tempo_traveller" -> "Tempo Traveller")
      const readableVehicleName = vehicleName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `Hi Kumar! I would like to know more about the ${readableVehicleName} vehicle`;
    }
    
    // Check for tour detail pages (dynamic paths)
    if (path.startsWith('/tours/') && path !== '/tours') {
      const tourId = path.split('/tours/')[1];
      return `Hi Kumar! I would like to know more about tour package ${tourId}`;
    }
    
    // Check for group tour pages - enquiry with route info
    if (path.startsWith('/group-tours/')) {
      const pickup = searchParams.get('pickup') || '';
      const dropoff = searchParams.get('dropoff') || '';
      const date = searchParams.get('date') || '';
      if (pickup && dropoff) {
        const routeText = `${pickup} to ${dropoff}`;
        const dateText = date ? ` for ${date}` : '';
        return `Hi! I am enquiring about the group tour from ${routeText}${dateText}`;
      }
      return 'Hi! I am enquiring about the group tour';
    }
    
    // Check for booking-related pages
    if (path.startsWith('/booking/')) {
      return 'Hi Kumar! I need help with my booking';
    }
    
    // Check for payment page
    if (path === '/payment') {
      return 'Hi Kumar! I need help with payment';
    }
    
    // Define messages based on actual page paths
    const messages = {
      '/': 'Hi Kumar! I would like to know more about your taxi services',
      '/hire-driver': 'Hi Kumar! I would like to hire a driver',
      '/hire-driver-terms': 'Hi Kumar! I have a question about the Hire-a-Driver terms and conditions',
      '/tours': 'Hi Kumar! I would like to know more about your tour packages',
      '/fleet': 'Hi Kumar! I would like to know more about your fleet',
      '/careers': 'Hi Kumar! I would like to know more about career opportunities',
      '/our-story': 'Hi Kumar! I would like to know more about your company',
      '/vision-mission': 'Hi Kumar! I would like to know more about your vision and mission',
      '/contact': 'Hi Kumar! I would like to get in touch with you',
      '/about': 'Hi Kumar! I would like to know more about Vizag Taxi Hub',
      '/local-taxi': 'Hi Kumar! I would like to book a local taxi',
      '/outstation-taxi': 'Hi Kumar! I would like to book an outstation taxi',
      '/airport-taxi': 'Hi Kumar! I would like to book an airport transfer',
      '/pooling': 'Hi Kumar! I would like to know more about your car pooling service',
      '/local-carpooling': 'Hi Kumar! I would like to enquire about local carpooling (NAD to IT SEZ route)',
      '/rentals': 'Hi Kumar! I would like to know more about your car rental services',
      '/support': 'Hi Kumar! I need support with my booking',
      '/help-center': 'Hi Kumar! I need help with your services',
      '/contact-us': 'Hi Kumar! I would like to get in touch with you',
      '/terms-conditions': 'Hi Kumar! I have a question about your terms and conditions',
      '/privacy-policy': 'Hi Kumar! I have a question about your privacy policy',
      '/user-agreement': 'Hi Kumar! I have a question about your user agreement',
      '/terms': 'Hi Kumar! I have a question about your terms',
      '/privacy': 'Hi Kumar! I have a question about your privacy policy',
      '/data-deletion': 'Hi Kumar! I would like to request data deletion',
      '/refunds': 'Hi Kumar! I have a question about refunds',
      '/cancellation-refund-policy': 'Hi Kumar! I have a question about cancellation and refund policy'
    };

    // Return specific message or default message
    return messages[path] || 'Hi Kumar! I would like to know more about your services';
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(getWhatsAppMessage());
    window.open(`https://wa.me/919966363662?text=${message}`, '_blank');
  };

  return (
    <>
      <ScrollToTop />
      <RedirectHandler>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <Outlet />
        </Suspense>
      </RedirectHandler>
      
      {/* Global WhatsApp Floating Button - Desktop Only */}
      <div className="hidden md:block fixed right-6 bottom-6 z-50">
        <Button
          onClick={handleWhatsApp}
          size="lg"
          className="rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white"
        >
          <FaWhatsapp className="h-5 w-5 mr-2" />
          WhatsApp
        </Button>
      </div>
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
        element: <LazyRoute component={LoginPage} />,
      },
      {
        path: 'signup',
        element: <LazyRoute component={SignupPage} />,
      },
      {
        path: 'reset-password',
        element: <LazyRoute component={ResetPasswordPage} />,
      },
      {
        path: 'verify-email',
        element: <LazyRoute component={VerifyEmailPage} />,
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
            element: (
              <DynamicImportErrorBoundary>
                <AdminDashboardPage />
              </DynamicImportErrorBoundary>
            ),
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
            path: 'group-tours',
            element: <GroupToursManagementPage />,
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
        element: (
          <DynamicImportErrorBoundary>
            <BookingConfirmationPage />
          </DynamicImportErrorBoundary>
        ),
      },
      {
        path: 'booking-confirmation',
        element: (
          <DynamicImportErrorBoundary>
            <BookingConfirmationPage />
          </DynamicImportErrorBoundary>
        ),
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
        path: 'tours/:tourSlug',
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
        path: 'user-agreement',
        element: <UserAgreementPage />,
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
        path: 'data-deletion',
        element: <LazyRoute component={DataDeletionPage} />,
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
        path: 'vehicle/:vehicleSlug',
        loader: vehicleLoader,
        element: <VehicleDetailPage />,
      },
      {
        path: 'fleet',
        element: <FleetPage />,
      },
      // Tempo Traveller SEO URLs - actual pages with content
      {
        path: 'tempo-traveller-rental-vizag',
        element: <LazyRoute component={TempoTravellerRentalPage} />,
      },
      {
        path: 'urbania-rental-vizag',
        element: <LazyRoute component={UrbaniaRentalVizagPage} />,
      },
      {
        path: 'local-carpooling',
        element: <LazyRoute component={LocalCarpoolingPage} />,
      },
      {
        path: '17-seater-tempo-traveller-vizag',
        element: <LazyRoute component={SeventeenSeaterTempoTravellerPage} />,
      },
      {
        path: '12-seater-tempo-traveller-vizag',
        element: <LazyRoute component={TwelveSeaterTempoTravellerPage} />,
      },
      {
        path: 'group-travel-tempo-traveller-vizag',
        element: <LazyRoute component={GroupTravelTempoTravellerPage} />,
      },
      {
        path: 'corporate-tempo-traveller-vizag',
        element: <LazyRoute component={CorporateTempoTravellerPage} />,
      },
      {
        path: 'wedding-tempo-traveller-vizag',
        element: <LazyRoute component={WeddingTempoTravellerPage} />,
      },
      {
        path: 'pilgrimage-tempo-traveller-vizag',
        element: <LazyRoute component={PilgrimageTempoTravellerPage} />,
      },
      {
        path: '18-seater-tempo-traveller-vizag',
        element: <LazyRoute component={EighteenSeaterTempoTravellerPage} />,
      },
      {
        path: 'mini-bus-travels-vizag',
        element: <LazyRoute component={MiniBusTravelsPage} />,
      },
      {
        path: 'araku-tour-packages-vizag',
        element: <LazyRoute component={ArakuTourPackagesPage} />,
      },
      {
        path: 'vizag-to-araku-bus',
        element: <LazyRoute component={VizagToArakuBusPage} />,
      },
      // Group Tour - Tempo Traveller seat sharing
      {
        path: 'group-tours',
        element: <LazyRoute component={GroupTourLandingPage} />,
      },
      {
        path: 'group-tours/search',
        element: <LazyRoute component={GroupTourSearchPage} />,
      },
      {
        path: 'group-tours/seat-selection/:tourId',
        element: <LazyRoute component={GroupTourSeatSelectionPage} />,
      },
      {
        path: 'group-tours/boarding-point/:tourId',
        element: <LazyRoute component={GroupTourBoardingPointPage} />,
      },
      {
        path: 'group-tours/passenger-details/:tourId',
        element: <LazyRoute component={GroupTourPassengerDetailsPage} />,
      },
      {
        path: 'group-tours/confirmation/:bookingId',
        element: <LazyRoute component={GroupTourConfirmationPage} />,
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
      {
        path: 'hire-driver-terms',
        element: <HireDriverTermsPage />,
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
