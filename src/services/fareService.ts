
import axios from 'axios';
import { TripType, TripMode } from '@/lib/tripTypes';
import { LocalFare, OutstationFare, AirportFare } from '@/types/cab';

// Create a global timestamp for fare cache refreshes
let globalTimestamp = Date.now();

// Function to clear the fare cache
export const clearFareCache = () => {
  console.log('Clearing fare cache at', new Date().toISOString());
  localStorage.removeItem('outstation_fares');
  localStorage.removeItem('local_fares'); 
  localStorage.removeItem('airport_fares');
  localStorage.removeItem('outstation_fares_timestamp');
  localStorage.removeItem('local_fares_timestamp'); 
  localStorage.removeItem('airport_fares_timestamp');
  localStorage.setItem('globalFareRefreshToken', Date.now().toString());
  
  // Clear all fare-related cache items from localStorage and sessionStorage
  const keysToRemove = [
    'cachedFareData', 'cabPricing', 'fareCache', 'fares', 
    'cabData', 'vehicles', 'calculatedFares', 'cabTypes', 
    'outstationFares', 'airportFares', 'tourFares'
  ];
  
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  
  // Also clear all prefixed cache keys
  for (const storageType of [localStorage, sessionStorage]) {
    try {
      const keys = Object.keys(storageType);
      for (const key of keys) {
        if (key.startsWith('cabOptions_') || 
            key.startsWith('fare_') || 
            key.startsWith('pricing_')) {
          storageType.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Error clearing prefixed cache keys:', e);
    }
  }
  
  // Trigger a fare cache cleared event
  window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
  
  globalTimestamp = Date.now();
};

// Utility function to get bypass headers for cache invalidation
export const getBypassHeaders = () => {
  return {
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-API-Version': '1.0.55'
  };
};

// Utility function to get forced request config for axios
export const getForcedRequestConfig = () => {
  return {
    headers: getBypassHeaders(),
    params: {
      _t: Date.now(), // Cache busting timestamp
      force: 'true'
    }
  };
};

// Initialize database tables - useful for admin operations
export const initializeDatabase = async (forceRecreate = false) => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const params = new URLSearchParams();
    
    if (forceRecreate) {
      params.append('force', 'true');
    }
    
    params.append('verbose', 'true');
    params.append('_t', Date.now().toString()); // Cache busting
    
    const response = await axios.get(`${baseUrl}/api/init-database.php?${params.toString()}`, {
      headers: getBypassHeaders()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Direct method to update fares with sync option
export const directFareUpdate = async (tripType: string, vehicleId: string, data: any) => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    let endpoint = '';
    
    // Construct the appropriate endpoint based on trip type
    switch (tripType) {
      case 'outstation':
        endpoint = `${baseUrl}/api/admin/direct-outstation-fares.php`;
        break;
      case 'local':
        endpoint = `${baseUrl}/api/admin/direct-local-fares.php`;
        break;
      case 'airport':
        endpoint = `${baseUrl}/api/admin/direct-airport-fares.php`;
        break;
      default:
        endpoint = `${baseUrl}/api/admin/direct-fare-update.php`;
    }
    
    // Prepare form data for the request
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', tripType);
    
    // Add all data properties to the form data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    
    console.log(`Sending ${tripType} fare update for ${vehicleId} to ${endpoint}`);
    
    // Make the request using FormData
    const response = await axios.post(endpoint, formData);
    
    // After updating, force a sync between tables
    if (tripType === 'outstation') {
      console.log('Syncing outstation_fares with vehicle_pricing');
      try {
        const syncResponse = await syncOutstationFares(vehicleId);
        console.log('Sync response:', syncResponse);
      } catch (syncError) {
        console.error('Error during sync after update:', syncError);
        // Continue anyway, as the primary update succeeded
      }
    }
    
    // Clear cache after updating
    clearFareCache();
    
    // Dispatch an event to notify other components
    const eventName = `${tripType}-fares-updated`;
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: {
        vehicleId,
        timestamp: Date.now(),
        prices: data
      }
    }));
    
    return response.data;
  } catch (error) {
    console.error(`Error updating ${tripType} fares for ${vehicleId}:`, error);
    throw error;
  }
};

