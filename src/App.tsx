
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/providers/AuthProvider';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import PaymentPage from '@/pages/PaymentPage';
import NotFound from '@/pages/NotFound';
import { AdminProtectedRoute, CustomerProtectedRoute, DriverProtectedRoute } from '@/components/ProtectedRoute';
import { ScrollToTop } from '@/components/ScrollToTop';
import PoolingPage from '@/pages/PoolingPage';
import PoolingAuthPage from '@/pages/PoolingAuthPage';
import PoolingBookingPage from '@/pages/PoolingBookingPage';
import PoolingAdminDashboard from '@/pages/PoolingAdminDashboard';
import PoolingProviderDashboard from '@/pages/PoolingProviderDashboard';
import CreateRidePage from '@/components/pooling/CreateRidePage';
import { PoolingProtectedRoute, PoolingGuestRoute, PoolingProviderRoute, PoolingAdminRoute } from '@/components/pooling/PoolingProtectedRoute';
import { PoolingAuthProvider } from '@/providers/PoolingAuthProvider';
import Index from '@/pages/Index';

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
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* Protected Customer Routes */}
                <Route element={<CustomerProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/payment" element={<PaymentPage />} />
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

                {/* Catch-all route for 404s */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </PoolingAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
