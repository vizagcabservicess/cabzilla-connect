
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastToaster } from "@/components/ui/toaster";
import { AuthProvider } from './providers/AuthProvider';

// Pages
import Index from './pages/Index';
import CabsPage from './pages/CabsPage';
import ToursPage from './pages/ToursPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import AdminBookingsPage from './pages/AdminBookingsPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleMapsProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/cabs" element={<CabsPage />} />
                <Route path="/cabs/:tripType" element={<CabsPage />} />
                <Route path="/tours" element={<ToursPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/bookings" element={<AdminBookingsPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/booking/:bookingId" element={<BookingConfirmationPage />} />
              </Routes>
              <Toaster />
              <ToastToaster />
            </div>
          </Router>
        </GoogleMapsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