// Sync outstation fares - safer implementation with fallback to local API
export const syncOutstationFares = async (vehicleId?: string) => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    console.log('Syncing outstation_fares with vehicle_pricing' + (vehicleId ? ` for vehicle ${vehicleId}` : ''));
    
    // Construct the URL with parameters
    let url = `${baseUrl}/api/admin/sync-outstation-fares.php`;
    const params = new URLSearchParams();
    params.append('_t', Date.now().toString());
    
    if (vehicleId) {
      params.append('vehicle_id', vehicleId);
    }
    
    try {
      // First try using the main API endpoint
      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: getBypassHeaders(),
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Sync successful using main endpoint:', response.data);
      
      // Clear cache after syncing
      clearFareCache();
      
      return response.data;
    } catch (mainError) {
      console.error('Error using main sync endpoint:', mainError);
      
      // As a fallback, try the default outstation-fares.php endpoint with sync=true
      console.log('Trying fallback sync method...');
      
      const fallbackParams = new URLSearchParams(params);
      fallbackParams.append('sync', 'true');
      fallbackParams.append('force_sync', 'true');
      
      const fallbackResponse = await axios.get(`${baseUrl}/api/outstation-fares.php?${fallbackParams.toString()}`, {
        headers: getBypassHeaders(),
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Sync successful using fallback endpoint:', fallbackResponse.data);
      
      // Clear cache after syncing
      clearFareCache();
      
      return {
        status: 'success',
        message: 'Sync completed using fallback method',
        originalError: (mainError as any).message,
        data: fallbackResponse.data
      };
    }
  } catch (error) {
    console.error('All sync attempts failed:', error);
    throw error;
  }
};

// Force sync outstation fares with vehicle_pricing
export const forceSyncOutstationFares = async () => {
  try {
    return await syncOutstationFares();
  } catch (error) {
    console.error('Error forcing sync of outstation fares:', error);
    throw error;
  }
};

// Outstation Fares - ALWAYS fetch from outstation_fares table with sync option
export const getOutstationFares = async (origin?: string, destination?: string): Promise<Record<string, OutstationFare>> => {
  try {
    // Always force a refresh of fares by skipping cache
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const timestamp = Date.now();
    
    console.log('Fetching outstation fares with timestamp:', timestamp);
    
    const response = await axios.get(`${baseUrl}/api/outstation-fares.php`, {
      params: { 
        origin,
        destination,
        _t: timestamp, // Cache busting
        force: 'true',
        check_sync: 'true' // Add check_sync param to ensure tables are in sync
      },
      headers: getBypassHeaders()
    });
    
    if (response.data && response.data.fares) {
      console.log('Outstation fares fetched successfully:', response.data);
      // Cache the fares
      localStorage.setItem('outstation_fares', JSON.stringify(response.data.fares));
      localStorage.setItem('outstation_fares_timestamp', timestamp.toString());
      
      return response.data.fares;
    }
    
    console.warn('No outstation fares returned from API');
    return {};
  } catch (error) {
    console.error('Error fetching outstation fares:', error);
    
    // Try to return cached fares if available, even if they are old
    const cachedFares = localStorage.getItem('outstation_fares');
    if (cachedFares) {
      return JSON.parse(cachedFares);
    }
    
    return {};
  }
};

// Get outstation fares for a specific vehicle - ALWAYS force fresh data
export const getOutstationFaresForVehicle = async (vehicleId: string): Promise<OutstationFare> => {
  try {
    // Try to fetch directly for this vehicle
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const now = Date.now();
    
    console.log(`Fetching outstation fares for vehicle ${vehicleId} with timestamp:`, now);
    
    const response = await axios.get(`${baseUrl}/api/outstation-fares.php`, {
      params: {
        vehicle_id: vehicleId,
        _t: now, // Cache busting
        force: 'true'
      },
      headers: getBypassHeaders()
    });
    
    if (response.data && response.data.fares && response.data.fares[vehicleId]) {
      console.log(`Outstation fares for vehicle ${vehicleId}:`, response.data.fares[vehicleId]);
      console.log(`Source table: ${response.data.sourceTable}`);
      
      // Cache this specific vehicle fare
      const cachedFares = localStorage.getItem('outstation_fares');
      const fares = cachedFares ? JSON.parse(cachedFares) : {};
      fares[vehicleId] = response.data.fares[vehicleId];
      localStorage.setItem('outstation_fares', JSON.stringify(fares));
      localStorage.setItem('outstation_fares_timestamp', now.toString());
      
      return response.data.fares[vehicleId];
    }
    
    // If direct fetch failed, try to get all fares
    console.warn(`No specific fare found for vehicle ${vehicleId}, fetching all fares`);
    const allFares = await getOutstationFares();
    if (allFares && allFares[vehicleId]) {
      return allFares[vehicleId];
    }
    
    console.warn(`No outstation fare found for vehicle ${vehicleId}`);
    // Return default values if no data found
    return {
      basePrice: 0,
      pricePerKm: 0,
      driverAllowance: 0,
      nightHaltCharge: 0,
      roundTripBasePrice: 0,
      roundTripPricePerKm: 0
    };
  } catch (error) {
    console.error(`Error fetching outstation fares for vehicle ${vehicleId}:`, error);
    
    // Try to get from cache if available
    const cachedFares = localStorage.getItem('outstation_fares');
    if (cachedFares) {
      const fares = JSON.parse(cachedFares);
      if (fares[vehicleId]) {
        return fares[vehicleId];
      }
    }
    
    // Return default values if error
    return {
      basePrice: 0,
      pricePerKm: 0,
      driverAllowance: 0,
      nightHaltCharge: 0,
      roundTripBasePrice: 0,
      roundTripPricePerKm: 0
    };
  }
};

