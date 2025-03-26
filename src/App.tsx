
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import Home from '@/pages/Home';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import LocalTaxi from '@/pages/LocalTaxi';
import AirportTransfer from '@/pages/AirportTransfer';
import OutstationCabs from '@/pages/OutstationCabs';
import Payment from '@/pages/Payment';
import TourPackages from '@/pages/TourPackages';
import BookingSuccess from '@/pages/BookingSuccess';
import TourDetails from '@/pages/TourDetails';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Admin from '@/pages/Admin';
import TripFares from '@/pages/Admin/TripFares';
import Dashboard from '@/pages/Admin/Dashboard';
import LocalPackageFare from '@/pages/Admin/LocalPackageFare';
import AirportFares from '@/pages/Admin/AirportFares';
import { VehicleManagement } from '@/pages/Admin/VehicleManagement';
import { clearFareCache } from '@/lib/fareCalculationService';

function App() {
  // Clear fare cache when app loads
  useEffect(() => {
    const forceCacheRefresh = localStorage.getItem('forceCacheRefresh') === 'true';
    clearFareCache(forceCacheRefresh);
    
    // Add event listener for fare cache cleared events
    const handleFareCacheCleared = () => {
      console.log('Fare cache cleared event received in App component');
      // You could do additional app-wide updates here if needed
    };
    
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
    };
  }, []);
  
  return (
    <Router>
      <Header />
      <div className="min-h-[calc(100vh-64px-200px)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/local-taxi" element={<LocalTaxi />} />
          <Route path="/airport-transfer" element={<AirportTransfer />} />
          <Route path="/outstation-cabs" element={<OutstationCabs />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/tour-packages" element={<TourPackages />} />
          <Route path="/tour-details/:id" element={<TourDetails />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<Admin />}>
            <Route index element={<Dashboard />} />
            <Route path="trip-fares" element={<TripFares />} />
            <Route path="local-fares" element={<LocalPackageFare />} />
            <Route path="airport-fares" element={<AirportFares />} />
            <Route path="vehicles" element={<VehicleManagement />} />
          </Route>
        </Routes>
      </div>
      <Footer />
      <Toaster />
    </Router>
  );
}

export default App;
