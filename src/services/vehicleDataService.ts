import { CabType } from '@/types/cab';
import { apiBaseUrl, getApiUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { toast } from 'sonner';
import { forceRefreshVehicles } from '@/utils/apiHelper';

// Shorter cache durations to ensure fresher data
const JSON_CACHE_DURATION = 5 * 1000; // 5 seconds
const API_CACHE_DURATION = 3 * 1000; // 3 seconds
const ADMIN_CACHE_DURATION = 0; // No caching for admin views

// Store fetched vehicle data in memory to reduce API calls
let cachedVehicles: {
  json?: { data: CabType[], timestamp: number },
  api?: { data: CabType[], timestamp: number },
  fallback?: { data: CabType[], timestamp: number }
} = {};

// Keep track of last successful refresh
let lastSuccessfulRefresh = 0;
let pendingRefreshPromise: Promise<CabType[]> | null = null;

// Add throttling for cache clearing to prevent cascading refreshes
let lastCacheClearTime = 0;
const CACHE_CLEAR_THROTTLE = 1000; // 1 second minimum between cache clears
let clearingInProgress = false;
let cacheOperationsQueue: Array<() => Promise<void>> = [];

// Default vehicles as last resort fallback (should never be used if database connection works)
const DEFAULT_VEHICLES: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    price: 2500,
    pricePerKm: 14,
    image: '/cars/sedan.png',
    amenities: ['AC', 'Bottle Water', 'Music System'],
    description: 'Comfortable sedan suitable for 4 passengers.',
    ac: true,
    nightHaltCharge: 700,
    driverAllowance: 250,
    isActive: true
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    price: 3200,
    pricePerKm: 18,
    image: '/cars/ertiga.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
    description: 'Spacious SUV suitable for 6 passengers.',
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  },
  {
    id: 'innova_crysta',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    price: 3800,
    pricePerKm: 20,
    image: '/cars/innova.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
    description: 'Premium SUV with ample space for 7 passengers.',
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  }
];

// Process operation queue one at a time
const processQueue = async () => {
  if (cacheOperationsQueue.length === 0 || clearingInProgress) {
    return;
  }

  clearingInProgress = true;
  try {
    const operation = cacheOperationsQueue.shift();
    if (operation) {
      await operation();
    }
  } catch (error) {
    console.error('Error processing cache operation:', error);
  } finally {
    clearingInProgress = false;
    if (cacheOperationsQueue.length > 0) {
      setTimeout(processQueue, 50); // Process next operation after a short delay
    }
  }
};

/**
 * Clear all vehicle data caches with throttling to prevent infinite loops
 */
