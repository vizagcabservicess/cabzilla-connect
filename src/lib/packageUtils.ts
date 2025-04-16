
import { toast } from 'sonner';
import { hourlyPackages } from './packageData';

// Throttle timestamps to prevent excessive operations
const throttleTimestamps: Record<string, number> = {};

/**
 * Return standard hourly package options for dropdowns and selection menus
 */
export const getStandardHourlyPackageOptions = () => {
  return [
    { value: '4hrs-40km', label: '4 Hours / 40 KM' },
    { value: '8hrs-80km', label: '8 Hours / 80 KM' },
    { value: '10hrs-100km', label: '10 Hours / 100 KM' }
  ];
};

/**
 * Check if an operation should be throttled based on the last execution time
 */
export const shouldThrottle = (operationKey: string, throttleDuration: number = 1000): boolean => {
  const now = Date.now();
  const lastTime = throttleTimestamps[operationKey] || 0;
  
  if (now - lastTime < throttleDuration) {
    console.log(`Throttling operation '${operationKey}' (${Math.floor((now - lastTime))}ms < ${throttleDuration}ms)`);
    return true;
  }
  
  throttleTimestamps[operationKey] = now;
  return false;
};

/**
 * Normalize package ID to ensure consistent format
 */
export const normalizePackageId = (packageId?: string): string => {
  if (!packageId) return '8hrs-80km'; // Default
  
  const normalized = packageId.toLowerCase().trim();
  
  // First check for exact matches
  if (normalized === '10hrs-100km' || normalized === '10hrs_100km' || normalized === '10 hours') {
    return '10hrs-100km';
  }
  
  if (normalized === '8hrs-80km' || normalized === '8hrs_80km' || normalized === '8 hours') {
    return '8hrs-80km';
  }
  
  if (normalized === '4hrs-40km' || normalized === '4hrs_40km' || normalized === '4 hours') {
    return '4hrs-40km';
  }
  
  // Then check for substring matches
  if (normalized.includes('10') && (normalized.includes('hr') || normalized.includes('hour') || normalized.includes('100km'))) {
    return '10hrs-100km';
  }
  
  if (normalized.includes('8') && (normalized.includes('hr') || normalized.includes('hour') || normalized.includes('80km'))) {
    return '8hrs-80km';
  }
  
  if (normalized.includes('4') && (normalized.includes('hr') || normalized.includes('hour') || normalized.includes('40km'))) {
    return '4hrs-40km';
  }
  
  console.log(`Warning: Unable to match package ID "${packageId}" to a known package, defaulting to 8hrs-80km`);
  return '8hrs-80km'; // Default fallback
};

/**
 * Normalize vehicle ID for consistency
 */
export const normalizeVehicleId = (vehicleId?: string): string => {
  if (!vehicleId) return ''; 
  
  // Convert to lowercase and replace spaces with underscores
  const normalized = vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Special case to ensure MPV is always mapped correctly - check this first
  if (normalized === 'mpv' || 
      normalized === 'innova hycross' || 
      normalized === 'innovahycross' ||
      normalized === 'innova_hycross' ||
      normalized.includes('hycross') ||
      normalized.includes('hi_cross') ||
      normalized.includes('hi-cross')) {
    return 'innova_hycross';
  }
  
  // Handle other special cases
  if (normalized.includes('crysta') || 
      (normalized.includes('innova') && !normalized.includes('hycross'))) {
    return 'innova_crysta';
  }
  
  if (normalized.includes('tempo')) {
    return 'tempo_traveller';
  }
  
  if (normalized.includes('dzire') || 
      normalized === 'cng' || 
      normalized.includes('cng')) {
    return 'dzire_cng';
  }
  
  return normalized;
};

/**
 * Get display name for a package ID
 */
export const getPackageDisplayName = (packageId: string): string => {
  const normalized = normalizePackageId(packageId);
  
  if (normalized === '10hrs-100km') {
    return '10 Hours / 100 KM';
  } else if (normalized === '8hrs-80km') {
    return '8 Hours / 80 KM';
  } else if (normalized === '4hrs-40km') {
    return '4 Hours / 40 KM';
  }
  
  return packageId;
};

/**
 * Save package selection to local storage
 */
export const savePackageSelection = (packageId: string): void => {
  try {
    const normalized = normalizePackageId(packageId);
    localStorage.setItem('selectedPackage', normalized);
    console.log(`Saved package selection: ${normalized}`);
  } catch (error) {
    console.error('Error saving package selection:', error);
  }
};

/**
 * Notify other components about package change
 */
export const notifyPackageChange = (packageId: string): void => {
  if (shouldThrottle('notify-package-change', 500)) return;
  
  try {
    const normalized = normalizePackageId(packageId);
    
    // Dispatch custom event for components to listen for
    window.dispatchEvent(new CustomEvent('package-changed', {
      detail: {
        packageId: normalized,
        timestamp: Date.now()
      }
    }));
    
    console.log(`Notified package change: ${normalized}`);
  } catch (error) {
    console.error('Error notifying package change:', error);
  }
};

/**
 * Clear package fare cache to force refresh of fares
 */
export const clearPackageFareCache = (packageId?: string): void => {
  if (shouldThrottle('clear-package-cache', 3000)) return;
  
  try {
    if (packageId) {
      const normalized = normalizePackageId(packageId);
      
      // Clear only for this package
      Object.keys(window.localPackagePriceCache || {}).forEach(key => {
        if (key.endsWith(normalized)) {
          delete window.localPackagePriceCache[key];
        }
      });
      
      console.log(`Cleared package fare cache for ${normalized}`);
    } else {
      // Clear all package fares
      window.localPackagePriceCache = {};
      console.log('Cleared all package fare cache');
    }
    
    // Force refresh event
    forceFareRecalculation();
  } catch (error) {
    console.error('Error clearing package fare cache:', error);
  }
};

