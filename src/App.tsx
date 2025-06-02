
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PoolingAuthProvider } from '@/providers/PoolingAuthProvider';

// Pooling Pages
import PoolingLoginPage from '@/pages/PoolingLoginPage';
import PoolingGuestPage from '@/pages/PoolingGuestPage';
import PoolingProviderPage from '@/pages/PoolingProviderPage';
import PoolingAdminPage from '@/pages/PoolingAdminPage';
import GuestDashboardPage from '@/pages/GuestDashboardPage';

function App() {
  return (
    <Router>
      <PoolingAuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Pooling Routes */}
            <Route path="/pooling/login" element={<PoolingLoginPage />} />
            <Route path="/pooling/dashboard" element={<PoolingGuestPage />} />
            <Route path="/pooling/provider" element={<PoolingProviderPage />} />
            <Route path="/pooling/admin" element={<PoolingAdminPage />} />
            <Route path="/pooling" element={<GuestDashboardPage />} />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/pooling/login" replace />} />
          </Routes>
          
          <Toaster position="top-right" />
        </div>
      </PoolingAuthProvider>
    </Router>
  );
}

export default App;
