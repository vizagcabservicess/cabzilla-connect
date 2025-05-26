
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './providers/AuthProvider';
import { PoolingProtectedRoute } from './components/pooling/PoolingProtectedRoute';
import { PoolingAuthProvider } from './providers/PoolingAuthProvider';
import { PoolingGuestRoute } from './components/pooling/PoolingProtectedRoute';
import PoolingGuestPage from './pages/PoolingGuestPage';
import PoolingGuestDashboardPage from './pages/PoolingGuestDashboardPage';
import PoolingAuthPage from './pages/PoolingAuthPage';
import PoolingBookingPage from './pages/PoolingBookingPage';

function App() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <PoolingAuthProvider>
          <BrowserRouter>
            <div className="App">
              <Routes>
                {/* Pooling Routes */}
                <Route path="/pooling" element={<PoolingGuestPage />} />
                <Route path="/pooling/auth" element={<PoolingAuthPage />} />
                <Route path="/pooling/book/:rideId" element={<PoolingBookingPage />} />
                
                {/* Guest Routes */}
                <Route path="/pooling/guest" element={<PoolingGuestPage />} />
                <Route path="/pooling/guest/dashboard" element={<PoolingGuestDashboardPage />} />
                
                {/* Protected Pooling Routes */}
                <Route element={<PoolingProtectedRoute />}>
                  <Route path="/pooling/create" element={<div>Create Ride Page (Coming Soon)</div>} />
                </Route>
                
                <Route element={<PoolingGuestRoute />}>
                  <Route path="/pooling/guest/bookings" element={<PoolingGuestDashboardPage />} />
                </Route>

                {/* Default Route */}
                <Route path="/" element={<PoolingGuestPage />} />
                
                {/* Catch-all route */}
                <Route path="*" element={<div className="text-center py-16"><h1>Page Not Found</h1></div>} />
              </Routes>
            </div>
          </BrowserRouter>
        </PoolingAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
