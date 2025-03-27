
// Only modify the getOutstationFares and getOutstationFaresForVehicle functions
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
      const syncResponse = await axios.get(`${baseUrl}/api/outstation-fares.php`, {
        params: { 
          sync: 'true',
          _t: Date.now() // Cache busting 
        },
        headers: getBypassHeaders()
      });
      console.log('Sync response:', syncResponse.data);
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

// Outstation Fares - ALWAYS fetch from outstation_fares table with sync option
export const getOutstationFares = async (origin?: string, destination?: string): Promise<Record<string, OutstationFare>> => {
  try {
    // Always force a refresh of fares by skipping cache
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const timestamp = Date.now();
    
    console.log('Fetching outstation fares with timestamp:', timestamp);
    
    // Add sync and check_sync params to ensure database tables are in sync
    const response = await axios.get(`${baseUrl}/api/outstation-fares.php`, {
      params: { 
        origin,
        destination,
        _t: timestamp, // Cache busting
        force: 'true',
        check_sync: 'true',
        sync: 'true' // Force sync between tables
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
    // Force direct fetch from database for this vehicle
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const now = Date.now();
    
    console.log(`Fetching outstation fares for vehicle ${vehicleId} with timestamp:`, now);
    
    // Add sync param to ensure data is synced between tables
    const response = await axios.get(`${baseUrl}/api/outstation-fares.php`, {
      params: {
        vehicle_id: vehicleId,
        _t: now, // Cache busting
        force: 'true',
        sync: 'true' // Force sync between tables
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
      
      // Also try to sync outstation_fares with vehicle_pricing directly
      try {
        await axios.get(`${baseUrl}/api/admin/sync-outstation-fares.php`, {
          params: {
            vehicle_id: vehicleId,
            _t: now
          },
          headers: getBypassHeaders()
        });
        console.log(`Forced sync for vehicle ${vehicleId}`);
      } catch (syncError) {
        console.error(`Error syncing tables for ${vehicleId}:`, syncError);
      }
      
      return response.data.fares[vehicleId];
    }
    
    // If direct fetch failed, try alternative approaches
    console.warn(`No specific fare found for vehicle ${vehicleId}, trying alternatives`);
    
    // Attempt 1: Try vehicles-data.php endpoint
    try {
      const vehicleResponse = await axios.get(`${baseUrl}/api/fares/vehicles-data.php`, {
        params: { 
          _t: now, 
          force: 'true' 
        },
        headers: getBypassHeaders()
      });
      
      if (vehicleResponse.data && vehicleResponse.data.vehicles) {
        const vehicle = vehicleResponse.data.vehicles.find((v: any) => 
          v.id === vehicleId || v.vehicleId === vehicleId
        );
        
        if (vehicle && vehicle.outstationFares) {
          console.log(`Found outstation fares for ${vehicleId} in vehicles-data:`, vehicle.outstationFares);
          return vehicle.outstationFares;
        }
      }
    } catch (vehicleError) {
      console.error(`Error fetching from vehicles-data for ${vehicleId}:`, vehicleError);
    }
    
    // Attempt 2: Try getting all fares
    const allFares = await getOutstationFares();
    if (allFares && allFares[vehicleId]) {
      return allFares[vehicleId];
    }
    
    console.warn(`No outstation fare found for vehicle ${vehicleId}, using defaults`);
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
  initializeDatabase
};
