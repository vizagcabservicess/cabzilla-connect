
import { createBrowserRouter } from 'react-router-dom';
import Index from './pages/Index';
import CabsPage from './pages/CabsPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/cabs/:tripType?',
    element: <CabsPage />,
  },
  {
    path: '/booking-confirmation',
    element: <BookingConfirmationPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
