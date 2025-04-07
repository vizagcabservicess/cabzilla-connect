
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

  // Fix database issues
  fixDatabase: async () => {
    try {
      const response = await fetch('/api/admin/fix-database.php', {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fix database:', error);
      throw error;
    }
  },

  // Get airport fares for a specific vehicle
  getAirportFares: async (vehicleId: string, forceRefresh = false) => {
    try {
      if (!forceRefresh && fareCache.airport.has(vehicleId)) {
        return fareCache.airport.get(vehicleId);
      }
      
      const response = await directApiCall(`/api/admin/airport-fares.php?vehicleId=${vehicleId}`, {
        headers: getBypassHeaders()
      });
      
      if (response && response.fares) {
        const vehicleFare = Array.isArray(response.fares) 
          ? response.fares.find((fare: AirportFare) => fare.vehicleId === vehicleId)
          : response.fares;
        
        if (vehicleFare) {
          fareCache.airport.set(vehicleId, vehicleFare);
          return vehicleFare;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get airport fares for vehicle ${vehicleId}:`, error);
      throw error;
    }
  },

  // Get local fares for a specific vehicle
  getLocalFaresForVehicle: async (vehicleId: string, forceRefresh = false) => {
    try {
      if (!forceRefresh && fareCache.local.has(vehicleId)) {
        return fareCache.local.get(vehicleId);
      }
      
      const response = await directApiCall(`/api/admin/local-fares.php?vehicleId=${vehicleId}`, {
        headers: getBypassHeaders()
      });
      
      if (response && response.fares) {
        const vehicleFare = Array.isArray(response.fares) 
          ? response.fares.find((fare: LocalFare) => fare.vehicleId === vehicleId)
          : response.fares;
        
        if (vehicleFare) {
          fareCache.local.set(vehicleId, vehicleFare);
          return vehicleFare;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get local fares for vehicle ${vehicleId}:`, error);
      throw error;
    }
  },

  // Get outstation fares for a specific vehicle
  getOutstationFaresForVehicle: async (vehicleId: string, forceRefresh = false) => {
    try {
      if (!forceRefresh && fareCache.outstation.has(vehicleId)) {
        return fareCache.outstation.get(vehicleId);
      }
      
      const response = await directApiCall(`/api/admin/outstation-fares.php?vehicleId=${vehicleId}`, {
        headers: getBypassHeaders()
      });
      
      if (response && response.fares) {
        const vehicleFare = Array.isArray(response.fares) 
          ? response.fares.find((fare: OutstationFare) => fare.vehicleId === vehicleId)
          : response.fares;
        
        if (vehicleFare) {
          fareCache.outstation.set(vehicleId, vehicleFare);
          return vehicleFare;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get outstation fares for vehicle ${vehicleId}:`, error);
      throw error;
    }
  },

  // Sync airport fares
  syncAirportFares: async (forceRefresh = false) => {
    try {
      const response = await directApiPost('/api/admin/sync-airport-fares.php', 
        { forceCreation: forceRefresh },
        { headers: getBypassHeaders() }
      );
      
      // Clear the cache
      fareCache.airport = new Map();
      clearVehicleDataCache();
      
      return response;
    } catch (error) {
      console.error('Failed to sync airport fares:', error);
      throw error;
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

// Export alternate functions for backwards compatibility
export const clearFareCache = fareService.clearCache;
export const getAirportFares = async () => {
  try {
    const response = await directApiCall('/api/admin/airport-fares.php', {
      headers: getBypassHeaders()
    });
    
    if (response && response.fares && Array.isArray(response.fares)) {
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
};

export const getAirportFaresForVehicle = fareService.getAirportFares;
export const getLocalFaresForVehicle = fareService.getLocalFaresForVehicle;
export const getOutstationFaresForVehicle = fareService.getOutstationFaresForVehicle;
export const syncAirportFares = fareService.syncAirportFares;
export const initializeDatabase = fareService.initializeDatabase;
export const resetCabOptionsState = fareService.resetCabOptionsState;
export const directFareUpdate = fareService.directFareUpdate;