export const clearVehicleDataCache = () => {
  const now = Date.now();
  
  // If we've cleared the cache recently, throttle to prevent cascading refreshes
  if (now - lastCacheClearTime < CACHE_CLEAR_THROTTLE) {
    console.log(`Throttling cache clear operation (last clear was ${now - lastCacheClearTime}ms ago)`);
    return;
  }
  
  lastCacheClearTime = now;
  
  // Queue the operation instead of executing immediately
  cacheOperationsQueue.push(async () => {
    console.log('Clearing vehicle data cache');
    cachedVehicles = {};
    lastSuccessfulRefresh = 0;
    pendingRefreshPromise = null;
    
    try {
      // Clear all localStorage cache keys related to vehicles
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('cachedVehicles') || key.startsWith('localVehicles') || key.startsWith('cabOptions_'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      localStorage.removeItem('cachedVehicles');
      localStorage.removeItem('cachedVehiclesTimestamp');
      localStorage.removeItem('localVehicles');
    } catch (e) {
      console.error('Error clearing cached vehicles from localStorage:', e);
    }
    
    // Dispatch event to notify components about the cache clear
    window.dispatchEvent(new CustomEvent('vehicle-data-cache-cleared', {
      detail: { timestamp: Date.now() }
    }));
  });
  
  // Start processing the queue
  processQueue();
};

/**
 * Refresh vehicle data from database and persistence layer
 * Prioritizes database over static JSON
 */
const refreshVehicleData = async (forceRefresh = false, includeInactive = false): Promise<CabType[]> => {
  try {
    // First, try direct database endpoints with priority flags
    const endpoints = [
      // Prioritize direct database endpoints
      `api/admin/direct-vehicle-modify.php?action=load&includeInactive=${includeInactive}&_t=${Date.now()}&priorityDb=true`,
      `api/admin/vehicles-data.php?_t=${Date.now()}&includeInactive=${includeInactive}&force=${forceRefresh}&priorityDb=true`,
      `api/admin/get-vehicles.php?_t=${Date.now()}&includeInactive=${includeInactive}&priorityDb=true`,
      // Add admin endpoint specifically for fare management
      `api/admin/direct-vehicle-pricing.php?action=load_vehicles&_t=${Date.now()}&priorityDb=true`
    ];
    
    let vehicles: CabType[] | null = null;
    let errorMessage = '';
    
    // Try each endpoint in sequence with a shorter timeout to avoid long waits
    for (const endpoint of endpoints) {
      try {
        console.log(`Fetching vehicle data from: ${window.location.origin}/${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5 second timeout
        
        const response = await fetch(getApiUrl(endpoint), {
          method: 'GET',
          headers: {
            ...forceRefreshHeaders,
            'X-Admin-Mode': includeInactive ? 'true' : 'false',
            'X-Bypass-Cache': 'true',
            'X-Database-First': 'true',
            'X-Priority-DB': 'true'
          },
          cache: 'no-store', // Force fresh request
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is OK
        if (!response.ok) {
          errorMessage += `Endpoint ${endpoint} returned ${response.status}. `;
          continue;
        }
        
        // Get response text
        const text = await response.text();
        
        // Skip HTML responses (PHP errors)
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
          errorMessage += `Endpoint ${endpoint} returned HTML instead of JSON. `;
          continue;
        }
        
        // Parse JSON
        const data = JSON.parse(text);
        
        // Validate response structure
        if (data.vehicles && Array.isArray(data.vehicles)) {
          vehicles = data.vehicles;
          console.log(`Successfully loaded ${vehicles.length} vehicles from primary API`);
          break;
        } else if (data.status === 'success' && data.data && Array.isArray(data.data)) {
          vehicles = data.data;
          console.log(`Successfully loaded ${vehicles.length} vehicles from API endpoint`);
          break;
        } else if (Array.isArray(data)) {
          vehicles = data;
          console.log(`Successfully loaded ${vehicles.length} vehicles from API array`);
          break;
        }
        
        errorMessage += `Endpoint ${endpoint} returned invalid data structure. `;
      } catch (error) {
        console.error(`Error fetching vehicles from ${endpoint}:`, error);
        errorMessage += `Endpoint ${endpoint} error: ${error instanceof Error ? error.message : 'Unknown error'}. `;
      }
    }
    
    // If we have vehicles from an API, cache them and return
    if (vehicles && vehicles.length > 0) {
      // Cache the result
      cachedVehicles.api = { data: vehicles, timestamp: Date.now() };
      lastSuccessfulRefresh = Date.now();
      
      // Cache in localStorage too
      try {
        localStorage.setItem('cachedVehicles', JSON.stringify(vehicles));
        localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
      } catch (e) {
        console.warn('Could not cache vehicles in localStorage:', e);
      }
      
      // Cache by tripType for faster access
      try {
        localStorage.setItem('cabOptions_all', JSON.stringify(vehicles));
        localStorage.setItem('cabOptions_all_timestamp', Date.now().toString());
      } catch (e) {
        console.warn('Could not cache by trip type:', e);
      }
      
      console.log(`Refreshed and cached ${vehicles.length} vehicles`);
      
      // Notify listeners
      window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
        detail: { count: vehicles.length, source: 'api', timestamp: Date.now() }
      }));
      
      return vehicles;
    }
    
    // If direct API calls failed, try the static JSON file as a fallback
    console.log('Fetching from vehicles.json');
    const jsonResponse = await fetch(getApiUrl(`data/vehicles.json?_t=${Date.now()}`), {
      cache: 'no-store', // Disable caching for this request
      headers: {
        'X-Priority-DB': 'true'
      }
    });
    
    if (jsonResponse.ok) {
      const jsonVehicles = await jsonResponse.json();
      cachedVehicles.json = { data: jsonVehicles, timestamp: Date.now() };
      console.log(`Successfully loaded ${jsonVehicles.length} vehicles from JSON file`);
      
      // Store JSON vehicles in localStorage as a fallback
      try {
        localStorage.setItem('localVehicles', JSON.stringify(jsonVehicles));
      } catch (e) {
        console.warn('Could not store JSON vehicles in localStorage:', e);
      }
      
      // Dispatch event for JSON fallback
      window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
        detail: { count: jsonVehicles.length, source: 'json', timestamp: Date.now() }
      }));
      
      // Only return JSON vehicles if we didn't get API vehicles
      return jsonVehicles;
    }
    
    console.warn('Could not fetch vehicles from any source.');
    throw new Error(`Failed to fetch vehicles: ${errorMessage}`);
  } catch (error) {
    console.error('Error refreshing vehicle data:', error);
    
    // Try to force a refresh using the specialized function
    try {
      await forceRefreshVehicles();
    } catch (refreshError) {
      console.error('Error forcing refresh of vehicles:', refreshError);
    }
    
    // If we have cached data, return it as a last resort
    if (cachedVehicles.api && cachedVehicles.api.data.length > 0) {
      return cachedVehicles.api.data;
    }
    
    if (cachedVehicles.json && cachedVehicles.json.data.length > 0) {
      return cachedVehicles.json.data;
    }
    
    // Try localStorage cache
    try {
      const localStorageVehicles = localStorage.getItem('cachedVehicles') || localStorage.getItem('localVehicles');
      if (localStorageVehicles) {
        const parsed = JSON.parse(localStorageVehicles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`Found ${parsed.length} vehicles in localStorage cache`);
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    
    // As a last resort, return default vehicles
    console.warn('Using default vehicles as last resort');
    return DEFAULT_VEHICLES;
  }
};

/**
 * Fetches vehicle data, prioritizing database over static JSON
 * @param forceRefresh Force data refresh (bypass cache)
 * @param includeInactive Include inactive vehicles in the result
 */
export const getVehicleData = async (forceRefresh = false, includeInactive = false): Promise<CabType[]> => {
  console.log(`getVehicleData called with forceRefresh=${forceRefresh}, includeInactive=${includeInactive}`);
  
  // Always force refresh on page load
  const alwaysForceRefresh = localStorage.getItem('forceCacheRefresh') === 'true';
  if (alwaysForceRefresh) {
    console.log('Forcing refresh due to forceCacheRefresh flag');
    forceRefresh = true;
  }
  
  // Check if we're currently refreshing
  if (pendingRefreshPromise) {
    console.log('Reusing pending refresh promise');
    try {
      return await pendingRefreshPromise;
    } catch (error) {
      console.error('Pending refresh promise failed:', error);
      // Continue to refresh again
    }
  }
  
  // Check if we have valid cache
  const now = Date.now();
  const cacheDuration = includeInactive ? ADMIN_CACHE_DURATION : (forceRefresh ? 0 : API_CACHE_DURATION);
  
  // Admin views should always get fresh data
  if (includeInactive) {
    forceRefresh = true;
  }
  
  // Check API cache first (database-sourced data)
  if (!forceRefresh && 
      cachedVehicles.api && 
      cachedVehicles.api.data.length > 0 && 
      now - cachedVehicles.api.timestamp < cacheDuration) {
    console.log(`Using API cache with ${cachedVehicles.api.data.length} vehicles`);
    return filterVehicles(cachedVehicles.api.data, includeInactive);
  }
  
  // Then check JSON cache (static file data)
  if (!forceRefresh && 
      cachedVehicles.json && 
      cachedVehicles.json.data.length > 0 && 
      now - cachedVehicles.json.timestamp < JSON_CACHE_DURATION) {
    console.log(`Using JSON cache with ${cachedVehicles.json.data.length} vehicles`);
    return filterVehicles(cachedVehicles.json.data, includeInactive);
  }
  
  // We need to refresh, store the promise
  pendingRefreshPromise = refreshVehicleData(forceRefresh, includeInactive);
  
  try {
    // Wait for refresh to complete
    const vehicles = await pendingRefreshPromise;
    // Return filtered vehicles
    return filterVehicles(vehicles, includeInactive);
  } catch (error) {
    console.error('Error refreshing vehicle data:', error);
    throw error;
  } finally {
    // Clear the pending promise
    pendingRefreshPromise = null;
  }
};

/**
 * Filter vehicles based on the includeInactive flag
 */
const filterVehicles = (vehicles: CabType[], includeInactive: boolean): CabType[] => {
  if (includeInactive) {
    return vehicles;
  }
  
  return vehicles.filter(vehicle => vehicle.isActive !== false);
};

/**
 * Get vehicle types (distinct cab types)
 */
export const getVehicleTypes = async (): Promise<string[]> => {
  try {
    const vehicles = await getVehicleData(true, true); // Force refresh and include inactive
    return vehicles.map(v => v.id);
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    return DEFAULT_VEHICLES.map(v => v.id);
  }
};

/**
 * Get all vehicles with full details, including inactive ones
 * Used for admin management interfaces
 */
export const getAllVehiclesForAdmin = async (forceRefresh = true): Promise<CabType[]> => {
  console.log('Getting all vehicles for admin interface');
  
  // Use a throttling mechanism to prevent too frequent refreshes
  const now = Date.now();
  const lastAdminRefreshTime = parseInt(localStorage.getItem('lastAdminVehicleRefresh') || '0', 10);
  const ADMIN_REFRESH_THROTTLE = 2000; // 2 seconds minimum between admin refreshes
  
  // Skip forced refresh if we've done one recently
  if (forceRefresh && now - lastAdminRefreshTime < ADMIN_REFRESH_THROTTLE) {
    console.log(`Admin refresh throttled (last refresh was ${now - lastAdminRefreshTime}ms ago)`);
    forceRefresh = false;
  } else if (forceRefresh) {
    localStorage.setItem('lastAdminVehicleRefresh', now.toString());
  }
  
  try {
    // Only clear cache if not throttled
    if (forceRefresh) {
      // Queue the cache clear instead of doing it synchronously
      cacheOperationsQueue.push(async () => {
        console.log('Clearing cache for admin vehicles');
        // Clear specific admin-related cache entries
        localStorage.removeItem('adminVehicles');
      });
      processQueue();
    }
    
    // Try direct admin endpoints first
    const adminEndpoints = [
      `api/admin/direct-vehicle-modify.php?action=load&includeInactive=true&_t=${Date.now()}&priorityDb=true`,
      `api/admin/vehicles-data.php?_t=${Date.now()}&includeInactive=true&force=${forceRefresh}&priorityDb=true`,
      `api/admin/get-vehicles.php?_t=${Date.now()}&includeInactive=true&priorityDb=true`
    ];
    
    for (const endpoint of adminEndpoints) {
      try {
        console.log(`Fetching admin vehicles from: ${window.location.origin}/${endpoint}`);
        const response = await fetch(getApiUrl(endpoint), {
          method: 'GET',
          headers: {
            ...forceRefreshHeaders,
            'X-Admin-Mode': 'true',
            'X-Bypass-Cache': 'true',
            'X-Database-First': 'true',
            'X-Priority-DB': 'true'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) continue;
        
        const text = await response.text();
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) continue;
        
        const data = JSON.parse(text);
        let vehicles: CabType[] = [];
        
        if (data.vehicles && Array.isArray(data.vehicles)) {
          vehicles = data.vehicles;
        } else if (data.data && Array.isArray(data.data)) {
          vehicles = data.data;
        } else if (Array.isArray(data)) {
          vehicles = data;
        }
        
        if (vehicles.length > 0) {
          console.log(`Found ${vehicles.length} vehicles from admin endpoint`);
          
          // Cache these results for quick access
          try {
            localStorage.setItem('adminVehicles', JSON.stringify(vehicles));
            localStorage.setItem('adminVehiclesTimestamp', Date.now().toString());
          } catch (e) {
            console.warn('Could not cache admin vehicles:', e);
          }
          
          // Dispatch event only if we actually got new data and it's a forced refresh
          if (forceRefresh) {
            window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
              detail: { count: vehicles.length, source: 'admin-api', timestamp: Date.now() }
            }));
          }
          
          return vehicles;
        }
      } catch (error) {
        console.error(`Error with admin endpoint ${endpoint}:`, error);
      }
    }
    
    // Fall back to regular method with includeInactive
    return await getVehicleData(forceRefresh, true);
  } catch (error) {
    console.error('Error getting all vehicles for admin:', error);
    
    // Try localStorage as last resort
    try {
      const cachedAdminVehicles = localStorage.getItem('adminVehicles');
      if (cachedAdminVehicles) {
        const vehicles = JSON.parse(cachedAdminVehicles);
        console.log('Using cached admin vehicles from localStorage:', vehicles.length);
        return vehicles;
      }
    } catch (e) {
      console.error('Error reading admin vehicles from localStorage:', e);
    }
    
    return DEFAULT_VEHICLES;
  }
};
