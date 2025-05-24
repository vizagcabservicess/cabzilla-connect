
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastToaster } from "@/components/ui/toaster";

// Pages
import HomePage from './pages/HomePage';
import CabsPage from './pages/CabsPage';
import ToursPage from './pages/ToursPage';
import ContactPage from './pages/ContactPage';
import AdminDashboard from './pages/AdminDashboard';
import BookingPage from './pages/BookingPage';
import UserDashboard from './pages/UserDashboard';
import PoolingPage from './pages/PoolingPage';
import PoolingBookingPage from './pages/PoolingBookingPage';
import PoolingDashboard from './pages/admin/PoolingDashboard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/cabs" element={<CabsPage />} />
              <Route path="/cabs/:tripType" element={<CabsPage />} />
              <Route path="/tours" element={<ToursPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/pooling" element={<PoolingDashboard />} />
              <Route path="/booking/:bookingId" element={<BookingPage />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/pooling" element={<PoolingPage />} />
              <Route path="/pooling/book/:rideId" element={<PoolingBookingPage />} />
            </Routes>
            <Toaster />
            <ToastToaster />
          </div>
        </Router>
      </GoogleMapsProvider>
    </QueryClientProvider>
  );
}

export default App;
