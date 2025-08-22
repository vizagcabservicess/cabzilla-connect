import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { PoolingAuthProvider } from "@/providers/PoolingAuthProvider";
import { GoogleMapsProvider } from "@/providers/GoogleMapsProvider";
import { ScrollToTop } from "@/components/ScrollToTop";

import router from './routes'; // Only for original approach

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboardPage"));
const CustomerDashboard = lazy(() => import("./pages/DashboardPage"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const PoolingPage = lazy(() => import("./pages/PoolingPage"));
const PoolingLoginPage = lazy(() => import("./pages/PoolingLoginPage"));
const PoolingProviderPage = lazy(() => import("./pages/PoolingProviderPage"));
const PoolingAdminPage = lazy(() => import("./pages/PoolingAdminPage"));
const GuestDashboardPage = lazy(() => import("./pages/GuestDashboardPage"));

// Loading component for route transitions
const RouteLoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: '14px',
    color: '#666'
  }}>
    Loading...
  </div>
);

const USE_ORIGINAL_APP = true; // Toggle this to switch approaches
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <AuthProvider>
      <PoolingAuthProvider>
        {USE_ORIGINAL_APP ? (
          <GoogleMapsProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <RouterProvider router={router} />
          </GoogleMapsProvider>
        ) : (
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<RouteLoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/customer" element={<CustomerDashboard />} />
                <Route path="/driver" element={<DriverDashboard />} />
                <Route path="/pooling" element={<PoolingPage />} />
                <Route path="/pooling/login" element={<PoolingLoginPage />} />
                <Route path="/pooling/provider" element={<PoolingProviderPage />} />
                <Route path="/pooling/admin" element={<PoolingAdminPage />} />
                <Route path="/pooling/guest" element={<GuestDashboardPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        )}
      </PoolingAuthProvider>
    </AuthProvider>
    
  </TooltipProvider>
);

export default App;