// Local Fares
export const getLocalFares = async (): Promise<Record<string, LocalFare>> => {
  try {
    // Always fetch fares from API
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const timestamp = Date.now();
    
    console.log('Fetching local fares with timestamp:', timestamp);
    
    const response = await axios.get(`${baseUrl}/api/local-fares.php`, {
      params: { 
        _t: timestamp, // Cache busting
        force: 'true'
      },
      headers: getBypassHeaders()
    });
    
    if (response.data && response.data.fares) {
      console.log('Local fares fetched successfully:', response.data);
      // Cache the fares
      localStorage.setItem('local_fares', JSON.stringify(response.data.fares));
      localStorage.setItem('local_fares_timestamp', timestamp.toString());
      
      return response.data.fares;
    }
    
    console.warn('No local fares returned from API');
    return {};
  } catch (error) {
    console.error('Error fetching local fares:', error);
    
    // Try to return cached fares if available, even if they are old
    const cachedFares = localStorage.getItem('local_fares');
    if (cachedFares) {
      return JSON.parse(cachedFares);
    }
    
    return {};
  }
};

// Get local fares for a specific vehicle
export const getLocalFaresForVehicle = async (vehicleId: string): Promise<LocalFare> => {
  try {
    // First try to get from cache
    const cachedFares = localStorage.getItem('local_fares');
    const cachedTimestamp = localStorage.getItem('local_fares_timestamp');
    const globalRefreshToken = localStorage.getItem('globalFareRefreshToken');
    const now = Date.now();
    
    if (cachedFares && cachedTimestamp && globalRefreshToken) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const refreshToken = parseInt(globalRefreshToken, 10);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - timestamp < fiveMinutes && timestamp > refreshToken) {
        const fares = JSON.parse(cachedFares);
        if (fares[vehicleId]) {
          return fares[vehicleId];
        }
      }
    }
    
    // Try to fetch directly for this vehicle
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const response = await axios.get(`${baseUrl}/api/local-fares.php`, {
      params: {
        vehicle_id: vehicleId,
        _t: now // Cache busting
      },
      headers: getBypassHeaders()
    });
    
    if (response.data && response.data.fares && response.data.fares[vehicleId]) {
      return response.data.fares[vehicleId];
    }
    
    // If direct fetch failed, try to get all fares
    const allFares = await getLocalFares();
    if (allFares && allFares[vehicleId]) {
      return allFares[vehicleId];
    }
    
    // Return default values if no data found
    return {
      price4hrs40km: 0,
      price8hrs80km: 0,
      price10hrs100km: 0,
      priceExtraKm: 0,
      priceExtraHour: 0
    };
  } catch (error) {
    console.error(`Error fetching local fares for vehicle ${vehicleId}:`, error);
    
    // Return default values if error
    return {
      price4hrs40km: 0,
      price8hrs80km: 0,
      price10hrs100km: 0,
      priceExtraKm: 0,
      priceExtraHour: 0
    };
  }
};

