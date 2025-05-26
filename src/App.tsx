import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './providers/AuthProvider';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Profile } from './pages/Profile';
import { Bookings } from './pages/Bookings';
import { BookingDetailsPage } from './pages/BookingDetailsPage';
import { DriversPage } from './pages/DriversPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { VehiclePricingPage } from './pages/VehiclePricingPage';
import { ToursPage } from './pages/ToursPage';
import { TourDetailsPage } from './pages/TourDetailsPage';
import { CreateTourPage } from './pages/CreateTourPage';
import { EditTourPage } from './pages/EditTourPage';
import { CommissionSettingsPage } from './pages/CommissionSettingsPage';
import { CommissionPaymentsPage } from './pages/CommissionPaymentsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PaymentDetailsPage } from './pages/PaymentDetailsPage';
import { PaymentRemindersPage } from './pages/PaymentRemindersPage';
import { GstReportPage } from './pages/GstReportPage';
import { NotFound } from './pages/NotFound';
import { AdminRoute } from './components/AdminRoute';
import { Dashboard } from './pages/Dashboard';
import { LocationManagementPage } from './pages/LocationManagementPage';
import { FareCalculatorPage } from './pages/FareCalculatorPage';
import { CabTypesPage } from './pages/CabTypesPage';
import { PoolingPage } from './pages/PoolingPage';
import { PoolingAuthPage } from './pages/PoolingAuthPage';
import { PoolingBookingPage } from './pages/PoolingBookingPage';
import { PoolingCreateRidePage } from './pages/PoolingCreateRidePage';
import { PoolingProtectedRoute } from './components/pooling/PoolingProtectedRoute';
import { PoolingAuthProvider } from './providers/PoolingAuthProvider';
import { PoolingGuestRoute } from './components/pooling/PoolingProtectedRoute';
import PoolingGuestPage from './pages/PoolingGuestPage';
import PoolingGuestDashboardPage from './pages/PoolingGuestDashboardPage';

function App() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <PoolingAuthProvider>
          <BrowserRouter>
            <div className="App">
              <Routes>
                <Route path="/" element={<Layout><Home /></Layout>} />
                <Route path="/about" element={<Layout><About /></Layout>} />
                <Route path="/contact" element={<Layout><Contact /></Layout>} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/profile" element={<Layout><Profile /></Layout>} />
                <Route path="/bookings" element={<Layout><Bookings /></Layout>} />
                <Route path="/bookings/:bookingId" element={<Layout><BookingDetailsPage /></Layout>} />
                <Route path="/fare-calculator" element={<Layout><FareCalculatorPage /></Layout>} />

                {/* Admin Routes */}
                <Route element={<AdminRoute><Layout /></AdminRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/vehicles" element={<VehiclesPage />} />
                  <Route path="/cab-types" element={<CabTypesPage />} />
                  <Route path="/vehicle-pricing" element={<VehiclePricingPage />} />
                  <Route path="/tours" element={<ToursPage />} />
                  <Route path="/tours/:tourId" element={<TourDetailsPage />} />
                  <Route path="/tours/create" element={<CreateTourPage />} />
                  <Route path="/tours/edit/:tourId" element={<EditTourPage />} />
                  <Route path="/commission-settings" element={<CommissionSettingsPage />} />
                  <Route path="/commission-payments" element={<CommissionPaymentsPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/payments/:paymentId" element={<PaymentDetailsPage />} />
                  <Route path="/payment-reminders" element={<PaymentRemindersPage />} />
                  <Route path="/gst-report" element={<GstReportPage />} />
                  <Route path="/locations" element={<LocationManagementPage />} />
                </Route>

                {/* Pooling Routes */}
                <Route path="/pooling" element={<PoolingPage />} />
                <Route path="/pooling/auth" element={<PoolingAuthPage />} />
                <Route path="/pooling/book/:rideId" element={<PoolingBookingPage />} />
                
                {/* Guest Routes */}
                <Route path="/pooling/guest" element={<PoolingGuestPage />} />
                <Route path="/pooling/guest/dashboard" element={<PoolingGuestDashboardPage />} />
                
                {/* Protected Pooling Routes */}
                <Route element={<PoolingProtectedRoute />}>
                  <Route path="/pooling/create" element={<PoolingCreateRidePage />} />
                </Route>
                
                <Route element={<PoolingGuestRoute />}>
                  <Route path="/pooling/guest/bookings" element={<PoolingGuestDashboardPage />} />
                </Route>

                <Route path="*" element={<Layout><NotFound /></Layout>} />
              </Routes>
            </div>
          </BrowserRouter>
        </PoolingAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
