
import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { router } from '@/routes';
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
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
