import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';

const JSON_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const API_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

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
 * Fetches vehicle data from local JSON file or API
 * @param forceRefresh Force data refresh (bypass cache)
 * @param includeInactive Include inactive vehicles in the result
 */
export const getVehicleData = async (forceRefresh = false, includeInactive = false): Promise<CabType[]> => {
  console.log(`getVehicleData called with forceRefresh=${forceRefresh}, includeInactive=${includeInactive}`);
  
  const now = Date.now();
  const cacheBuster = `_t=${now}`;
  
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
  } else {
    console.log('Force refresh requested, skipping cache');
  }
  
  // Try to fetch from API first
  try {
    // Build the URL with includeInactive parameter
    const includeInactiveParam = includeInactive ? 'true' : 'false';
    let url = `${apiBaseUrl}/api/fares/vehicles-data.php?${cacheBuster}&includeInactive=${includeInactiveParam}`;
    
    if (forceRefresh) {
      url += '&force=true';
    }
    
    console.log(`Fetching vehicle data from API: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    if (!response.ok) {
      console.error(`API response not OK: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch vehicles: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
      console.log(`Received ${data.vehicles.length} vehicles from API`);
      
      // Process vehicle data to ensure correct format
      const processedVehicles = processVehicles(data.vehicles);
      
      // Cache the processed data
      cachedVehicles.api = {
        data: processedVehicles,
        timestamp: now
      };
      
      // If forced refresh, also update the JSON cache to keep them in sync
      if (forceRefresh) {
        cachedVehicles.json = {
          data: processedVehicles,
          timestamp: now
        };
      }
      
      return filterVehicles(processedVehicles, includeInactive);
    } else {
      console.warn('API returned empty or invalid vehicles array');
      throw new Error('API returned empty or invalid vehicles array');
    }
  } catch (error) {
    console.error('Error fetching vehicles from API:', error);
    
    // If API failed, try fallback to local JSON file
    try {
      console.log('Fetching from vehicles.json fallback');
      const response = await fetch(`/data/vehicles.json?${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch JSON data: ${response.status}`);
      }
      
      const jsonData = await response.json();
      
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        console.log(`Loaded ${jsonData.length} vehicles from JSON file`);
        
        // Process and cache
        const processedVehicles = processVehicles(jsonData);
        cachedVehicles.json = {
          data: processedVehicles,
          timestamp: now
        };
        
        return filterVehicles(processedVehicles, includeInactive);
      }
    } catch (jsonError) {
      console.error('Error loading from local JSON, using default vehicles:', jsonError);
    }
    
    // Last resort: use default vehicles
    console.log('Using default vehicles as last resort');
    cachedVehicles.fallback = {
      data: [...DEFAULT_VEHICLES],
      timestamp: now
    };
    
    return filterVehicles(DEFAULT_VEHICLES, includeInactive);
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
    // Ensure all properties have appropriate defaults
    return {
      id: String(vehicle.id || vehicle.vehicleId || ''),
      vehicleId: String(vehicle.vehicleId || vehicle.id || ''),
      name: vehicle.name || 'Unknown',
      capacity: parseInt(vehicle.capacity || vehicle.seats || '4', 10),
      luggageCapacity: parseInt(vehicle.luggageCapacity || vehicle.luggage_capacity || '2', 10),
      basePrice: parseFloat(vehicle.basePrice || vehicle.price || '0'),
      price: parseFloat(vehicle.price || vehicle.basePrice || '0'),
      pricePerKm: parseFloat(vehicle.pricePerKm || '0'),
      image: vehicle.image || '/cars/sedan.png',
      amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
      description: vehicle.description || '',
      ac: vehicle.ac === undefined ? true : Boolean(vehicle.ac),
      nightHaltCharge: parseFloat(vehicle.nightHaltCharge || '0'),
      driverAllowance: parseFloat(vehicle.driverAllowance || '0'),
      isActive: vehicle.isActive === undefined ? true : Boolean(vehicle.isActive)
    };
  });
}

// Function to directly clear vehicle data cache
export const clearVehicleDataCache = () => {
  console.log('Clearing vehicle data cache');
  cachedVehicles = {};
  
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('vehicle-data-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
};
