
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import CabsPage from './pages/CabsPage';
import ToursPage from './pages/ToursPage';
import PoolingPage from './pages/PoolingPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import PaymentPage from './pages/PaymentPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FleetManagementPage from './pages/FleetManagementPage';
import VehicleMaintenancePage from './pages/VehicleMaintenancePage';
import CommissionManagementPage from './pages/CommissionManagementPage';
import SignupPage from './pages/SignupPage';
import { AuthProvider } from './providers/AuthProvider';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { AdminProtectedRoute, CustomerProtectedRoute } from './components/ProtectedRoute';
import { CabProvider } from './providers/CabProvider';
import { ToastProvider } from './providers/ToastProvider';
import { ScrollToTop } from './components/ScrollToTop';
import { initializeDatabase } from '@/lib';
import ExpensesPage from './pages/ExpensesPage';
import PayrollPage from './pages/PayrollPage';
import PaymentsManagementPage from './pages/PaymentsManagementPage';
import NotFound from './pages/NotFound';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ReportsPage from './pages/ReportsPage';
import AdminBookingCreationPage from './pages/AdminBookingCreationPage';
import AdminDatabasePage from './pages/AdminDatabasePage';
import LedgerPage from './pages/LedgerPage';
import FuelManagementPage from './pages/FuelManagementPage';
import ReceiptPage from './pages/ReceiptPage';
import BookingEditPage from './pages/BookingEditPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingsPage from './pages/BookingsPage';
import DriversPage from './pages/DriversPage';
import FaresPage from './pages/FaresPage';
import PaymentsPage from './pages/PaymentsPage';
import VehiclesPage from './pages/VehiclesPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import UserManagementPage from './pages/UserManagementPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ServicesPage from './pages/ServicesPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import RefundsPage from './pages/RefundsPage';
import BlogPage from './pages/BlogPage';
import FAQPage from './pages/FAQPage';

// Route constants for better maintainability
export const ROUTES = {
  HOME: '/',
  CABS: '/cabs/:tripType',
  TOURS: '/tours',
  POOLING: '/pooling',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  BOOKING_CONFIRMATION: '/booking-confirmation',
  PAYMENT: '/payment',
  BOOKINGS: '/bookings',
  DRIVERS: '/drivers',
  FARES: '/fares',
  PAYMENTS: '/payments',
  VEHICLES: '/vehicles',
  ADMIN: {
    ROOT: '/admin',
    FLEET: '/admin/fleet',
    MAINTENANCE: '/admin/maintenance',
    COMMISSION: '/admin/commission',
    USERS: '/admin/users',
    EXPENSES: '/admin/expenses',
    PAYROLL: '/admin/payroll',
    PAYMENTS: '/admin/payments',
    REPORTS: '/admin/reports',
    BOOKINGS: '/admin/bookings',
    DATABASE: '/admin/database',
    LEDGER: '/admin/ledger',
    FUEL: '/admin/fuel',
    RECEIPTS: '/admin/receipts',
    BOOKING_EDIT: '/admin/booking-edit',
    CREATE_BOOKING: '/admin/create-booking',
    EDIT_BOOKING: '/admin/edit-booking',
    DRIVERS: '/admin/drivers',
    FARES: '/admin/fares',
    VEHICLES: '/admin/vehicles'
  }
} as const;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Get Google Maps API key from environment variables
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function App() {
  useEffect(() => {
    // Initialize the database when the app loads
    initializeDatabase();
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <AuthProvider>
          <GoogleMapsProvider apiKey={GOOGLE_MAPS_API_KEY || ''}>
          <CabProvider>
            <Router>
              <ScrollToTop />
              <Routes>
                  {/* Public Routes */}
                  <Route path={ROUTES.HOME} element={<Index />} />
                  <Route path={ROUTES.CABS} element={<CabsPage />} />
                  <Route path={ROUTES.TOURS} element={<ToursPage />} />
                  <Route path={ROUTES.POOLING} element={<PoolingPage />} />
                  <Route path="/pooling/ride/:rideId" element={<PoolingPage />} />
                  <Route path="/pooling/book/:rideId" element={<PoolingPage />} />
                  <Route path="/pooling/create" element={<PoolingPage />} />
                  <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                  <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/refunds" element={<RefundsPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path={ROUTES.PAYMENT} element={<PaymentPage />} />
                  
                
                  {/* Protected Customer Routes */}
                <Route element={<CustomerProtectedRoute />}>
                    <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                    <Route path={ROUTES.BOOKING_CONFIRMATION} element={<BookingConfirmationPage />} />
                    <Route path={ROUTES.PAYMENT} element={<PaymentPage />} />
                    <Route path={ROUTES.BOOKINGS} element={<BookingsPage />} />
                    <Route path={ROUTES.DRIVERS} element={<DriversPage />} />
                    <Route path={ROUTES.FARES} element={<FaresPage />} />
                    <Route path={ROUTES.PAYMENTS} element={<PaymentsPage />} />
                    <Route path={ROUTES.VEHICLES} element={<VehiclesPage />} />
                </Route>
                
                  {/* Protected Admin Routes */}
                <Route element={<AdminProtectedRoute />}>
                    <Route path={ROUTES.ADMIN.ROOT} element={<AdminDashboardPage />} />
                    <Route path={ROUTES.ADMIN.FLEET} element={<FleetManagementPage />} />
                    <Route path={ROUTES.ADMIN.MAINTENANCE} element={<VehicleMaintenancePage />} />
                    <Route path={ROUTES.ADMIN.COMMISSION} element={<CommissionManagementPage />} />
                    <Route path={ROUTES.ADMIN.USERS} element={<UserManagementPage />} />
                    <Route path={ROUTES.ADMIN.EXPENSES} element={<ExpensesPage />} />
                    <Route path={ROUTES.ADMIN.PAYROLL} element={<PayrollPage />} />
                    <Route path={ROUTES.ADMIN.PAYMENTS} element={<PaymentsManagementPage />} />
                    <Route path={ROUTES.ADMIN.REPORTS} element={<ReportsPage />} />
                    <Route path={ROUTES.ADMIN.BOOKINGS} element={<AdminBookingsPage />} />
                    <Route path={ROUTES.ADMIN.DATABASE} element={<AdminDatabasePage />} />
                    <Route path={ROUTES.ADMIN.LEDGER} element={<LedgerPage />} />
                    <Route path={ROUTES.ADMIN.FUEL} element={<FuelManagementPage />} />
                    <Route path={ROUTES.ADMIN.RECEIPTS} element={<ReceiptPage />} />
                    <Route path={ROUTES.ADMIN.BOOKING_EDIT} element={<BookingEditPage />} />
                    <Route path={ROUTES.ADMIN.CREATE_BOOKING} element={<AdminBookingCreationPage />} />
                    <Route path={ROUTES.ADMIN.EDIT_BOOKING} element={<BookingEditPage />} />
                    <Route path={ROUTES.ADMIN.DRIVERS} element={<DriversPage />} />
                    <Route path={ROUTES.ADMIN.FARES} element={<FaresPage />} />
                    <Route path={ROUTES.ADMIN.VEHICLES} element={<VehiclesPage />} />
                </Route>

                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
          </CabProvider>
        </GoogleMapsProvider>
      </AuthProvider>
    </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
