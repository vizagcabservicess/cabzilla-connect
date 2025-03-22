
import { clearFareCache } from '@/lib/fareCalculationService';

// Export the fare service with all fare-related methods
export const fareService = {
  // Clear the fare calculation cache to force recalculation
  clearCache: () => {
    console.log('Clearing all fare calculation caches');
    
    // Clear the fareCalculationService cache
    clearFareCache();
    
    // Clear all localStorage caches that could affect pricing
    try {
      // Clear any cached fare data
      localStorage.removeItem('cachedFareData');
      localStorage.removeItem('cabPricing');
      localStorage.removeItem('fareCache');
      localStorage.removeItem('vehicles');
      localStorage.removeItem('vehicleTypes');
      localStorage.removeItem('fares');
      localStorage.removeItem('pricing');
      
      // Add timestamps to force refresh next time data is fetched
      localStorage.setItem('fareDataLastRefreshed', Date.now().toString());
      localStorage.setItem('vehicleDataLastRefreshed', Date.now().toString());
      
      // Remove any trip-related cache that might use old pricing
      localStorage.removeItem('selectedCab');
      localStorage.removeItem('tripDetails');
      localStorage.removeItem('bookingDetails');
      
      // Also try to clear sessionStorage
      sessionStorage.removeItem('cachedFareData');
      sessionStorage.removeItem('cabPricing');
      sessionStorage.removeItem('fareCache');
      sessionStorage.removeItem('selectedCab');
      
      console.log('All fare and vehicle data caches cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
};
