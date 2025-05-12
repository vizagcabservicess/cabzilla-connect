
import { createBrowserRouter } from 'react-router-dom';

import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import HomePage from './pages/HomePage';
import CabsPage from './pages/CabsPage';
import BookingDetailsPage from './pages/BookingDetailsPage';
import BookingsPage from './pages/BookingsPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import BookingsManagementPage from './pages/BookingsManagementPage';
import DriversManagementPage from './pages/DriversManagementPage';
import VehiclesManagementPage from './pages/VehiclesManagementPage';
import PaymentsManagementPage from './pages/PaymentsManagementPage';
import UsersManagementPage from './pages/UsersManagementPage';
import GstReportPage from './pages/GstReportPage';
import ExpensesPage from './pages/ExpensesPage';
import PayrollPage from './pages/PayrollPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { path: '', element: <HomePage /> },
      { path: 'cabs', element: <CabsPage /> },
      { path: 'booking-details/:id', element: <BookingDetailsPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { path: '', element: <DashboardPage /> },
      { path: 'bookings', element: <BookingsManagementPage /> },
      { path: 'drivers', element: <DriversManagementPage /> },
      { path: 'vehicles', element: <VehiclesManagementPage /> },
      { path: 'payments', element: <PaymentsManagementPage /> },
      { path: 'users', element: <UsersManagementPage /> },
      { path: 'gst-report', element: <GstReportPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'payroll', element: <PayrollPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
]);
