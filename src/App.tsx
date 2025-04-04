
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';

// Layout components
import MainLayout from '@/layouts/MainLayout';
import AdminLayout from '@/layouts/AdminLayout';
import LoadingSpinner from '@/components/LoadingSpinner';

// Pages
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import BookingPage from '@/pages/BookingPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import BookingConfirmationPage from '@/pages/BookingConfirmationPage';
import BookingDetailsPage from '@/pages/BookingDetailsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminBookingsPage from '@/pages/admin/AdminBookingsPage';
import AdminVehiclesPage from '@/pages/admin/AdminVehiclesPage';
import AdminDriversPage from '@/pages/admin/AdminDriversPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminFaresPage from '@/pages/admin/AdminFaresPage';
import AdminSystemStatus from './components/admin/AdminSystemStatus';

// Auth components
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';

// Conditionally import ReactQueryDevtools
const ReactQueryDevtools = lazy(() => 
  import('@tanstack/react-query-devtools').then(mod => ({
    default: mod.ReactQueryDevtools
  }))
);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy-loaded components
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const BookingsPage = lazy(() => import('@/pages/BookingsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <Router>
          <Toaster position="top-center" richColors />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="booking" element={<BookingPage />} />
              <Route path="booking/confirmation" element={<BookingConfirmationPage />} />
              <Route path="booking/:bookingId" element={<BookingDetailsPage />} />
              <Route
                path="services"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ServicesPage />
                  </Suspense>
                }
              />
              <Route
                path="faq"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <FaqPage />
                  </Suspense>
                }
              />
              <Route
                path="terms"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <TermsPage />
                  </Suspense>
                }
              />
              <Route
                path="privacy"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <PrivacyPage />
                  </Suspense>
                }
              />
            </Route>

            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route
                path="profile"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="my-bookings"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <BookingsPage />
                  </Suspense>
                }
              />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="vehicles" element={<AdminVehiclesPage />} />
              <Route path="drivers" element={<AdminDriversPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="fares" element={<AdminFaresPage />} />
              <Route path="system-status" element={<AdminSystemStatus />} />
              <Route
                path="users"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminUsersPage />
                  </Suspense>
                }
              />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminReportsPage />
                  </Suspense>
                }
              />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
      
      {/* Conditionally render ReactQueryDevtools */}
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

export default App;
