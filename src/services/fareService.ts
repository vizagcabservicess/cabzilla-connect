import { getBypassHeaders, getForcedRequestConfig } from '@/config/requestConfig';
import { clearFareCache } from '@/lib/fareCalculationService';

// Function to update fares directly
export const directFareUpdate = async (tripType: string, vehicleType: string, fareDetails: any) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/direct-fare-update.php`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getBypassHeaders()
      },
      body: JSON.stringify({
        tripType: tripType,
        vehicleType: vehicleType,
        fareDetails: fareDetails
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Direct fare update response:', data);
    
    // Dispatch an event indicating the fares were updated
    window.dispatchEvent(new CustomEvent('trip-fares-updated', {
      detail: {
        tripType,
        vehicleType,
        fareDetails,
        timestamp: Date.now()
      }
    }));
    
    return data;
  } catch (error) {
    console.error('Failed to update fare directly:', error);
    throw error;
  }
};

// Function to initialize the database
export const initializeDatabase = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/initialize-database.php`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Database initialization response:', data);
    return data;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Function to force sync outstation fares
export const forceSyncOutstationFares = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/sync-outstation-fares.php?force=true`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Force sync outstation fares response:', data);
    return data;
  } catch (error) {
    console.error('Failed to force sync outstation fares:', error);
    throw error;
  }
};

// Function to sync outstation fares
export const syncOutstationFares = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/sync-outstation-fares.php`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Sync outstation fares response:', data);
    return data;
  } catch (error) {
    console.error('Failed to sync outstation fares:', error);
    throw error;
  }
};

// Function to get outstation fares
export const getOutstationFares = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/get-outstation-fares.php`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Get outstation fares response:', data);
    return data;
  } catch (error) {
    console.error('Failed to get outstation fares:', error);
    throw error;
  }
};

// Function to get local fares
export const getLocalFares = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/get-local-fares.php`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Get local fares response:', data);
    return data;
  } catch (error) {
    console.error('Failed to get local fares:', error);
    throw error;
  }
};

// Function to get airport fares
export const getAirportFares = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/get-airport-fares.php`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Get airport fares response:', data);
    return data;
  } catch (error) {
    console.error('Failed to get airport fares:', error);
    throw error;
  }
};

// Function to get outstation fares for a specific vehicle
export const getOutstationFaresForVehicle = async (vehicleId: string) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/get-outstation-fares-for-vehicle.php?vehicle_id=${vehicleId}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Get outstation fares for vehicle ${vehicleId} response:`, data);
    return data;
  } catch (error) {
    console.error(`Failed to get outstation fares for vehicle ${vehicleId}:`, error);
    
    // Return default values if API call fails
    return {
      basePrice: 4200,
      pricePerKm: 14,
      driverAllowance: 250
    };
  }
};

// Function to get local fares for a specific vehicle
export const getLocalFaresForVehicle = async (vehicleId: string) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/get-local-fares-for-vehicle.php?vehicle_id=${vehicleId}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Get local fares for vehicle ${vehicleId} response:`, data);
    return data;
  } catch (error) {
    console.error(`Failed to get local fares for vehicle ${vehicleId}:`, error);
    
    // Return default values if API call fails
    return {
      package4hr40km: 800,
      package8hr80km: 1500,
      package10hr100km: 1800
    };
  }
};

// Function to get airport fares for a specific vehicle
export const getAirportFaresForVehicle = async (vehicleId: string) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/get-airport-fares-for-vehicle.php?vehicle_id=${vehicleId}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Get airport fares for vehicle ${vehicleId} response:`, data);
    return data;
  } catch (error) {
    console.error(`Failed to get airport fares for vehicle ${vehicleId}:`, error);
    
    // Return default values if API call fails
    return {
      basePrice: 1000,
      tier1Price: 800,
      tier2Price: 1200,
      tier3Price: 1800,
      tier4Price: 2500,
      extraKmCharge: 14,
      dropPrice: 1200
    };
  }
};

