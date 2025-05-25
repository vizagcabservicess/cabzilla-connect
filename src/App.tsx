import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastToaster } from "@/components/ui/toaster";
import { AuthProvider } from './providers/AuthProvider';
import CreateRidePage from './components/pooling/CreateRidePage';

// Pages
import Index from './pages/Index';
import CabsPage from './pages/CabsPage';
import ToursPage from './pages/ToursPage';
import ContactPage from './pages/ContactPage';
import AdminDashboard from './pages/AdminDashboardPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import PoolingPage from './pages/PoolingPage';
import PoolingBookingPage from './pages/PoolingBookingPage';
import PoolingDashboard from './pages/admin/PoolingDashboard';

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
                <Route path="/cabs" element={<CabsPage />} />
                <Route path="/cabs/:tripType" element={<CabsPage />} />
                <Route path="/tours" element={<ToursPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/pooling" element={<PoolingDashboard />} />
                <Route path="/booking/:bookingId" element={<BookingConfirmationPage />} />
                <Route path="/pooling" element={<PoolingPage />} />
                <Route path="/pooling/book/:rideId" element={<PoolingBookingPage />} />
                <Route path="/pooling/create" element={<CreateRidePage />} />
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
