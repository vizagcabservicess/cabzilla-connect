import { CabType } from '@/types/cab';
import { apiBaseUrl, getApiUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { toast } from 'sonner';
import { forceRefreshVehicles } from '@/utils/apiHelper';

// Significantly reduced cache durations to ensure fresher data
const JSON_CACHE_DURATION = 15 * 1000; // 15 seconds
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

// Default vehicles as fallback
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
 * Fetches vehicle data from database via API
 * @param forceRefresh Force data refresh (bypass cache)
 * @param includeInactive Include inactive vehicles in the result
 */
export const getVehicleData = async (forceRefresh = false, includeInactive = false): Promise<CabType[]> => {
  console.log(`getVehicleData called with forceRefresh=${forceRefresh}, includeInactive=${includeInactive}`);
  
  // If there's already a refresh in progress, wait for it
  if (pendingRefreshPromise && !includeInactive) {
    console.log('Reusing pending refresh promise');
    try {
      const vehicles = await pendingRefreshPromise;
      return filterVehicles(vehicles, includeInactive);
    } catch (error) {
      console.error('Pending refresh promise failed:', error);
      // Continue with new refresh
    }
  }
  
  const now = Date.now();
  const cacheBuster = `_t=${now}`;
  
  // Always force refresh for admin views
  if (includeInactive) {
    forceRefresh = true;
    console.log("Admin view detected (includeInactive=true), forcing refresh");
  }
  
  // Check if we've had a successful refresh recently
  const refreshCooldown = includeInactive ? ADMIN_CACHE_DURATION : 10000; // 10 seconds for normal view
  if (lastSuccessfulRefresh > 0 && now - lastSuccessfulRefresh < refreshCooldown && !forceRefresh) {
    console.log(`Skipping refresh, last successful refresh was ${Math.floor((now - lastSuccessfulRefresh)/1000)}s ago`);
    
    // If we have API cache, use it
    if (cachedVehicles.api && cachedVehicles.api.timestamp > lastSuccessfulRefresh) {
      console.log('Using API cache');
      return filterVehicles(cachedVehicles.api.data, includeInactive);
    }
  }
  
  // Define the refresh function
  const refreshVehicleData = async (): Promise<CabType[]> => {
    try {
      // First, try to force a refresh from persistent storage
      if (forceRefresh) {
        try {
          await forceRefreshVehicles();
        } catch (refreshError) {
          console.warn('Could not force refresh from persistent storage:', refreshError);
        }
      }
      
      // Try multiple endpoints for best results, with admin endpoints first for admin views
      let endpoints = [];
      
      // If in admin mode, prioritize admin endpoints
      if (includeInactive) {
        endpoints = [
          `/api/admin/vehicles-data.php?${cacheBuster}&includeInactive=true&force=true`, 
          `/api/vehicles-data.php?${cacheBuster}&includeInactive=true&force=true`,
          `/api/admin/get-vehicles.php?${cacheBuster}&includeInactive=true`,
          null // Marker for JSON file
        ];
      } else {
        endpoints = [
          `/api/vehicles-data.php?${cacheBuster}&includeInactive=${includeInactive ? 'true' : 'false'}&force=${forceRefresh ? 'true' : 'false'}`,
          `/api/admin/get-vehicles.php?${cacheBuster}&includeInactive=${includeInactive ? 'true' : 'false'}`,
          `/api/admin/vehicles-data.php?${cacheBuster}&includeInactive=${includeInactive ? 'true' : 'false'}&force=${forceRefresh ? 'true' : 'false'}`,
          null // Marker for JSON file
        ];
      }
      
      for (const endpoint of endpoints) {
        try {
          if (endpoint === null) {
            // Try local JSON file
            console.log('Fetching from vehicles.json');
            const jsonResponse = await fetch(`/data/vehicles.json?${cacheBuster}`, {
              headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!jsonResponse.ok) throw new Error('JSON fetch failed');
            
            const jsonData = await jsonResponse.json();
            if (Array.isArray(jsonData) && jsonData.length > 0) {
              const processedVehicles = processVehicles(jsonData);
              
              cachedVehicles.json = {
                data: processedVehicles,
                timestamp: now
              };
              
              saveToLocalStorage(processedVehicles);
              lastSuccessfulRefresh = now;
              
              console.log('Successfully loaded', processedVehicles.length, 'vehicles from JSON file');
              
              return filterVehicles(processedVehicles, includeInactive);
            }
          } else {
            // Try API endpoint - use normalized URL construction via window.location
            const baseUrl = window.location.origin;
            const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
            
            console.log(`Fetching vehicle data from: ${url}`);
            
            const headers = {
              ...forceRefreshHeaders,
              'X-Admin-Mode': includeInactive ? 'true' : 'false',
              'X-Bypass-Cache': 'true',
              'X-Force-Refresh': forceRefresh ? 'true' : 'false',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            };
            
            const response = await fetch(url, {
              headers,
              mode: 'cors',
              cache: 'no-store'
            });
            
            if (!response.ok) {
              throw new Error(`API response not OK: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
              console.log(`Received ${data.vehicles.length} vehicles from API:`, data.vehicles);
              
              const processedVehicles = processVehicles(data.vehicles);
              
              cachedVehicles.api = {
                data: processedVehicles,
                timestamp: now
              };
              
              saveToLocalStorage(processedVehicles);
              lastSuccessfulRefresh = now;
              
              console.log('Successfully loaded', processedVehicles.length, 'vehicles from primary API');
              console.log('Refreshed and cached', processedVehicles.length, 'vehicles');
              
              // Dispatch event to notify components about the refresh
              window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
                detail: { 
                  count: processedVehicles.length,
                  timestamp: now,
                  isAdminView: includeInactive
                }
              }));
              
              return filterVehicles(processedVehicles, includeInactive);
            }
          }
        } catch (error) {
          console.error(`Error fetching vehicles from ${endpoint || 'JSON file'}:`, error);
          // Continue to next endpoint
        }
      }
      
      // If all endpoints failed, try to use localStorage
      try {
        const cachedVehiclesString = localStorage.getItem('cachedVehicles') || localStorage.getItem('localVehicles');
        if (cachedVehiclesString) {
          const cachedVehiclesData = JSON.parse(cachedVehiclesString);
          if (Array.isArray(cachedVehiclesData) && cachedVehiclesData.length > 0) {
            console.log('Using localStorage cached vehicles');
            
            cachedVehicles.fallback = {
              data: cachedVehiclesData,
              timestamp: now
            };
            
            return filterVehicles(cachedVehiclesData, includeInactive);
          }
        }
      } catch (localStorageError) {
        console.error('Error using localStorage cache:', localStorageError);
      }
      
      // As last resort, use default vehicles
      console.log('Using default vehicles as last resort');
      
      cachedVehicles.fallback = {
        data: [...DEFAULT_VEHICLES],
        timestamp: now
      };
      
      saveToLocalStorage(DEFAULT_VEHICLES);
      
      // Dispatch event for default vehicles
      window.dispatchEvent(new CustomEvent('vehicle-data-fallback', {
        detail: { 
          count: DEFAULT_VEHICLES.length,
          timestamp: now,
          isDefault: true
        }
      }));
      
      return filterVehicles(DEFAULT_VEHICLES, includeInactive);
    } catch (error) {
      console.error('Refresh vehicle data failed:', error);
      
      // Try to use any available cache as fallback
      if (cachedVehicles.api && cachedVehicles.api.data.length > 0) {
        return filterVehicles(cachedVehicles.api.data, includeInactive);
      }
      
      if (cachedVehicles.json && cachedVehicles.json.data.length > 0) {
        return filterVehicles(cachedVehicles.json.data, includeInactive);
      }
      
      if (cachedVehicles.fallback && cachedVehicles.fallback.data.length > 0) {
        return filterVehicles(cachedVehicles.fallback.data, includeInactive);
      }
      
      return filterVehicles(DEFAULT_VEHICLES, includeInactive);
    } finally {
      pendingRefreshPromise = null;
    }
  };
  
  // Create and store the refresh promise
  pendingRefreshPromise = refreshVehicleData();
  return pendingRefreshPromise;
};

/**
 * Save vehicles to localStorage with proper cache keys
 */
function saveToLocalStorage(vehicles: CabType[]) {
  try {
    const now = Date.now();
    localStorage.setItem('cachedVehicles', JSON.stringify(vehicles));
    localStorage.setItem('cachedVehiclesTimestamp', now.toString());
    localStorage.setItem('localVehicles', JSON.stringify(vehicles));
    
    // Also cache by trip type for quicker access
    localStorage.setItem('cabOptions_all', JSON.stringify(vehicles));
    localStorage.setItem('cabOptions_all_timestamp', now.toString());
  } catch (e) {
    console.error('Error saving vehicles to localStorage:', e);
  }
}

/**
 * Wrapper function to get a list of vehicle types (IDs and names)
 * This is used in selectors where we only need basic vehicle info
 */
export const getVehicleTypes = async (forceRefresh = false, includeInactive = false): Promise<{id: string, name: string}[]> => {
  try {
    const vehicles = await getVehicleData(forceRefresh, includeInactive);
    return vehicles.map(v => ({ 
      id: v.id || v.vehicleId || '',
      name: v.name || ucwords((v.id || '').replace(/_/g, ' '))
    }));
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    return DEFAULT_VEHICLES.map(v => ({ 
      id: v.id || '',
      name: v.name || ''
    }));
  }
};

// Helper function to filter vehicles by active status
function filterVehicles(vehicles: CabType[], includeInactive: boolean): CabType[] {
  if (includeInactive) {
    return vehicles;
  }
  return vehicles.filter(v => v.isActive !== false);
}

// Helper function to process vehicle data to ensure consistent format
function processVehicles(vehicles: any[]): CabType[] {
  return vehicles.map(vehicle => {
    // Handle amenities that might be parsed JSON strings
    let amenities = ['AC'];
    if (Array.isArray(vehicle.amenities)) {
      amenities = vehicle.amenities;
    } else if (typeof vehicle.amenities === 'string') {
      try {
        // Try to parse as JSON
        const parsedAmenities = JSON.parse(vehicle.amenities);
        if (Array.isArray(parsedAmenities)) {
          amenities = parsedAmenities;
        } else {
          // Try to parse as comma-separated string
          amenities = vehicle.amenities.split(',').map((a: string) => a.trim());
        }
      } catch (e) {
        // If parsing fails, try to clean up the string and split it
        const cleaned = vehicle.amenities.replace(/[\[\]"']/g, '');
        amenities = cleaned.split(',').map((a: string) => a.trim());
      }
    }
    
    // Normalize vehicle ID
    const id = String(vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || '').trim();
    
    // Ensure isActive is correctly set (default to true)
    let isActive = true;
    if (typeof vehicle.isActive === 'boolean') {
      isActive = vehicle.isActive;
    } else if (vehicle.isActive === 0 || vehicle.isActive === '0' || vehicle.isActive === 'false') {
      isActive = false;
    } else if (typeof vehicle.is_active === 'boolean') {
      isActive = vehicle.is_active;
    } else if (vehicle.is_active === 0 || vehicle.is_active === '0' || vehicle.is_active === 'false') {
      isActive = false;
    }
    
    // Process capacity from various possible sources
    let capacity = 4; // Default
    if (vehicle.capacity !== undefined && vehicle.capacity !== null) {
      const parsedCapacity = parseInt(String(vehicle.capacity), 10);
      capacity = isNaN(parsedCapacity) ? 4 : parsedCapacity;
    } else if (vehicle.seats !== undefined && vehicle.seats !== null) {
      const parsedSeats = parseInt(String(vehicle.seats), 10);
      capacity = isNaN(parsedSeats) ? 4 : parsedSeats;
    }
    
    // Process luggage capacity from various possible sources
    let luggageCapacity = 2; // Default
    if (vehicle.luggageCapacity !== undefined && vehicle.luggageCapacity !== null) {
      const parsedLuggage = parseInt(String(vehicle.luggageCapacity), 10);
      luggageCapacity = isNaN(parsedLuggage) ? 2 : parsedLuggage;
    } else if (vehicle.luggage_capacity !== undefined && vehicle.luggage_capacity !== null) {
      const parsedLuggage = parseInt(String(vehicle.luggage_capacity), 10);
      luggageCapacity = isNaN(parsedLuggage) ? 2 : parsedLuggage;
    }
    
    // Ensure numeric values for prices
    const basePrice = parseFloat(String(vehicle.price || vehicle.basePrice || vehicle.base_price || 0));
    const pricePerKm = parseFloat(String(vehicle.pricePerKm || vehicle.price_per_km || 0));
    const nightHaltCharge = parseFloat(String(vehicle.nightHaltCharge || vehicle.night_halt_charge || 700));
    const driverAllowance = parseFloat(String(vehicle.driverAllowance || vehicle.driver_allowance || 250));
    
    // Ensure all properties have appropriate defaults
    return {
      id: id,
      vehicleId: id,
      name: vehicle.name || ucwords(id.replace(/_/g, ' ')),
      capacity: capacity,
      luggageCapacity: luggageCapacity,
      price: basePrice,
      basePrice: basePrice,
      pricePerKm: pricePerKm,
      image: vehicle.image || `/cars/${id}.png`.toLowerCase(),
      amenities: amenities.filter(a => a), // Filter empty amenities
      description: vehicle.description || '',
      ac: vehicle.ac === false ? false : true,
      nightHaltCharge: nightHaltCharge,
      driverAllowance: driverAllowance,
      isActive: isActive
    };
  });
}

// Utility function to capitalize words
function ucwords(str: string): string {
  return (str || '').replace(/\b\w/g, match => match.toUpperCase());
}