/**
 * Force recalculation of fares
 */
export const forceFareRecalculation = (): void => {
  if (shouldThrottle('force-fare-recalc', 5000)) return;
  
  console.log('Forcing fare recalculation...');
  
  try {
    window.dispatchEvent(new CustomEvent('force-fare-recalculation', {
      detail: {
        timestamp: Date.now()
      }
    }));
  } catch (error) {
    console.error('Error dispatching force-fare-recalculation event:', error);
  }
};

/**
 * Get cached price from localStorage
 */
export const getCachedPrice = (vehicleId: string, packageId: string): number => {
  try {
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    const cacheKey = `${normalizedVehicleId}_${normalizedPackageId}`;
    
    if (window.localPackagePriceCache && window.localPackagePriceCache[cacheKey]) {
      return window.localPackagePriceCache[cacheKey];
    }
    
    // Alternative cache key format
    const altCacheKey = `fare_local_${normalizedVehicleId}_${normalizedPackageId}`;
    const localStorageValue = localStorage.getItem(altCacheKey);
    
    if (localStorageValue) {
      const parsedValue = parseInt(localStorageValue, 10);
      if (!isNaN(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting cached price:', error);
    return 0;
  }
};

/**
 * Save price to cache
 */
export const saveCachedPrice = (vehicleId: string, packageId: string, price: number): void => {
  try {
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    const cacheKey = `${normalizedVehicleId}_${normalizedPackageId}`;
    
    if (typeof window !== 'undefined') {
      if (!window.localPackagePriceCache) {
        window.localPackagePriceCache = {};
      }
      
      window.localPackagePriceCache[cacheKey] = price;
      
      // Also save to localStorage for persistence
      localStorage.setItem(`fare_local_${normalizedVehicleId}_${normalizedPackageId}`, price.toString());
      
      console.log(`Cached price for ${cacheKey}: ${price}`);
    }
  } catch (error) {
    console.error('Error saving cached price:', error);
  }
};

/**
 * Synchronize fare information across components
 */
export const synchronizeFareAcrossComponents = (vehicleId: string, packageId: string, price: number, source: string): void => {
  if (shouldThrottle(`sync-fare-${vehicleId}-${packageId}`, 1000)) return;
  
  try {
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    
    // Save to cache
    saveCachedPrice(normalizedVehicleId, normalizedPackageId, price);
    
    // Update fare manager
    fareManager.storeFare(normalizedVehicleId, normalizedPackageId, price, source);
    
    // Notify components
    fareManager.notifyFareUpdate(normalizedVehicleId, normalizedPackageId, price, source);
  } catch (error) {
    console.error('Error synchronizing fare:', error);
  }
};

/**
 * Centralized fare manager for consistent fare handling
 */
export const fareManager = {
  // Internal storage
  _fares: new Map<string, { price: number, timestamp: number, source: string }>(),
  
  /**
   * Store fare information
   */
  storeFare(vehicleId: string, packageId: string, price: number, source: string = 'unknown'): void {
    try {
      const normalizedVehicleId = normalizeVehicleId(vehicleId);
      const normalizedPackageId = normalizePackageId(packageId);
      const key = `${normalizedVehicleId}_${normalizedPackageId}`;
      
      this._fares.set(key, {
        price,
        timestamp: Date.now(),
        source
      });
      
      // Also save to cache
      saveCachedPrice(normalizedVehicleId, normalizedPackageId, price);
    } catch (error) {
      console.error('Error storing fare:', error);
    }
  },
  
  /**
   * Get fare information
   */
  getFare(vehicleId: string, packageId: string): { price: number, timestamp: number, source: string } | null {
    try {
      const normalizedVehicleId = normalizeVehicleId(vehicleId);
      const normalizedPackageId = normalizePackageId(packageId);
      const key = `${normalizedVehicleId}_${normalizedPackageId}`;
      
      const fare = this._fares.get(key);
      
      if (fare) {
        return fare;
      }
      
      // Check cache
      const cachedPrice = getCachedPrice(normalizedVehicleId, normalizedPackageId);
      
      if (cachedPrice > 0) {
        // Store in memory
        this._fares.set(key, {
          price: cachedPrice,
          timestamp: Date.now(),
          source: 'cache'
        });
        
        return {
          price: cachedPrice,
          timestamp: Date.now(),
          source: 'cache'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting fare:', error);
      return null;
    }
  },
  
  /**
   * Notify components about fare update
   */
  notifyFareUpdate(vehicleId: string, packageId: string, price: number, source: string): void {
    if (shouldThrottle(`notify-fare-${vehicleId}-${packageId}`, 1000)) return;
    
    try {
      const normalizedVehicleId = normalizeVehicleId(vehicleId);
      const normalizedPackageId = normalizePackageId(packageId);
      
      console.log(`Notifying fare update: ${normalizedVehicleId}, ${normalizedPackageId}, ${price} (source: ${source})`);
      
      window.dispatchEvent(new CustomEvent('fare-updated', {
        detail: {
          vehicleId: normalizedVehicleId,
          packageId: normalizedPackageId,
          price,
          source,
          timestamp: Date.now()
        }
      }));
    } catch (error) {
      console.error('Error notifying fare update:', error);
    }
  },
  
  /**
   * Clear all fares
   */
  clearFares(): void {
    console.log('Clearing all fares');
    this._fares.clear();
    window.localPackagePriceCache = {};
  }
};
