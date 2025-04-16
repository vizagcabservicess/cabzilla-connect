
/**
 * Standard package normalization utility to ensure consistent package IDs across the application
 */

// Standard mapping for package IDs with strict formatting
const standardPackageIds: Record<string, string> = {
  // 4hr packages
  "4hr_40km": "4hrs-40km",
  "04hr_40km": "4hrs-40km",
  "04hrs_40km": "4hrs-40km",
  "4hrs_40km": "4hrs-40km",
  "4hours_40km": "4hrs-40km",
  "4hr-40km": "4hrs-40km",
  "4hrs": "4hrs-40km",
  "4hours": "4hrs-40km",
  "40km": "4hrs-40km",
  
  // 8hr packages
  "8hr_80km": "8hrs-80km",
  "08hr_80km": "8hrs-80km",
  "08hrs_80km": "8hrs-80km",
  "8hrs_80km": "8hrs-80km",
  "8hours_80km": "8hrs-80km",
  "8hr-80km": "8hrs-80km",
  "8hrs": "8hrs-80km",
  "8hours": "8hrs-80km",
  "80km": "8hrs-80km",
  
  // 10hr packages
  "10hr_100km": "10hrs-100km",
  "10hrs_100km": "10hrs-100km",
  "10hours_100km": "10hrs-100km",
  "10hr-100km": "10hrs-100km",
  "10hrs": "10hrs-100km",
  "10hours": "10hrs-100km",
  "100km": "10hrs-100km"
};

// Standard vehicle ID mapping to ensure consistency
const standardVehicleIds: Record<string, string> = {
  // Sedan variants
  "sedan": "sedan",
  "swift dzire": "dzire_cng",
  "dzire": "dzire_cng",
  "cng": "dzire_cng",
  "dzire_cng": "dzire_cng",
  "swift": "dzire_cng",
  
  // Ertiga variants
  "ertiga": "ertiga",
  "maruti_ertiga": "ertiga",
  "maruti ertiga": "ertiga",
  
  // Innova variants
  "innova": "innova_crysta",
  "crysta": "innova_crysta",
  "innova_crysta": "innova_crysta",
  "innova crysta": "innova_crysta",
  "toyota_innova": "innova_crysta",
  "toyota innova": "innova_crysta",
  
  // Innova Hycross
  "hycross": "innova_hycross",
  "hi-cross": "innova_hycross",
  "hi_cross": "innova_hycross",
  "innova_hycross": "innova_hycross",
  "innova hycross": "innova_hycross",
  "mpv": "innova_hycross",
  
  // Tempo Traveller variants
  "tempo": "tempo_traveller",
  "traveller": "tempo_traveller",
  "tempo_traveller": "tempo_traveller",
  "tempo traveller": "tempo_traveller"
};

// Cache for normalized values to improve performance
const normalizationCache = {
  packageIds: new Map<string, string>(),
  vehicleIds: new Map<string, string>()
};

// Timestamps for event throttling
const lastEventTimes: Record<string, number> = {
  packageChange: 0,
  vehicleChange: 0,
  priceCalculation: 0,
  fareRefresh: 0
};

// Constants for throttling durations
const THROTTLE_DURATIONS = {
  PACKAGE_CHANGE: 3000,
  VEHICLE_CHANGE: 3000,
  PRICE_CALCULATION: 5000,
  FARE_REFRESH: 10000,
  SHORT: 1000,
  MEDIUM: 3000,
  LONG: 5000
};

// Fare cache management
interface FareCacheEntry {
  price: number;
  timestamp: number;
  source: string;
  expiresAt: number;
}

const fareCache: Map<string, FareCacheEntry> = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes default TTL

/**
 * Centralized fare cache management to reduce redundant API calls
 */
