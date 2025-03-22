
import { clearFareCache } from '@/lib/fareCalculationService';

// Export the fare service with all fare-related methods
export const fareService = {
  // Clear the fare calculation cache to force recalculation
  clearCache: () => {
    console.log('Clearing fare calculation cache');
    clearFareCache();
    
    // Also clear localStorage caches if they exist
    try {
      // Clear any cached fare data
      localStorage.removeItem('cachedFareData');
      localStorage.removeItem('cabPricing');
      localStorage.removeItem('fareCache');
      
      // Add timestamps to force refresh next time data is fetched
      localStorage.setItem('fareDataLastRefreshed', Date.now().toString());
      
      console.log('All fare caches cleared');
    } catch (error) {
      console.error('Error clearing localStorage cache:', error);
    }
  }
};
