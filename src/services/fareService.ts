import axios from 'axios';
import { CabType, LocalFare, AirportFare, OutstationFare } from '@/types/cab';

// Force refresh header
export const getBypassHeaders = () => ({
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
});

// Forced request config for API calls
export const getForcedRequestConfig = () => ({
  headers: getBypassHeaders(),
  params: { _t: Date.now() }
});

// Direct fare update using our API
export const directFareUpdate = async (tripType: string, vehicleId: string, fareData: any) => {
  try {
    const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/direct-fare-update.php?tripType=${tripType}&_t=${Date.now()}`;
    
    const response = await axios.post(endpoint, 
      { vehicleId, ...fareData }, 
      { headers: getBypassHeaders() }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error in directFareUpdate for ${tripType}:`, error);
    throw error;
  }
};

// Initialize the database for the fare service
export const initializeDatabase = async (forceRecreate: boolean = false): Promise<{ 
  success: boolean; 
  status: string;
  message: string;
  tables_created?: string[];
  tables_failed?: string[];
  messages?: string[];
}> => {
  try {
    // Build the URL with parameters
    let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/initialize-database.php?_t=${Date.now()}`;
    
    if (forceRecreate) {
      url += '&force=true';
    }
    
    url += '&verbose=true';
    
    const response = await axios.get(url, { headers: getBypassHeaders() });
    return { 
      success: true, 
      status: response.data?.status || 'success',
      message: response.data?.message || 'Database initialized successfully',
      tables_created: response.data?.tables_created,
      tables_failed: response.data?.tables_failed,
      messages: response.data?.messages
    };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { 
      success: false, 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Force sync outstation fares
export const forceSyncOutstationFares = async () => {
  try {
    const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/sync-outstation-fares.php?force=1&_t=${Date.now()}`;
    const response = await axios.get(endpoint, { headers: getBypassHeaders() });
    return { 
      success: true, 
      status: response.data?.status || 'success',
      message: response.data?.message || 'Outstation fares synced successfully'
    };
  } catch (error) {
    console.error('Error syncing outstation fares:', error);
    return { 
      success: false, 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Sync outstation fares
export const syncOutstationFares = async () => {
  try {
    const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/sync-outstation-fares.php?_t=${Date.now()}`;
    const response = await axios.get(endpoint, { headers: getBypassHeaders() });
    return { 
      success: true, 
      status: response.data?.status || 'success',
      message: response.data?.message || 'Outstation fares synced successfully'
    };
  } catch (error) {
    console.error('Error syncing outstation fares:', error);
    return { 
      success: false, 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get outstation fares
export const getOutstationFares = async (): Promise<OutstationFare[]> => {
  return [];
};

// Get local fares
export const getLocalFares = async (): Promise<LocalFare[]> => {
  return [];
};

// Get airport fares
export const getAirportFares = async (): Promise<AirportFare[]> => {
  return [];
};

// Get outstation fares for a specific vehicle
export const getOutstationFaresForVehicle = async (vehicleId: string): Promise<OutstationFare> => {
  return {} as OutstationFare;
};

// Get local fares for a specific vehicle
export const getLocalFaresForVehicle = async (vehicleId: string): Promise<LocalFare> => {
  return {} as LocalFare;
};

// Get airport fares for a specific vehicle
export const getAirportFaresForVehicle = async (vehicleId: string): Promise<AirportFare> => {
  return {} as AirportFare;
};

// Get fares by trip type
export const getFaresByTripType = async (tripType: string) => {
  return [];
};

// Sync local fare tables
export const syncLocalFareTables = async () => {
  try {
    const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/sync-local-fares.php?_t=${Date.now()}`;
    const response = await axios.get(endpoint, { headers: getBypassHeaders() });
    return { 
      success: true, 
      status: response.data?.status || 'success',
      message: response.data?.message || 'Local fare tables synced successfully'
    };
  } catch (error) {
    console.error('Error syncing local fare tables:', error);
    return { 
      success: false, 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Clear fare cache
export const clearFareCache = () => {
  console.log('Clearing fare cache from fareService');
  
  // Clear localStorage items related to fares
  const cacheKeys = [
    'cabFares',
    'fareCache',
    'localPackagePriceMatrix',
    'lastCabOptionsUpdate',
    'lastFareUpdate'
  ];
  
  cacheKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      console.error(`Error clearing cache key ${key}:`, e);
    }
  });
  
  // Set refresh flags
  localStorage.setItem('forceCacheRefresh', 'true');
  localStorage.setItem('lastCacheClear', Date.now().toString());
  
  // Dispatch cache clear event if in browser environment
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: Date.now(), source: 'fareService' }
      }));
    } catch (e) {
      console.error('Error dispatching fare-cache-cleared event:', e);
    }
  }
  
  return true;
};

// Reset cab options state
export const resetCabOptionsState = () => {
  return true;
};

// Update local fare
export const updateLocalFare = async (
  vehicleId: string, 
  fareData: {
    package4hr40km?: number;
    package8hr80km?: number;
    package10hr100km?: number;
    extraKmRate?: number;
    extraHourRate?: number;
    [key: string]: any;
  }
) => {
  const endpoints = [
    // Primary endpoint using direct-local-fares.php
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/direct-local-fares.php`,
    // Fallback to admin endpoint
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/direct-local-fares.php`,
    // Last resort using general fare update endpoint
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/direct-fare-update.php?tripType=local`
  ];

  console.log(`Attempting to update local fares for vehicle ${vehicleId}`, fareData);
  
  // Try multiple potential endpoints for maximum compatibility
  let lastError = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      
      // Format data for sending - using string vehicle ID not number
      const data = {
        vehicleId: String(vehicleId),
        vehicle_id: String(vehicleId), // Alternative name
        vehicle_type: String(vehicleId), // Alternative name
        ...fareData,
        packages: {
          '4hrs-40km': fareData.package4hr40km || 0,
          '8hrs-80km': fareData.package8hr80km || 0,
          '10hrs-100km': fareData.package10hr100km || 0,
          'extra-km': fareData.extraKmRate || 0,
          'extra-hour': fareData.extraHourRate || 0
        }
      };
      
      const response = await axios.post(
        endpoint, 
        data,
        { 
          headers: {
            ...getBypassHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Success updating local fares with endpoint ${endpoint}:`, response.data);
      
      // If successful, clear any fare caches
      clearFareCache();
      
      return {
        success: true,
        endpoint,
        data: response.data
      };
    } catch (error) {
      console.error(`Error updating local fares with endpoint ${endpoint}:`, error);
      lastError = error;
      // Continue to try next endpoint
    }
  }
  
  // If we reach here, all endpoints failed
  console.error('All endpoints failed when updating local fares');
  throw lastError || new Error('Failed to update local fares');
};

// Export fare service as a singleton with clearCache method
export const fareService = {
  getBypassHeaders,
  getForcedRequestConfig,
  directFareUpdate,
  initializeDatabase,
  forceSyncOutstationFares,
  syncOutstationFares,
  getOutstationFares,
  getLocalFares,
  getAirportFares,
  getOutstationFaresForVehicle,
  getLocalFaresForVehicle,
  getAirportFaresForVehicle,
  getFaresByTripType,
  clearCache: clearFareCache, // Add the clearCache method to the fareService object
  resetCabOptionsState,
  syncLocalFareTables,
  updateLocalFare
};
