import { CabType } from '@/types/cab';
import { apiBaseUrl, getApiUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { toast } from 'sonner';
import { forceRefreshVehicles } from '@/utils/apiHelper';

// Shorter cache durations to ensure fresher data
const JSON_CACHE_DURATION = 10 * 1000; // 10 seconds
const API_CACHE_DURATION = 5 * 1000; // 5 seconds
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

/**
 * Clear all vehicle data caches
 */
export const clearVehicleDataCache = () => {
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
};

/**
 * Refresh vehicle data from database and persistence layer
 * Prioritizes database over static JSON
 */
const refreshVehicleData = async (forceRefresh = false, includeInactive = false): Promise<CabType[]> => {
  try {
    // First, try direct database endpoints
    const endpoints = [
      // Prioritize direct database endpoints
      `api/admin/direct-vehicle-modify.php?action=load&includeInactive=${includeInactive}&_t=${Date.now()}`,
      `api/admin/vehicles-data.php?_t=${Date.now()}&includeInactive=${includeInactive}&force=${forceRefresh}`,
      `api/admin/get-vehicles.php?_t=${Date.now()}&includeInactive=${includeInactive}`
    ];
    
    let vehicles: CabType[] | null = null;
    let errorMessage = '';
    
    // Try each endpoint in sequence until we get valid data
    for (const endpoint of endpoints) {
      try {
        console.log(`Fetching vehicle data from: ${window.location.origin}/${endpoint}`);
        const response = await fetch(getApiUrl(endpoint), {
          method: 'GET',
          headers: {
            ...forceRefreshHeaders,
            'X-Admin-Mode': includeInactive ? 'true' : 'false',
            'X-Bypass-Cache': 'true',
            'X-Database-First': 'true'
          },
          cache: 'no-store' // Force fresh request
        });
        
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
      cache: 'no-store' // Disable caching for this request
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
    const vehicles = await getVehicleData();
    return vehicles.map(v => v.id);
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    return DEFAULT_VEHICLES.map(v => v.id);
  }
};