// Function to get fares by trip type
export const getFaresByTripType = async (tripType: string) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/get-fares-by-trip-type.php?tripType=${tripType}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Get fares for trip type ${tripType} response:`, data);
    return data;
  } catch (error) {
    console.error(`Failed to get fares for trip type ${tripType}:`, error);
    throw error;
  }
};

// Function to reset cab options state
export const resetCabOptionsState = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBaseUrl}/api/admin/reset-cab-options-state.php`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Reset cab options state response:', data);
    return data;
  } catch (error) {
    console.error('Failed to reset cab options state:', error);
    throw error;
  }
};

// Function to sync local fare tables
export const syncLocalFareTables = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  // Generate a cache-busting timestamp
  const timestamp = Date.now();
  
  try {
    console.log('Starting local fare tables sync');
    
    // Try multiple endpoints
    const endpoints = [
      `${apiBaseUrl}/api/admin/sync-local-fares.php?_t=${timestamp}`,
      `/api/admin/sync-local-fares.php?_t=${timestamp}`
    ];
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            ...getBypassHeaders(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to sync local fare tables from ${endpoint}: ${response.status} ${response.statusText}`);
          continue; // Try next endpoint
        }
        
        const data = await response.json();
        console.log(`Local fare tables sync response from ${endpoint}:`, data);
        
        if (data.status === 'success') {
          // Dispatch an event indicating the local fares were updated
          window.dispatchEvent(new CustomEvent('local-fares-updated', {
            detail: {
              timestamp,
              packagesSynced: data.details?.packages_synced || 0,
              pricingEntriesCreated: data.details?.pricing_entries_created || 0
            }
          }));
          
          // Clear all caches
          clearFareCache();
          
          console.log('Local fare tables sync completed successfully');
          return true;
        } else {
          throw new Error(data.message || 'Unknown error');
        }
      } catch (error) {
        console.error(`Error syncing local fare tables from ${endpoint}:`, error);
        
        // If this is the last endpoint, re-throw the error
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw error;
        }
      }
    }
    
    throw new Error('All endpoints failed');
  } catch (error) {
    console.error('Failed to sync local fare tables:', error);
    throw error;
  }
};

// Add a new function to sync vehicle tables
export const syncVehicleTables = async () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  // Generate a cache-busting timestamp
  const timestamp = Date.now();
  
  try {
    console.log('Starting vehicle tables sync');
    
    // Try multiple endpoints
    const endpoints = [
      `${apiBaseUrl}/api/admin/sync-vehicle-tables.php?_t=${timestamp}`,
      `/api/admin/sync-vehicle-tables.php?_t=${timestamp}`
    ];
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            ...getBypassHeaders(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to sync vehicle tables from ${endpoint}: ${response.status} ${response.statusText}`);
          continue; // Try next endpoint
        }
        
        const data = await response.json();
        console.log(`Vehicle tables sync response from ${endpoint}:`, data);
        
        if (data.status === 'success') {
          // Dispatch an event indicating the vehicle tables were synced
          window.dispatchEvent(new CustomEvent('vehicle-tables-synced', {
            detail: {
              timestamp,
              vehiclesSynced: data.details?.vehicles_synced || 0,
              pricingEntriesCreated: data.details?.pricing_entries_created || 0
            }
          }));
          
          // Clear all caches
          clearFareCache();
          
          console.log('Vehicle tables sync completed successfully');
          return true;
        } else {
          throw new Error(data.message || 'Unknown error');
        }
      } catch (error) {
        console.error(`Error syncing vehicle tables from ${endpoint}:`, error);
        
        // If this is the last endpoint, re-throw the error
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw error;
        }
      }
    }
    
    throw new Error('All endpoints failed');
  } catch (error) {
    console.error('Failed to sync vehicle tables:', error);
    throw error;
  }
};

// Export the fareService object with its methods
let lastCacheClearTime = Date.now();
export const fareService = {
  clearCache: clearFareCache,
  getBypassHeaders,
  getForcedRequestConfig,
  getLastCacheClearTime: () => lastCacheClearTime
};
