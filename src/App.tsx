import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import CabsPage from "@/pages/CabsPage";
import ToursPage from "@/pages/ToursPage";
import BookingConfirmationPage from "@/pages/BookingConfirmationPage";
import ReceiptPage from "@/pages/ReceiptPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NotFound from "@/pages/NotFound";
import DashboardPage from "@/pages/DashboardPage";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import GoogleMapsProvider from "@/providers/GoogleMapsProvider";
import './App.css';

const App = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <GoogleMapsProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cabs/:tripType?" element={<CabsPage />} />
            <Route path="/tours" element={<ToursPage />} />
            <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
            <Route path="/receipt/:bookingId" element={<ReceiptPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" closeButton richColors />
      </GoogleMapsProvider>
    </ThemeProvider>
  );
};

export default App;
