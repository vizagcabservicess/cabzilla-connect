
import { createBrowserRouter } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import CabsPage from './pages/CabsPage';
import ToursPage from './pages/ToursPage';
import BookingEditPage from './pages/BookingEditPage';
import ReceiptPage from './pages/ReceiptPage';
import { VehicleManagement } from './pages/Admin/VehicleManagement';
import Header from '@/components/Navbar';
import Footer from '@/components/Footer';

// Create a layout component that includes the Header and Footer
const Layout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    <div className="min-h-[calc(100vh-64px-200px)]">
      {children}
    </div>
    <Footer />
  </>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Index /></Layout>,
  },
  {
    path: '/login',
    element: <Layout><LoginPage /></Layout>,
  },
  {
    path: '/signup',
    element: <Layout><SignupPage /></Layout>,
  },
  {
    path: '/dashboard',
    element: <Layout><DashboardPage /></Layout>,
  },
  {
    path: '/admin',
    element: <Layout><AdminDashboardPage /></Layout>,
  },
  {
    path: '/admin/vehicles',
    element: <Layout><VehicleManagement /></Layout>,
  },
  {
    path: '/booking/:bookingId/confirmation',
    element: <Layout><BookingConfirmationPage /></Layout>,
  },
  {
    path: '/booking-confirmation',
    element: <Layout><BookingConfirmationPage /></Layout>,
  },
  {
    path: '/booking/:bookingId/edit',
    element: <Layout><BookingEditPage /></Layout>,
  },
  {
    path: '/receipt/:bookingId',
    element: <Layout><ReceiptPage /></Layout>,
  },
  {
    path: '/cabs',
    element: <Layout><CabsPage /></Layout>,
  },
  {
    path: '/tours',
    element: <Layout><ToursPage /></Layout>,
  },
  {
    path: '*',
    element: <Layout><NotFound /></Layout>,
  },
]);

export default router;
