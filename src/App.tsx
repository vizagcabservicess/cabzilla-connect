
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { PoolingAuthProvider } from "@/providers/PoolingAuthProvider";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import PoolingPage from "./pages/PoolingPage";
import PoolingLoginPage from "./pages/PoolingLoginPage";
import PoolingProviderPage from "./pages/PoolingProviderPage";
import PoolingAdminPage from "./pages/PoolingAdminPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
            </Routes>
          </PoolingAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