export const fareManager = {
  /**
   * Store fare in the cache with expiration
   */
  storeFare(vehicleId: string, packageId: string, price: number, source: string = 'api'): void {
    if (!vehicleId || !packageId || price <= 0) return;
    
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    const cacheKey = `${normalizedVehicleId}_${normalizedPackageId}`;
    
    const entry: FareCacheEntry = {
      price,
      timestamp: Date.now(),
      source,
      expiresAt: Date.now() + CACHE_TTL
    };
    
    // Update in-memory cache
    fareCache.set(cacheKey, entry);
    
    // Update localStorage for persistence
    try {
      localStorage.setItem(`fare_${cacheKey}`, JSON.stringify(entry));
      
      // Also update specific format keys for backward compatibility
      localStorage.setItem(`fare_local_${normalizedVehicleId}_${normalizedPackageId}`, price.toString());
      localStorage.setItem(`fare_local_${normalizedVehicleId}`, price.toString());
      localStorage.setItem(`package_price_${normalizedPackageId}_${normalizedVehicleId}`, price.toString());
      
      console.log(`Stored fare in cache: ${normalizedVehicleId}, ${normalizedPackageId}, ₹${price} (source: ${source})`);
    } catch (error) {
      console.error('Error storing fare in localStorage:', error);
    }
    
    // Dispatch an event with limited frequency
    this.notifyFareUpdate(normalizedVehicleId, normalizedPackageId, price, source);
  },
  
  /**
   * Get fare from cache if available and not expired
   */
  getFare(vehicleId: string, packageId: string): { price: number, source: string } | null {
    if (!vehicleId || !packageId) return null;
    
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    const cacheKey = `${normalizedVehicleId}_${normalizedPackageId}`;
    
    // First try memory cache
    const memoryCached = fareCache.get(cacheKey);
    if (memoryCached && memoryCached.expiresAt > Date.now()) {
      console.log(`Retrieved fare from memory cache: ${normalizedVehicleId}, ${normalizedPackageId}, ₹${memoryCached.price}`);
      return { price: memoryCached.price, source: memoryCached.source };
    }
    
    // Then try localStorage
    try {
      const storedEntry = localStorage.getItem(`fare_${cacheKey}`);
      if (storedEntry) {
        const parsed = JSON.parse(storedEntry) as FareCacheEntry;
        
        // Check if entry is still valid
        if (parsed.expiresAt > Date.now()) {
          // Update memory cache
          fareCache.set(cacheKey, parsed);
          console.log(`Retrieved fare from localStorage: ${normalizedVehicleId}, ${normalizedPackageId}, ₹${parsed.price}`);
          return { price: parsed.price, source: parsed.source };
        }
      }
      
      // Try legacy cache formats
      const legacyKeys = [
        `fare_local_${normalizedVehicleId}_${normalizedPackageId}`,
        `fare_local_${normalizedVehicleId}`,
        `package_price_${normalizedPackageId}_${normalizedVehicleId}`
      ];
      
      for (const key of legacyKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          const price = parseInt(value, 10);
          if (!isNaN(price) && price > 0) {
            // Create a proper cache entry
            this.storeFare(normalizedVehicleId, normalizedPackageId, price, 'legacy-cache');
            console.log(`Retrieved fare from legacy cache (${key}): ${normalizedVehicleId}, ${normalizedPackageId}, ₹${price}`);
            return { price, source: 'legacy-cache' };
          }
        }
      }
    } catch (error) {
      console.error('Error retrieving fare from localStorage:', error);
    }
    
    return null;
  },
  
  /**
   * Clear fare cache for all or specific entries
   */
  clearCache(vehicleId?: string, packageId?: string): void {
    if (!vehicleId && !packageId) {
      // Clear all cache
      fareCache.clear();
      
      // Clear localStorage cache entries
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith('fare_') || key.startsWith('package_price_')) {
            localStorage.removeItem(key);
          }
        }
        console.log('Cleared all fare cache');
      } catch (error) {
        console.error('Error clearing fare cache from localStorage:', error);
      }
      
      return;
    }
    
    // Clear specific cache entries
    const normalizedVehicleId = vehicleId ? normalizeVehicleId(vehicleId) : '';
    const normalizedPackageId = packageId ? normalizePackageId(packageId) : '';
    
    // Clear from memory cache
    if (normalizedVehicleId && normalizedPackageId) {
      const cacheKey = `${normalizedVehicleId}_${normalizedPackageId}`;
      fareCache.delete(cacheKey);
      
      // Clear from localStorage
      try {
        localStorage.removeItem(`fare_${cacheKey}`);
        localStorage.removeItem(`fare_local_${normalizedVehicleId}_${normalizedPackageId}`);
        localStorage.removeItem(`package_price_${normalizedPackageId}_${normalizedVehicleId}`);
        console.log(`Cleared fare cache for ${normalizedVehicleId}, ${normalizedPackageId}`);
      } catch (error) {
        console.error('Error clearing specific fare cache from localStorage:', error);
      }
    } else if (normalizedVehicleId) {
      // Clear all entries for this vehicle
      for (const [key, _] of fareCache.entries()) {
        if (key.startsWith(`${normalizedVehicleId}_`)) {
          fareCache.delete(key);
        }
      }
      
      // Clear from localStorage
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if ((key.startsWith('fare_') || key.startsWith('package_price_')) && 
              key.includes(normalizedVehicleId)) {
            localStorage.removeItem(key);
          }
        }
        console.log(`Cleared all fare cache for vehicle ${normalizedVehicleId}`);
      } catch (error) {
        console.error('Error clearing vehicle fare cache from localStorage:', error);
      }
    }
  },
  
  /**
   * Notify components about fare updates with throttling
   */
  notifyFareUpdate(vehicleId: string, packageId: string, price: number, source: string): void {
    if (shouldThrottle('fare-notification', 1000)) return;
    
    try {
      // Dispatch a single fare update event
      window.dispatchEvent(new CustomEvent('fare-updated', {
        detail: {
          vehicleId,
          packageId,
          price,
          source,
          timestamp: Date.now()
        }
      }));
      
      console.log(`Dispatched fare-updated event for ${vehicleId}, ${packageId}, ₹${price}`);
    } catch (error) {
      console.error('Error dispatching fare-updated event:', error);
    }
  }
};

