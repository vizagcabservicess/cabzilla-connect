import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/providers/AuthProvider';
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import BookingPage from '@/pages/BookingPage';
import TourPackagesPage from '@/pages/TourPackagesPage';
import OutstationPackagesPage from '@/pages/OutstationPackagesPage';
import AirportTransfersPage from '@/pages/AirportTransfersPage';
import LocalPackagesPage from '@/pages/LocalPackagesPage';
import HourlyRentalPage from '@/pages/HourlyRentalPage';
import CabOptionsPage from '@/pages/CabOptionsPage';
import BookingSummaryPage from '@/pages/BookingSummaryPage';
import PaymentPage from '@/pages/PaymentPage';
import ConfirmationPage from '@/pages/ConfirmationPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminBookingsPage from '@/pages/admin/AdminBookingsPage';
import AdminDriversPage from '@/pages/admin/AdminDriversPage';
import AdminVehiclesPage from '@/pages/admin/AdminVehiclesPage';
import AdminCustomersPage from '@/pages/admin/AdminCustomersPage';
import AdminPaymentsPage from '@/pages/admin/AdminPaymentsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import DriverDashboard from '@/pages/driver/DriverDashboard';
import DriverBookingsPage from '@/pages/driver/DriverBookingsPage';
import DriverProfilePage from '@/pages/driver/DriverProfilePage';
import DriverProtectedRoute from '@/components/DriverProtectedRoute';
import CommissionSettingsPage from '@/pages/admin/CommissionSettingsPage';
import CommissionPaymentsPage from '@/pages/admin/CommissionPaymentsPage';
import CommissionReportPage from '@/pages/admin/CommissionReportPage';
import VehiclePricingPage from '@/pages/admin/VehiclePricingPage';
import TourFareManagementPage from '@/pages/admin/TourFareManagementPage';
import LocalFareManagementPage from '@/pages/admin/LocalFareManagementPage';
import AirportFareManagementPage from '@/pages/admin/AirportFareManagementPage';
import FuelPriceManagementPage from '@/pages/admin/FuelPriceManagementPage';
import FleetManagementPage from '@/pages/admin/FleetManagementPage';
import FuelRecordManagementPage from '@/pages/admin/FuelRecordManagementPage';
import GSTReportPage from '@/pages/admin/GSTReportPage';
import PaymentReportPage from '@/pages/admin/PaymentReportPage';
import DriverReportPage from '@/pages/admin/DriverReportPage';
import CustomerReportPage from '@/pages/admin/CustomerReportPage';
import BookingReportPage from '@/pages/admin/BookingReportPage';
import VehicleReportPage from '@/pages/admin/VehicleReportPage';
import LocationManagementPage from '@/pages/admin/LocationManagementPage';
import TourDetailsPage from '@/pages/TourDetailsPage';
import OutstationDetailsPage from '@/pages/OutstationDetailsPage';
import AirportTransferDetailsPage from '@/pages/AirportTransferDetailsPage';
import LocalPackageDetailsPage from '@/pages/LocalPackageDetailsPage';
import { ScrollToTop } from '@/components/ScrollToTop';
import PoolingPage from '@/pages/PoolingPage';
import PoolingAuthPage from '@/pages/PoolingAuthPage';
import PoolingBookingPage from '@/pages/PoolingBookingPage';
import PoolingAdminDashboard from '@/pages/PoolingAdminDashboard';
import PoolingProviderDashboard from '@/pages/PoolingProviderDashboard';
import CreateRidePage from '@/components/pooling/CreateRidePage';
import { PoolingProtectedRoute, PoolingGuestRoute, PoolingProviderRoute, PoolingAdminRoute } from '@/components/pooling/PoolingProtectedRoute';
import { PoolingAuthProvider } from '@/providers/PoolingAuthProvider';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PoolingAuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="min-h-screen bg-background font-sans antialiased">
              <Toaster />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/tours" element={<TourPackagesPage />} />
                <Route path="/tours/:tourId" element={<TourDetailsPage />} />
                <Route path="/outstation" element={<OutstationPackagesPage />} />
                <Route path="/outstation/:packageId" element={<OutstationDetailsPage />} />
                <Route path="/airport-transfers" element={<AirportTransfersPage />} />
                <Route path="/airport-transfers/:transferId" element={<AirportTransferDetailsPage />} />
                <Route path="/local-packages" element={<LocalPackagesPage />} />
                <Route path="/local-packages/:packageId" element={<LocalPackageDetailsPage />} />
                <Route path="/hourly-rental" element={<HourlyRentalPage />} />
                <Route path="/cab-options" element={<CabOptionsPage />} />
                <Route path="*" element={<NotFoundPage />} />

                {/* Protected Customer Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/booking" element={<BookingPage />} />
                  <Route path="/booking-summary" element={<BookingSummaryPage />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/confirmation" element={<ConfirmationPage />} />
                </Route>

                {/* Admin Routes */}
                <Route element={<AdminProtectedRoute />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/bookings" element={<AdminBookingsPage />} />
                  <Route path="/admin/drivers" element={<AdminDriversPage />} />
                  <Route path="/admin/vehicles" element={<AdminVehiclesPage />} />
                  <Route path="/admin/customers" element={<AdminCustomersPage />} />
                  <Route path="/admin/payments" element={<AdminPaymentsPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/admin/commission-settings" element={<CommissionSettingsPage />} />
                  <Route path="/admin/commission-payments" element={<CommissionPaymentsPage />} />
                  <Route path="/admin/commission-report" element={<CommissionReportPage />} />
                  <Route path="/admin/vehicle-pricing" element={<VehiclePricingPage />} />
                  <Route path="/admin/tour-fares" element={<TourFareManagementPage />} />
                  <Route path="/admin/local-fares" element={<LocalFareManagementPage />} />
                  <Route path="/admin/airport-fares" element={<AirportFareManagementPage />} />
                  <Route path="/admin/fuel-prices" element={<FuelPriceManagementPage />} />
                  <Route path="/admin/fleet-management" element={<FleetManagementPage />} />
                  <Route path="/admin/fuel-records" element={<FuelRecordManagementPage />} />
                  <Route path="/admin/gst-report" element={<GSTReportPage />} />
                  <Route path="/admin/payment-report" element={<PaymentReportPage />} />
                  <Route path="/admin/driver-report" element={<DriverReportPage />} />
                  <Route path="/admin/customer-report" element={<CustomerReportPage />} />
                  <Route path="/admin/booking-report" element={<BookingReportPage />} />
                  <Route path="/admin/vehicle-report" element={<VehicleReportPage />} />
                  <Route path="/admin/locations" element={<LocationManagementPage />} />
                </Route>

                {/* Driver Routes */}
                <Route element={<DriverProtectedRoute />}>
                  <Route path="/driver/dashboard" element={<DriverDashboard />} />
                  <Route path="/driver/bookings" element={<DriverBookingsPage />} />
                  <Route path="/driver/profile" element={<DriverProfilePage />} />
                </Route>
                
                {/* Pooling Routes */}
                <Route path="/pooling" element={<PoolingPage />} />
                <Route path="/pooling/auth" element={<PoolingAuthPage />} />
                
                {/* Protected Pooling Routes */}
                <Route element={<PoolingProtectedRoute />}>
                  <Route path="/pooling/book/:rideId" element={<PoolingBookingPage />} />
                  <Route path="/pooling/create" element={<CreateRidePage />} />
                </Route>
                
                {/* Role-specific routes */}
                <Route element={<PoolingAdminRoute />}>
                  <Route path="/pooling/admin" element={<PoolingAdminDashboard />} />
                </Route>
                
                <Route element={<PoolingProviderRoute />}>
                  <Route path="/pooling/provider" element={<PoolingProviderDashboard />} />
                </Route>
              </Routes>
            </div>
          </BrowserRouter>
        </PoolingAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
