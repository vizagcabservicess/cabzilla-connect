import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import CabsPage from './pages/CabsPage';
import ToursPage from './pages/ToursPage';
import BookingConfirmation from './pages/BookingConfirmation';
import PaymentPage from './pages/PaymentPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import FleetManagement from './pages/FleetManagement';
import VehicleManagement from './pages/VehicleManagement';
import FareManagement from './pages/FareManagement';
import CommissionManagement from './pages/CommissionManagement';
import UserManagement from './pages/UserManagement';
import { AuthProvider } from './providers/AuthProvider';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { AdminProtectedRoute, CustomerProtectedRoute } from './components/ProtectedRoute';
import { CabProvider } from './providers/CabProvider';
import { ToastProvider } from './providers/ToastProvider';
import { ScrollToTop } from './components/ScrollToTop';
import { initializeDatabase } from '@/lib';
import { ExpenseManagement } from './pages/ExpenseManagement';
import { PayrollManagement } from './pages/PayrollManagement';
import { PaymentsManagement } from './pages/PaymentsManagement';

function App() {
  useEffect(() => {
    // Initialize the database when the app loads
    initializeDatabase();
  }, []);
  
  return (
    <ToastProvider>
      <AuthProvider>
        <GoogleMapsProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
          <CabProvider>
            <Router>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cabs/:tripType" element={<CabsPage />} />
                <Route path="/tours" element={<ToursPage />} />
                <Route path="/booking-confirmation" element={<BookingConfirmation />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/login" element={<LoginPage />} />
                
                {/* Customer Routes */}
                <Route element={<CustomerProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>
                
                {/* Admin Routes */}
                <Route element={<AdminProtectedRoute />}>
                  <Route path="/fleet-management" element={<FleetManagement />} />
                  <Route path="/vehicle-management" element={<VehicleManagement />} />
                  <Route path="/fare-management" element={<FareManagement />} />
                  <Route path="/commission-management" element={<CommissionManagement />} />
                  <Route path="/user-management" element={<UserManagement />} />
                  <Route path="/expense-management" element={<ExpenseManagement />} />
                  <Route path="/payroll-management" element={<PayrollManagement />} />
                  <Route path="/payments-management" element={<PaymentsManagement />} />
                </Route>
              </Routes>
            </Router>
          </CabProvider>
        </GoogleMapsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
