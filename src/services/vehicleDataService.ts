import { CabType } from '@/types/cab';
import { apiBaseUrl, getApiUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { OutstationFare, LocalFare, AirportFare } from '@/types/cab';
import { toast } from 'sonner';

// Reduced cache durations to ensure fresher data
const JSON_CACHE_DURATION = 30 * 1000; // 30 seconds in milliseconds
const API_CACHE_DURATION = 15 * 1000; // 15 seconds in milliseconds

// Store fetched vehicle data in memory to reduce API calls
let cachedVehicles: {
  json?: { data: CabType[], timestamp: number },
  api?: { data: CabType[], timestamp: number },
  fallback?: { data: CabType[], timestamp: number }
} = {};

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
  try {
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
 * Fetches vehicle data from local JSON file or API
 * @param forceRefresh Force data refresh (bypass cache)
 * @param includeInactive Include inactive vehicles in the result
 */
export const getVehicleData = async (forceRefresh = false, includeInactive = false): Promise<CabType[]> => {
  console.log(`getVehicleData called with forceRefresh=${forceRefresh}, includeInactive=${includeInactive}`);
  
  const now = Date.now();
  const cacheBuster = `_t=${now}`;
  
  // Always force refresh for admin views when includeInactive is true
  if (includeInactive) {
    forceRefresh = true;
    console.log("Admin view detected (includeInactive=true), forcing refresh");
  }
  
  // If not forcing refresh, try to use cached data
  if (!forceRefresh) {
    // First try API cache if it's recent
    if (cachedVehicles.api && now - cachedVehicles.api.timestamp < API_CACHE_DURATION) {
      console.log('Using cached API vehicle data');
      return filterVehicles(cachedVehicles.api.data, includeInactive);
    }
    
    // Then try JSON cache if it's recent
    if (cachedVehicles.json && now - cachedVehicles.json.timestamp < JSON_CACHE_DURATION) {
      console.log('Using cached JSON vehicle data');
      return filterVehicles(cachedVehicles.json.data, includeInactive);
    }
    
    // Try to load from localStorage as another cache layer
    try {
      const cachedVehiclesString = localStorage.getItem('cachedVehicles');
      const cachedVehiclesTimestamp = localStorage.getItem('cachedVehiclesTimestamp');
      
      if (cachedVehiclesString && cachedVehiclesTimestamp) {
        const timestamp = parseInt(cachedVehiclesTimestamp, 10);
        
        // Use localStorage cache if it's less than 60 seconds old
        if (now - timestamp < 60000) {
          console.log('Using localStorage cached vehicle data');
          const vehicles = JSON.parse(cachedVehiclesString);
          
          // Cache the parsed data in memory too
          cachedVehicles.fallback = {
            data: vehicles,
            timestamp: timestamp
          };
          
          return filterVehicles(vehicles, includeInactive);
        }
      }
    } catch (error) {
      console.error('Error loading cached vehicles from localStorage:', error);
    }
  } else {
    console.log('Force refresh requested, skipping cache');
  }
  
  // Try all endpoints with fallbacks to ensure we get vehicle data
  const endpoints = [
    // Try the direct admin endpoint first for most complete data
    `/api/admin/get-vehicles.php?${cacheBuster}&includeInactive=${includeInactive ? 'true' : 'false'}`,
    // Then try the public endpoint
    `/api/fares/vehicles-data.php?${cacheBuster}&includeInactive=${includeInactive ? 'true' : 'false'}&force=${forceRefresh ? 'true' : 'false'}`,
    // Then try local json file as final fallback
    null // Special marker for local JSON file
  ];
  
  let lastError: Error | null = null;
  
  // Try each endpoint in order until one succeeds
  for (const endpoint of endpoints) {
    try {
      if (endpoint === null) {
        // Try local JSON file
        console.log('Fetching from vehicles.json fallback');
        const jsonResponse = await fetch(`/data/vehicles.json?${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!jsonResponse.ok) {
          throw new Error(`Failed to fetch JSON data: ${jsonResponse.status}`);
        }
        
        // Check content type to avoid parsing HTML as JSON
        const contentType = jsonResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Response is not JSON, skipping JSON parsing');
          throw new Error('Response is not JSON');
        }
        
        const jsonData = await jsonResponse.json();
        
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          console.log(`Loaded ${jsonData.length} vehicles from JSON file`);
          
          // Process and cache
          const processedVehicles = processVehicles(jsonData);
          cachedVehicles.json = {
            data: processedVehicles,
            timestamp: now
          };
          
          // Cache to localStorage
          try {
            localStorage.setItem('cachedVehicles', JSON.stringify(processedVehicles));
            localStorage.setItem('cachedVehiclesTimestamp', now.toString());
          } catch (e) {
            console.error('Error caching JSON vehicles to localStorage:', e);
          }
          
          return filterVehicles(processedVehicles, includeInactive);
        } else {
          throw new Error('JSON data is empty or invalid');
        }
      } else {
        // Try API endpoint
        const url = getApiUrl(endpoint);
        console.log(`Fetching vehicle data from API: ${url}`);
        
        const headers = {
          ...forceRefreshHeaders,
          'X-Admin-Mode': includeInactive ? 'true' : 'false'
        };
        
        const response = await fetch(url, {
          headers: headers,
          mode: 'cors',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`API response not OK: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if the response contains vehicles
        if (data && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          console.log(`Received ${data.vehicles.length} vehicles from API`);
          
          // Process vehicle data to ensure correct format
          const processedVehicles = processVehicles(data.vehicles);
          
          // Cache the processed data
          cachedVehicles.api = {
            data: processedVehicles,
            timestamp: now
          };
          
          // Cache to localStorage for persistence
          try {
            localStorage.setItem('cachedVehicles', JSON.stringify(processedVehicles));
            localStorage.setItem('cachedVehiclesTimestamp', now.toString());
            localStorage.setItem('localVehicles', JSON.stringify(processedVehicles));
          } catch (e) {
            console.error('Error caching vehicles to localStorage:', e);
          }
          
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
        
        // If we got here, the data exists but there are no vehicles, try next endpoint
        console.warn('API returned empty vehicles array, trying next endpoint');
      }
    } catch (error) {
      console.error(`Error fetching vehicles from ${endpoint || 'JSON file'}:`, error);
      lastError = error as Error;
      // Continue to next endpoint
    }
  }
  
  // Try to fix database tables as a last resort
  try {
    console.log("Attempting to fix database tables and retry");
    
    await fetch(`${apiBaseUrl}/api/admin/fix-vehicle-tables.php?${cacheBuster}`, {
      headers: forceRefreshHeaders,
      mode: 'cors',
      cache: 'no-store'
    });
    
    // Try the admin endpoint again after fixing tables
    const finalUrl = getApiUrl(`/api/admin/get-vehicles.php?${cacheBuster}&includeInactive=${includeInactive ? 'true' : 'false'}`);
    
    const finalResponse = await fetch(finalUrl, {
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': includeInactive ? 'true' : 'false'
      },
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (finalResponse.ok) {
      const finalData = await finalResponse.json();
      
      if (finalData && Array.isArray(finalData.vehicles) && finalData.vehicles.length > 0) {
        console.log(`Received ${finalData.vehicles.length} vehicles after fixing database`);
        
        const processedVehicles = processVehicles(finalData.vehicles);
        
        cachedVehicles.api = {
          data: processedVehicles,
          timestamp: now
        };
        
        // Cache to localStorage
        try {
          localStorage.setItem('cachedVehicles', JSON.stringify(processedVehicles));
          localStorage.setItem('cachedVehiclesTimestamp', now.toString());
          localStorage.setItem('localVehicles', JSON.stringify(processedVehicles));
        } catch (e) {
          console.error('Error caching vehicles to localStorage:', e);
        }
        
        return filterVehicles(processedVehicles, includeInactive);
      }
    }
  } catch (fixError) {
    console.error('Error fixing database tables:', fixError);
  }
  
  // Check for fallback data from previous requests
  if (cachedVehicles.fallback && cachedVehicles.fallback.data.length > 0) {
    console.log('Using fallback cached vehicles data');
    return filterVehicles(cachedVehicles.fallback.data, includeInactive);
  }
  
  // Last resort: use default vehicles
  console.log('Using default vehicles as last resort');
  
  // Cache the defaults so they can be reused
  try {
    localStorage.setItem('cachedVehicles', JSON.stringify(DEFAULT_VEHICLES));
    localStorage.setItem('cachedVehiclesTimestamp', now.toString());
    localStorage.setItem('localVehicles', JSON.stringify(DEFAULT_VEHICLES));
  } catch (e) {
    console.error('Error caching default vehicles to localStorage:', e);
  }
  
  cachedVehicles.fallback = {
    data: [...DEFAULT_VEHICLES],
    timestamp: now
  };
  
  // Dispatch event to notify components that we're using default vehicles
  window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
    detail: { 
      count: DEFAULT_VEHICLES.length,
      timestamp: now,
      isAdminView: includeInactive,
      isDefault: true
    }
  }));
  
  return filterVehicles(DEFAULT_VEHICLES, includeInactive);
};

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
    
    // Process capacity from various possible sources - ENSURE WE PRESERVE THE ORIGINAL VALUES
    let capacity = 4; // Default
    if (vehicle.capacity !== undefined && vehicle.capacity !== null) {
      const parsedCapacity = parseInt(String(vehicle.capacity), 10);
      capacity = isNaN(parsedCapacity) ? 4 : parsedCapacity;
    } else if (vehicle.seats !== undefined && vehicle.seats !== null) {
      const parsedSeats = parseInt(String(vehicle.seats), 10);
      capacity = isNaN(parsedSeats) ? 4 : parsedSeats;
    }
    
    // Process luggage capacity from various possible sources - ENSURE WE PRESERVE THE ORIGINAL VALUES
    let luggageCapacity = 2; // Default
    if (vehicle.luggageCapacity !== undefined && vehicle.luggageCapacity !== null) {
      const parsedLuggage = parseInt(String(vehicle.luggageCapacity), 10);
      luggageCapacity = isNaN(parsedLuggage) ? 2 : parsedLuggage;
    } else if (vehicle.luggage_capacity !== undefined && vehicle.luggage_capacity !== null) {
      const parsedLuggage = parseInt(String(vehicle.luggage_capacity), 10);
      luggageCapacity = isNaN(parsedLuggage) ? 2 : parsedLuggage;
    }
    
    console.log(`Processing vehicle ${id}: capacity=${vehicle.capacity}->${capacity}, luggage=${vehicle.luggageCapacity}->${luggageCapacity}`);
    
    // Ensure all properties have appropriate defaults
    return {
      id: id,
      vehicleId: id,
      name: vehicle.name || ucwords(id.replace(/_/g, ' ')),
      capacity: capacity,
      luggageCapacity: luggageCapacity,
      price: parseFloat(String(vehicle.price || vehicle.basePrice || vehicle.base_price || 0)),
      pricePerKm: parseFloat(String(vehicle.pricePerKm || vehicle.price_per_km || 0)),
      image: vehicle.image || `/cars/${id}.png`.toLowerCase(),
      amenities: amenities.filter(a => a), // Filter empty amenities
      description: vehicle.description || '',
      ac: vehicle.ac === false ? false : true,
      nightHaltCharge: parseFloat(String(vehicle.nightHaltCharge || vehicle.night_halt_charge || 700)),
      driverAllowance: parseFloat(String(vehicle.driverAllowance || vehicle.driver_allowance || 300)),
      isActive: isActive
    };
  });
}

// Utility function to capitalize words
function ucwords(str: string): string {
  return (str || '').replace(/\b\w/g, match => match.toUpperCase());
}
