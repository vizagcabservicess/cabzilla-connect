
import { createBrowserRouter } from 'react-router-dom';
import Index from './pages/Index';
import CabsPage from './pages/CabsPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import NotFound from './pages/NotFound';
import ToursPage from './pages/ToursPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BookingEditPage from './pages/BookingEditPage';
import ReceiptPage from './pages/ReceiptPage';
import { FallbackErrorComponent } from './components/FallbackErrorComponent';
import ErrorBoundaryClass from './components/ErrorBoundary';

// Wrap component with error boundary
const withErrorBoundary = (Component: React.ComponentType<any>) => {
  return (props: any) => (
    <ErrorBoundaryClass fallback={<FallbackErrorComponent />}>
      <Component {...props} />
    </ErrorBoundaryClass>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: withErrorBoundary(Index)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/cabs/:tripType?',
    element: withErrorBoundary(CabsPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/booking-confirmation',
    element: withErrorBoundary(BookingConfirmationPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/tours',
    element: withErrorBoundary(ToursPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/login',
    element: withErrorBoundary(LoginPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/signup',
    element: withErrorBoundary(SignupPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/dashboard',
    element: withErrorBoundary(DashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  // IMPORTANT: Multiple route patterns for booking edit for better compatibility
  {
    path: '/booking/:id/edit',
    element: withErrorBoundary(BookingEditPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/booking/edit/:id',
    element: withErrorBoundary(BookingEditPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/book/edit/:id',
    element: withErrorBoundary(BookingEditPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  // Multiple route patterns for receipts
  {
    path: '/receipt/:id',
    element: withErrorBoundary(ReceiptPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/booking/:id/receipt',
    element: withErrorBoundary(ReceiptPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/booking/receipt/:id',
    element: withErrorBoundary(ReceiptPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/booking/:id',
    element: withErrorBoundary(ReceiptPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  // CRITICAL FIX: Add explicit cancel routes
  {
    path: '/booking/:id/cancel',
    element: withErrorBoundary(DashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/booking/cancel/:id',
    element: withErrorBoundary(DashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/admin',
    element: withErrorBoundary(AdminDashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/admin/drivers',
    element: withErrorBoundary(AdminDashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/admin/customers',
    element: withErrorBoundary(AdminDashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/admin/reports',
    element: withErrorBoundary(AdminDashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/admin/pricing',
    element: withErrorBoundary(AdminDashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '/admin/notifications',
    element: withErrorBoundary(AdminDashboardPage)(),
    errorElement: <FallbackErrorComponent />,
  },
  {
    path: '*',
    element: withErrorBoundary(NotFound)(),
    errorElement: <FallbackErrorComponent />,
  },
]);