// Load fare cache from localStorage on startup
try {
  const keys = Object.keys(localStorage);
  let loadedEntries = 0;
  
  for (const key of keys) {
    if (key.startsWith('fare_') && !key.startsWith('fare_local_')) {
      try {
        const storedEntry = localStorage.getItem(key);
        if (storedEntry) {
          const parsed = JSON.parse(storedEntry) as FareCacheEntry;
          // Only load if not expired
          if (parsed.expiresAt > Date.now()) {
            fareCache.set(key.replace('fare_', ''), parsed);
            loadedEntries++;
          }
        }
      } catch (e) {
        // Ignore parsing errors for individual entries
      }
    }
  }
  
  console.log(`Loaded ${loadedEntries} fare cache entries from localStorage`);
} catch (error) {
  console.error('Error loading fare cache from localStorage:', error);
}

/**
 * Throttle function to prevent excessive calls
 * @param key - Unique key to track this throttle type
 * @param duration - Time in ms to throttle
 * @returns Whether the action should be throttled (true) or allowed (false)
 */
export const shouldThrottle = (key: string, duration: number = THROTTLE_DURATIONS.MEDIUM): boolean => {
  const now = Date.now();
  const lastTime = lastEventTimes[key] || 0;
  
  if (now - lastTime < duration) {
    console.log(`[Throttle] ${key} throttled (${now - lastTime}ms < ${duration}ms)`);
    return true;
  }
  
  lastEventTimes[key] = now;
  return false;
};

/**
 * Normalizes package IDs to ensure consistency across the application
 * Uses caching to improve performance for repeated calls
 * @param packageId - The package ID to normalize
 * @returns The normalized package ID
 */
