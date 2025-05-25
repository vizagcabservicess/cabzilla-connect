
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { AdminProtectedRoute, CustomerProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import BookingPage from "./pages/BookingPage";
import QuotePage from "./pages/QuotePage";
import ContactPage from "./pages/ContactPage";
import PackagesPage from "./pages/PackagesPage";
import ToursPage from "./pages/ToursPage";
import PaymentsPage from "./pages/PaymentsPage";

// Auth Pages
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminBookingCreationPage from "./pages/AdminBookingCreationPage";
import PoolingPage from "./pages/PoolingPage";
import PoolingBookingPage from "./pages/PoolingBookingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/quote" element={<QuotePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/tours" element={<ToursPage />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Pooling Routes */}
            <Route path="/pooling" element={<PoolingPage />} />
            <Route path="/pooling/book/:rideId" element={<PoolingBookingPage />} />
            
            {/* Protected Customer Routes */}
            <Route path="/customer" element={<CustomerProtectedRoute />}>
              <Route path="dashboard" element={<div>Customer Dashboard</div>} />
            </Route>
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AdminProtectedRoute />}>
              <Route index element={<AdminDashboard />} />
              <Route path="create-booking" element={<AdminBookingCreationPage />} />
              <Route path="payments" element={<PaymentsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
