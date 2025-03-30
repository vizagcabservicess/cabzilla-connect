import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';
import { OutstationFare, LocalFare, AirportFare } from '@/types/cab';

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

/**
 * Get vehicle types for dropdowns
 */
export const getVehicleTypes = async (): Promise<{id: string, name: string}[]> => {
  try {
    const vehicles = await getVehicleData(false, true);
    
    return vehicles.map(vehicle => ({
      id: vehicle.id,
      name: vehicle.name
    }));
  } catch (error) {
    console.error("Error fetching vehicle types:", error);
    return [];
  }
};

/**
 * Update outstation fares for a vehicle
 */
export const updateOutstationFares = async (vehicleId: string, fareData: OutstationFare): Promise<boolean> => {
  try {
    // Create FormData for better compatibility with server
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', 'outstation');
    formData.append('trip_type', 'outstation');
    
    // Add all fare data with all possible field names for compatibility
    Object.entries(fareData).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });
    
    // Add nightHalt for backward compatibility
    if (fareData.nightHaltCharge) {
      formData.append('nightHalt', fareData.nightHaltCharge.toString());
    }
    
    // Try the direct API endpoint first
    const directResponse = await fetch(`${apiBaseUrl}/api/direct-fare-update.php`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (directResponse.ok) {
      const result = await directResponse.json();
      console.log('Direct API response for outstation fares:', result);
      return true;
    }
    
    // Try the fallback endpoint
    const fallbackResponse = await fetch(`${apiBaseUrl}/api/admin/outstation-fares-update.php`, {
      method: 'POST',
      body: formData
    });
    
    if (fallbackResponse.ok) {
      const result = await fallbackResponse.json();
      console.log('Fallback API response for outstation fares:', result);
      return true;
    }
    
    throw new Error('Failed to update outstation fares');
  } catch (error) {
    console.error('Error updating outstation fares:', error);
    throw error;
  }
};

/**
 * Update local fares for a vehicle
 */
export const updateLocalFares = async (vehicleId: string, fareData: LocalFare): Promise<boolean> => {
  try {
    // Create FormData for better compatibility with server
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', 'local');
    formData.append('trip_type', 'local');
    
    // Add all naming conventions for local package fare fields
    if (fareData.price4hrs40km !== undefined) {
      formData.append('package4hr40km', fareData.price4hrs40km.toString());
      formData.append('price4hrs40km', fareData.price4hrs40km.toString());
      formData.append('hr4km40Price', fareData.price4hrs40km.toString());
      formData.append('local_package_4hr', fareData.price4hrs40km.toString());
    }
    
    if (fareData.price8hrs80km !== undefined) {
      formData.append('package8hr80km', fareData.price8hrs80km.toString());
      formData.append('price8hrs80km', fareData.price8hrs80km.toString());
      formData.append('hr8km80Price', fareData.price8hrs80km.toString());
      formData.append('local_package_8hr', fareData.price8hrs80km.toString());
    }
    
    if (fareData.price10hrs100km !== undefined) {
      formData.append('package10hr100km', fareData.price10hrs100km.toString());
      formData.append('price10hrs100km', fareData.price10hrs100km.toString());
      formData.append('hr10km100Price', fareData.price10hrs100km.toString());
      formData.append('local_package_10hr', fareData.price10hrs100km.toString());
    }
    
    if (fareData.priceExtraKm !== undefined) {
      formData.append('extraKmRate', fareData.priceExtraKm.toString());
      formData.append('priceExtraKm', fareData.priceExtraKm.toString());
      formData.append('extra_km_charge', fareData.priceExtraKm.toString());
      formData.append('extra_km_rate', fareData.priceExtraKm.toString());
    }
    
    if (fareData.priceExtraHour !== undefined) {
      formData.append('extraHourRate', fareData.priceExtraHour.toString());
      formData.append('priceExtraHour', fareData.priceExtraHour.toString());
      formData.append('extra_hour_charge', fareData.priceExtraHour.toString());
      formData.append('extra_hour_rate', fareData.priceExtraHour.toString());
    }
    
    // Try the direct API endpoint first
    const directResponse = await fetch(`${apiBaseUrl}/api/direct-fare-update.php`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (directResponse.ok) {
      const result = await directResponse.json();
      console.log('Direct API response for local fares:', result);
      return true;
    }
    
    // Try the fallback endpoint
    const fallbackResponse = await fetch(`${apiBaseUrl}/api/admin/local-fares-update.php`, {
      method: 'POST',
      body: formData
    });
    
    if (fallbackResponse.ok) {
      const result = await fallbackResponse.json();
      console.log('Fallback API response for local fares:', result);
      return true;
    }
    
    throw new Error('Failed to update local fares');
  } catch (error) {
    console.error('Error updating local fares:', error);
    throw error;
  }
};

/**
 * Update airport fares for a vehicle
 */
export const updateAirportFares = async (vehicleId: string, fareData: AirportFare): Promise<boolean> => {
  try {
    // Create FormData for better compatibility with server
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', 'airport');
    formData.append('trip_type', 'airport');
    
    // Add all fare data with all possible field names for compatibility
    Object.entries(fareData).forEach(([key, value]) => {
      formData.append(key, value.toString());
      
      // Add with airport_ prefix for compatibility
      formData.append(`airport_${key}`, value.toString());
    });
    
    // Try the direct API endpoint first
    const directResponse = await fetch(`${apiBaseUrl}/api/direct-fare-update.php`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (directResponse.ok) {
      const result = await directResponse.json();
      console.log('Direct API response for airport fares:', result);
      return true;
    }
    
    // Try the fallback endpoint
    const fallbackResponse = await fetch(`${apiBaseUrl}/api/admin/airport-fares-update.php`, {
      method: 'POST',
      body: formData
    });
    
    if (fallbackResponse.ok) {
      const result = await fallbackResponse.json();
      console.log('Fallback API response for airport fares:', result);
      return true;
    }
    
    throw new Error('Failed to update airport fares');
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
};

/**
 * Generic function to update trip fares for a vehicle
 */
export const updateTripFares = async (
  vehicleId: string, 
  tripType: 'outstation' | 'local' | 'airport', 
  fareData: OutstationFare | LocalFare | AirportFare
): Promise<boolean> => {
  try {
    // Choose the appropriate update function based on trip type
    switch (tripType) {
      case 'outstation':
        return await updateOutstationFares(vehicleId, fareData as OutstationFare);
      case 'local':
        return await updateLocalFares(vehicleId, fareData as LocalFare);
      case 'airport':
        return await updateAirportFares(vehicleId, fareData as AirportFare);
      default:
        throw new Error(`Unsupported trip type: ${tripType}`);
    }
  } catch (error) {
    console.error(`Error updating ${tripType} fares:`, error);
    throw error;
  }
};