export const normalizePackageId = (packageId?: string): string => {
  if (!packageId) return "8hrs-80km"; // Default package
  
  // Check cache first for performance
  const cachedResult = normalizationCache.packageIds.get(packageId);
  if (cachedResult) return cachedResult;
  
  // Convert to lowercase and standardize separators
  const normalizedId = packageId.toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace('hrs-', 'hr_')
    .replace('hr-', 'hr_');
  
  // First check for exact matches in our standardization map
  if (standardPackageIds[normalizedId]) {
    const result = standardPackageIds[normalizedId];
    normalizationCache.packageIds.set(packageId, result);
    return result;
  }
  
  // Then check for substring matches
  let result: string;
  if (normalizedId.includes('10') || normalizedId.includes('100')) {
    result = "10hrs-100km";
  } else if (normalizedId.includes('8') || normalizedId.includes('80')) {
    result = "8hrs-80km";
  } else if (normalizedId.includes('4') || normalizedId.includes('40')) {
    result = "4hrs-40km";
  } else {
    // Default to 8hr package if no match
    result = "8hrs-80km";
  }
  
  // Cache the result for future calls
  normalizationCache.packageIds.set(packageId, result);
  return result;
};

/**
 * Normalizes vehicle IDs to ensure consistency across the application
 * Uses caching to improve performance for repeated calls
 * @param vehicleId - The vehicle ID to normalize
 * @returns The normalized vehicle ID
 */