// Airport Fares
export const getAirportFares = async (): Promise<Record<string, AirportFare>> => {
  try {
    // Check if we have cached fares and they are less than 5 minutes old
    const cachedTimestamp = localStorage.getItem('airport_fares_timestamp');
    const cachedFares = localStorage.getItem('airport_fares');
    const globalRefreshToken = localStorage.getItem('globalFareRefreshToken');
    
    if (cachedTimestamp && cachedFares && globalRefreshToken) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const refreshToken = parseInt(globalRefreshToken, 10);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      // Use cached data if it's recent and there hasn't been a global refresh
      if (now - timestamp < fiveMinutes && timestamp > refreshToken) {
        return JSON.parse(cachedFares);
      }
    }
    
    // Fetch fares from API
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const response = await axios.get(`${baseUrl}/api/airport-fares.php`, {
      params: { 
        _t: Date.now() // Cache busting
      }
    });
    
    if (response.data && response.data.fares) {
      // Cache the fares
      localStorage.setItem('airport_fares', JSON.stringify(response.data.fares));
      localStorage.setItem('airport_fares_timestamp', Date.now().toString());
      
      return response.data.fares;
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    
    // Try to return cached fares if available, even if they are old
    const cachedFares = localStorage.getItem('airport_fares');
    if (cachedFares) {
      return JSON.parse(cachedFares);
    }
    
    return {};
  }
};

// Get airport fares for a specific vehicle
export const getAirportFaresForVehicle = async (vehicleId: string): Promise<AirportFare | null> => {
  try {
    console.log(`Fetching airport transfer fares for vehicle: ${vehicleId}`);
    
    // First try to get from cache
    const cachedFares = localStorage.getItem('airport_fares');
    const cachedTimestamp = localStorage.getItem('airport_fares_timestamp');
    const globalRefreshToken = localStorage.getItem('globalFareRefreshToken');
    const now = Date.now();
    
    if (cachedFares && cachedTimestamp && globalRefreshToken) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const refreshToken = parseInt(globalRefreshToken, 10);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - timestamp < fiveMinutes && timestamp > refreshToken) {
        const fares = JSON.parse(cachedFares);
        if (fares[vehicleId]) {
          console.log(`Using cached airport fares for ${vehicleId}:`, fares[vehicleId]);
          return fares[vehicleId];
        }
      }
    }
    
    // Try to fetch directly for this vehicle
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await axios.get(`${baseUrl}/api/airport-fares.php`, {
        params: {
          vehicle_id: vehicleId,
          _t: now // Cache busting
        },
        headers: getBypassHeaders()
      });
      
      if (response.data && response.data.fares && response.data.fares[vehicleId]) {
        console.log(`Got direct airport fares for ${vehicleId}:`, response.data.fares[vehicleId]);
        return response.data.fares[vehicleId];
      }
    } catch (error) {
      console.error(`Error fetching direct airport fares for ${vehicleId}:`, error);
    }
    
    // If direct fetch failed, try to get all fares
    const allFares = await getAirportFares();
    if (allFares && allFares[vehicleId]) {
      console.log(`Got airport fares for ${vehicleId} from all fares:`, allFares[vehicleId]);
      return allFares[vehicleId];
    }
    
    // If all else fails, try to fetch from vehicles-data
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await axios.get(`${baseUrl}/api/fares/vehicles-data.php`, {
        params: {
          _t: now // Cache busting
        },
        headers: getBypassHeaders()
      });
      
      if (response.data && response.data.vehicles) {
        const vehicle = response.data.vehicles.find((v: any) => v.id === vehicleId || v.vehicleId === vehicleId);
        if (vehicle && vehicle.airportFares) {
          console.log(`Got airport fares for ${vehicleId} from vehicles-data:`, vehicle.airportFares);
          return vehicle.airportFares;
        }
      }
    } catch (error) {
      console.error(`Error fetching vehicle data for ${vehicleId}:`, error);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching airport fares for vehicle ${vehicleId}:`, error);
    return null;
  }
};

// Fare Calculation by Trip Type
export const getFaresByTripType = async (tripType: TripType): Promise<Record<string, any>> => {
  switch (tripType) {
    case 'outstation':
      return getOutstationFares();
    case 'local':
      return getLocalFares();
    case 'airport':
      return getAirportFares();
    default:
      return {};
  }
};

// Reset CabOptions state and force a global refresh
export const resetCabOptionsState = () => {
  clearFareCache(); // Clear all caches first
  window.dispatchEvent(new CustomEvent('reset-cab-options'));
  localStorage.setItem('forceTripFaresRefresh', 'true');
};

// Export the fareService
export const fareService = {
  getOutstationFares,
  getLocalFares,
  getAirportFares,
  getAirportFaresForVehicle,
  getOutstationFaresForVehicle,
  getLocalFaresForVehicle,
  getFaresByTripType,
  clearCache: clearFareCache,
  directFareUpdate,
  getBypassHeaders,
  getForcedRequestConfig,
  resetCabOptionsState,
  initializeDatabase,
  forceSyncOutstationFares,
  syncOutstationFares
};
