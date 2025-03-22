
import { clearFareCache } from '@/lib/fareCalculationService';

// Export the fare service with all fare-related methods
export const fareService = {
  // Clear the fare calculation cache to force recalculation
  clearCache: () => {
    console.log('Clearing fare calculation cache');
    clearFareCache();
  }
};
