
import { Routes, Route, Navigate } from 'react-router-dom';
import Index from '@/pages/Index';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import CabsPage from '@/pages/CabsPage';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import BookingConfirmationPage from '@/pages/BookingConfirmationPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import BookingEditPage from '@/pages/BookingEditPage';
import ReceiptPage from '@/pages/ReceiptPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import GoogleMapsProvider from './providers/GoogleMapsProvider';
import ToursPage from './pages/ToursPage';

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        const decoded = jwtDecode<{ user_id: number; role?: string }>(token);
        setUserRole(decoded.role || 'user');
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
      }
    }
    
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/cabs/:tripType?" element={<CabsPage />} />
          <Route path="/tours" element={<ToursPage />} />
          <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
          <Route path="/receipt/:id" element={<ReceiptPage />} />
          <Route 
            path="/dashboard" 
            element={
              localStorage.getItem('token') ? <DashboardPage /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/admin-dashboard/*" 
            element={
              localStorage.getItem('token') && userRole === 'admin' 
                ? <AdminDashboardPage /> 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/booking/edit/:id" 
            element={
              localStorage.getItem('token') ? <BookingEditPage /> : <Navigate to="/login" />
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </GoogleMapsProvider>
    </QueryClientProvider>
  );
}

export default App;
