
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { PoolingAuthProvider } from "@/providers/PoolingAuthProvider";
import { GoogleMapsProvider } from "@/providers/GoogleMapsProvider";
import router from './routes'; // Only for original approach
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboardPage";
import CustomerDashboard from "./pages/DashboardPage";
import DriverDashboard from "./pages/DriverDashboard";
import PoolingPage from "./pages/PoolingPage";
import PoolingLoginPage from "./pages/PoolingLoginPage";
import PoolingProviderPage from "./pages/PoolingProviderPage";
import PoolingAdminPage from "./pages/PoolingAdminPage";
import GuestDashboardPage from "./pages/GuestDashboardPage";

const queryClient = new QueryClient();
const USE_ORIGINAL_APP = true; // Toggle this to switch approaches
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {USE_ORIGINAL_APP ? (
        <AuthProvider>
          <PoolingAuthProvider>
            <GoogleMapsProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <RouterProvider router={router} />
            </GoogleMapsProvider>
          </PoolingAuthProvider>
        </AuthProvider>
      ) : (
        <BrowserRouter>
          <AuthProvider>
            <PoolingAuthProvider>
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
            </PoolingAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      )}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
