
/**
 * Cache management utility to clear all application caches
 */

import { clearFareCache } from './fareCalculationService';
import { clearVehicleDataCache } from '@/services/vehicleDataService';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';

/**
 * Clears all caches in the application
 * @param showToast Whether to show a toast notification
 * @returns Promise that resolves when all caches are cleared
 */
export const clearAllCaches = async (showToast: boolean = true): Promise<void> => {
  if (showToast) {
    toast.info('Clearing all application caches...');
  }
  
  console.log('Clearing all application caches');
  
  // Clear all fare-related caches
  clearFareCache();
  fareService.clearCache();
  
  // Clear vehicle data cache
  clearVehicleDataCache();
  
  // Clear localStorage cache items
  const cacheKeys = [
    'cabFares',
    'cachedVehicles',
    'cachedVehiclesTimestamp',
    'fareDataLastRefreshed',
    'fareDataTimestamp',
    'fareCacheLastCleared',
    'forceCacheRefresh',
    'forceTripFaresRefresh',
    'globalFareRefreshToken',
    'localPackagePriceMatrixUpdated',
    'lastTripType',
    'lastTripMode',
    'lastFormClear'
  ];
  
  cacheKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove ${key} from localStorage:`, e);
    }
  });
  
  // Clear sessionStorage items
  const sessionKeys = [
    'dropLocation',
    'pickupLocation',
    'dropCoordinates', 
    'pickupCoordinates',
    'dropLocationObj',
    'pickupLocationObj',
    'selectedCab',
    'hourlyPackage',
    'tourPackage',
    'bookingDetails',
    'calculatedFares',
    'distance',
    'airportDirection',
    'tripType',
    'tripMode',
    'cabFares',
    'cabOptionsRefreshedOnMount'
  ];
  
  sessionKeys.forEach(key => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove ${key} from sessionStorage:`, e);
    }
  });
  
  // Dispatch cache cleared events
  window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
    detail: { timestamp: Date.now(), forceRefresh: true }
  }));
  
  window.dispatchEvent(new CustomEvent('vehicle-data-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
  
  if (showToast) {
    toast.success('All caches cleared successfully');
  }
  
  console.log('All application caches cleared successfully');
  
  return Promise.resolve();
};

/**
 * Gets the API base URL with cache buster
 * @returns The API base URL with timestamp
 */
export const getApiUrlWithCacheBuster = (): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';
  const timestamp = Date.now();
  return `${baseUrl}/api/?_t=${timestamp}`;
};

/**
 * Resets the application to a clean state
 * Clears all caches and reloads the page
 */
export const resetApplication = (): void => {
  toast.info('Resetting application to clean state...');
  clearAllCaches(false);
  
  // Set a flag to indicate a reset is in progress
  sessionStorage.setItem('appReset', 'true');
  
  // Force reload the page after a short delay
  setTimeout(() => {
    window.location.reload();
  }, 500);
};