export const normalizeVehicleId = (vehicleId?: string): string => {
  if (!vehicleId) return ''; 
  
  // Check cache first for performance
  const cachedResult = normalizationCache.vehicleIds.get(vehicleId);
  if (cachedResult) return cachedResult;
  
  // Convert to lowercase, trim and standardize
  const normalizedId = vehicleId.toLowerCase().trim();
  
  // Check direct mapping first
  if (standardVehicleIds[normalizedId]) {
    const result = standardVehicleIds[normalizedId];
    normalizationCache.vehicleIds.set(vehicleId, result);
    return result;
  }
  
  // Special case checks for partial matches
  let result: string;
  if (normalizedId.includes('hycross') || 
      normalizedId.includes('hi-cross') ||
      normalizedId.includes('hi_cross') ||
      normalizedId === 'mpv') {
    result = 'innova_hycross';
  } else if (normalizedId.includes('crysta') || 
      (normalizedId.includes('innova') && !normalizedId.includes('hycross'))) {
    result = 'innova_crysta';
  } else if (normalizedId.includes('tempo') || normalizedId.includes('traveller')) {
    result = 'tempo_traveller';
  } else if (normalizedId.includes('dzire') || 
      normalizedId.includes('cng') || 
      normalizedId.includes('swift')) {
    result = 'dzire_cng';
  } else if (normalizedId.includes('ertiga')) {
    result = 'ertiga';
  } else if (normalizedId === 'sedan') {
    result = 'sedan';
  } else {
    // Remove spaces and special characters for other vehicle types
    result = normalizedId.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
  
  // Cache the result for future calls
  normalizationCache.vehicleIds.set(vehicleId, result);
  return result;
};

/**
 * Gets the display name for a package
 * @param packageId - The package ID
 * @returns The display name for the package
 */
export const getPackageDisplayName = (packageId: string): string => {
  const normalizedId = normalizePackageId(packageId);
  
  switch (normalizedId) {
    case '4hrs-40km':
      return '4 Hours / 40 KM';
    case '8hrs-80km':
      return '8 Hours / 80 KM';
    case '10hrs-100km':
      return '10 Hours / 100 KM';
    default:
      return packageId.replace(/-/g, ' ').replace(/_/g, ' ');
  }
};

/**
 * Gets the standard hourly package options
 * @returns Array of hourly package options
 */
export const getStandardHourlyPackageOptions = () => [
  { value: "4hrs-40km", label: "4 Hours / 40 KM" },
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

/**
 * Dispatches events to notify components of package changes with throttling
 * @param packageId - The selected package ID
 */
export const notifyPackageChange = (packageId: string) => {
  if (!packageId) return;
  
  // Throttle notifications to prevent event loops
  if (shouldThrottle('packageChange', THROTTLE_DURATIONS.PACKAGE_CHANGE)) {
    console.log(`Package change notification throttled`);
    return;
  }
  
  const normalizedId = normalizePackageId(packageId);
  
  try {
    // Dispatch fewer events with more consolidated data
    window.dispatchEvent(new CustomEvent('hourly-package-selected', {
      detail: { 
        packageId: normalizedId,
        originalPackageId: packageId,
        packageName: getPackageDisplayName(normalizedId),
        timestamp: Date.now(),
        // Include more data to reduce need for multiple events
        forceRefresh: false
      }
    }));
    
    console.log(`Dispatched package change event for ${normalizedId}`);
  } catch (error) {
    console.error('Error dispatching package change event:', error);
  }
};

/**
 * Saves package selection to storage
 * @param packageId - The package ID to save
 */
export const savePackageSelection = (packageId: string) => {
  if (!packageId) return;
  
  const normalizedId = normalizePackageId(packageId);
  
  try {
    // Save to sessionStorage for the current session
    sessionStorage.setItem('hourlyPackage', normalizedId);
    
    // Save to localStorage for persistence across sessions
    localStorage.setItem('selected_package', normalizedId);
    
    console.log(`Saved package selection: ${normalizedId}`);
  } catch (error) {
    console.error('Error saving package selection:', error);
  }
};

/**
 * Force refresh fare calculations with throttling
 */
export const forceFareRecalculation = () => {
  if (shouldThrottle('fareRefresh', THROTTLE_DURATIONS.FARE_REFRESH)) {
    console.log('Fare recalculation throttled');
    return;
  }
  
  console.log('Forcing fare recalculation');
  window.dispatchEvent(new CustomEvent('force-fare-recalculation'));
};

/**
 * Clears fare caches for a specific package
 * @param packageId - Package ID to clear cache for
 */
export const clearPackageFareCache = (packageId: string) => {
  if (!packageId) return;
  
  try {
    const normalizedId = normalizePackageId(packageId);
    fareManager.clearCache(undefined, normalizedId);
    console.log(`Cleared cache entries for package ${normalizedId}`);
  } catch (error) {
    console.error('Error clearing package fare cache:', error);
  }
};

/**
 * Gets price from local storage cache if available
 * @param vehicleId - The vehicle ID
 * @param packageId - The package ID
 * @returns The cached price or undefined if not cached
 */
export const getCachedPrice = (vehicleId: string, packageId: string): number | undefined => {
  try {
    if (!vehicleId || !packageId) return undefined;
    
    // Use the central fare manager
    const result = fareManager.getFare(vehicleId, packageId);
    return result ? result.price : undefined;
  } catch (error) {
    console.error('Error retrieving cached price:', error);
    return undefined;
  }
};

/**
 * Saves price to local storage with consistent cache keys
 * @param vehicleId - The vehicle ID 
 * @param packageId - The package ID
 * @param price - The price to save
 */
export const saveCachedPrice = (vehicleId: string, packageId: string, price: number): void => {
  try {
    if (!vehicleId || !packageId || !price || price <= 0) return;
    
    // Use the central fare manager
    fareManager.storeFare(vehicleId, packageId, price, 'manual-save');
  } catch (error) {
    console.error('Error saving cached price:', error);
  }
};

/**
 * Dispatches a single consolidated fare update event
 * to synchronize fare across components
 */
export const synchronizeFareAcrossComponents = (vehicleId: string, packageId: string, price: number) => {
  if (shouldThrottle('fare-sync', 1000)) return;
  
  try {
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    
    // Use the central fare manager
    fareManager.storeFare(normalizedVehicleId, normalizedPackageId, price, 'synchronize');
  } catch (error) {
    console.error('Error synchronizing fare:', error);
  }
};
