
import { LocalFare, AirportFare, OutstationFare } from '@/types/cab';
import { toast } from 'sonner';
import { directApiCall, directApiPost, directApiCallWithFallback, directApiPostWithFallback } from '@/utils/directApiHelper';
import { clearVehicleDataCache } from './vehicleDataService';
import { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart } from '@/config/requestConfig';

// Fare cache to avoid repeated API calls
let fareCache = {
  local: new Map(),
  airport: new Map(),
  outstation: new Map()
};

/**
 * The main fare service with all fare-related functionality
 */
export const fareService = {
  // Clear the fare cache
  clearCache: () => {
    console.log('Clearing fare cache');
    fareCache = {
      local: new Map(),
      airport: new Map(),
      outstation: new Map()
    };
  },

  // Initialize the database tables
  initializeDatabase: async () => {
    try {
      const response = await fetch('/api/admin/init-database.php', {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      return data && data.success === true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return false;
    }
  },

  // Get bypass headers
  getBypassHeaders: () => getBypassHeaders(),

  // Get forced request config
  getForcedRequestConfig: () => getForcedRequestConfig(),
  
  // Reset cab options state
  resetCabOptionsState: () => {
    // Dispatch an event to notify components
    window.dispatchEvent(new CustomEvent('cab-options-reset'));
  },
  
  // Direct fare update
  directFareUpdate: async (fareType: string, data: any) => {
    try {
      const response = await directApiPost(`/api/admin/direct-${fareType}-fares-update.php`, data, {
        headers: getBypassHeaders()
      });
      
      return response;
    } catch (error) {
      console.error(`Failed to update ${fareType} fares:`, error);
      throw error;
    }
  }
};

/**
 * Get local fares for all vehicles
 */
export async function getLocalFares(): Promise<LocalFare[]> {
  try {
    if (fareCache.local.size > 0) {
      return Array.from(fareCache.local.values());
    }
    
    const response = await directApiCall('/api/admin/local-fares.php', {
      headers: getBypassHeaders()
    });
    
    if (response && response.fares && Array.isArray(response.fares)) {
      // Cache the fares
      response.fares.forEach((fare: LocalFare) => {
        fareCache.local.set(fare.vehicleId, fare);
      });
      
      return response.fares;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get local fares:', error);
    return [];
  }
}

/**
 * Get local fares for a specific vehicle
 */
export async function getLocalFaresForVehicle(vehicleId: string): Promise<LocalFare | null> {
  try {
    if (fareCache.local.has(vehicleId)) {
      return fareCache.local.get(vehicleId);
    }
    
    const fares = await getLocalFares();
    const vehicleFare = fares.find(fare => fare.vehicleId === vehicleId);
    
    if (vehicleFare) {
      return vehicleFare;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get local fares for vehicle ${vehicleId}:`, error);
    return null;
  }
}

/**
 * Get airport fares for all vehicles
 */
export async function getAirportFares(): Promise<AirportFare[]> {
  try {
    if (fareCache.airport.size > 0) {
      return Array.from(fareCache.airport.values());
    }
    
    const response = await directApiCall('/api/admin/airport-fares.php', {
      headers: getBypassHeaders()
    });
    
    if (response && response.fares && Array.isArray(response.fares)) {
      // Cache the fares
      response.fares.forEach((fare: AirportFare) => {
        fareCache.airport.set(fare.vehicleId, fare);
      });
      
      return response.fares;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get airport fares:', error);
    return [];
  }
}

/**
 * Get airport fares for a specific vehicle
 */
export async function getAirportFaresForVehicle(vehicleId: string): Promise<AirportFare | null> {
  try {
    if (fareCache.airport.has(vehicleId)) {
      return fareCache.airport.get(vehicleId);
    }
    
    const fares = await getAirportFares();
    const vehicleFare = fares.find(fare => fare.vehicleId === vehicleId);
    
    if (vehicleFare) {
      return vehicleFare;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get airport fares for vehicle ${vehicleId}:`, error);
    return null;
  }
}

/**
 * Get outstation fares for all vehicles
 */
export async function getOutstationFares(): Promise<OutstationFare[]> {
  try {
    if (fareCache.outstation.size > 0) {
      return Array.from(fareCache.outstation.values());
    }
    
    const response = await directApiCall('/api/admin/outstation-fares.php', {
      headers: getBypassHeaders()
    });
    
    if (response && response.fares && Array.isArray(response.fares)) {
      // Cache the fares
      response.fares.forEach((fare: OutstationFare) => {
        fareCache.outstation.set(fare.vehicleId, fare);
      });
      
      return response.fares;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get outstation fares:', error);
    return [];
  }
}

/**
 * Get outstation fares for a specific vehicle
 */
export async function getOutstationFaresForVehicle(vehicleId: string): Promise<OutstationFare | null> {
  try {
    if (fareCache.outstation.has(vehicleId)) {
      return fareCache.outstation.get(vehicleId);
    }
    
    const fares = await getOutstationFares();
    const vehicleFare = fares.find(fare => fare.vehicleId === vehicleId);
    
    if (vehicleFare) {
      return vehicleFare;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get outstation fares for vehicle ${vehicleId}:`, error);
    return null;
  }
}

/**
 * Get fares by trip type
 */
export async function getFaresByTripType(tripType: string): Promise<any[]> {
  switch (tripType.toLowerCase()) {
    case 'local':
      return getLocalFares();
    case 'airport':
      return getAirportFares();
    case 'outstation':
      return getOutstationFares();
    default:
      console.error(`Unknown trip type: ${tripType}`);
      return [];
  }
}

/**
 * Sync local fare tables
 */
export async function syncLocalFareTables(): Promise<boolean> {
  try {
    const response = await directApiCall('/api/admin/sync-local-fares.php', {
      headers: getBypassHeaders()
    });
    
    return response && response.success === true;
  } catch (error) {
    console.error('Failed to sync local fare tables:', error);
    return false;
  }
}

/**
 * Sync local fares
 */
export async function syncLocalFares(): Promise<boolean> {
  try {
    const response = await directApiCall('/api/admin/sync-local-fares.php', {
      headers: getBypassHeaders()
    });
    
    // Clear the cache
    fareCache.local = new Map();
    
    return response && response.success === true;
  } catch (error) {
    console.error('Failed to sync local fares:', error);
    return false;
  }
}

/**
 * Sync airport fares
 */
export async function syncAirportFares(): Promise<boolean> {
  try {
    const response = await directApiCall('/api/admin/sync-airport-fares.php', {
      headers: getBypassHeaders()
    });
    
    // Clear the cache
    fareCache.airport = new Map();
    
    return response && response.success === true;
  } catch (error) {
    console.error('Failed to sync airport fares:', error);
    return false;
  }
}

/**
 * Sync outstation fares
 */
export async function syncOutstationFares(): Promise<boolean> {
  try {
    const response = await directApiCall('/api/admin/sync-outstation-fares.php', {
      headers: getBypassHeaders()
    });
    
    // Clear the cache
    fareCache.outstation = new Map();
    
    return response && response.success === true;
  } catch (error) {
    console.error('Failed to sync outstation fares:', error);
    return false;
  }
}

/**
 * Force sync outstation fares
 */
export async function forceSyncOutstationFares(): Promise<boolean> {
  try {
    const response = await directApiCall('/api/admin/force-sync-outstation-fares.php', {
      headers: getBypassHeaders()
    });
    
    // Clear the cache
    fareCache.outstation = new Map();
    
    return response && response.success === true;
  } catch (error) {
    console.error('Failed to force sync outstation fares:', error);
    return false;
  }
}

/**
 * Update airport fare
 */
export async function updateAirportFare(fare: AirportFare): Promise<boolean> {
  try {
    const response = await directApiPost('/api/admin/update-airport-fare.php', fare, {
      headers: getBypassHeaders()
    });
    
    if (response && response.success === true) {
      // Update the cache
      fareCache.airport.set(fare.vehicleId, fare);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to update airport fare:', error);
    return false;
  }
}

/**
 * Update local fare
 */
export async function updateLocalFare(fare: LocalFare): Promise<boolean> {
  try {
    const response = await directApiPost('/api/admin/update-local-fare.php', fare, {
      headers: getBypassHeaders()
    });
    
    if (response && response.success === true) {
      // Update the cache
      fareCache.local.set(fare.vehicleId, fare);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to update local fare:', error);
    return false;
  }
}

/**
 * Update outstation fare
 */
export async function updateOutstationFare(fare: OutstationFare): Promise<boolean> {
  try {
    const response = await directApiPost('/api/admin/update-outstation-fare.php', fare, {
      headers: getBypassHeaders()
    });
    
    if (response && response.success === true) {
      // Update the cache
      fareCache.outstation.set(fare.vehicleId, fare);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to update outstation fare:', error);
    return false;
  }
}
