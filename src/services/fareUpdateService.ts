import { apiCall } from '@/utils/apiHelper';
import { clearVehicleDataCache } from './vehicleDataService';
import { toast } from 'sonner';

export interface LocalFareUpdate {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

export interface AirportFareUpdate {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  nightCharges: number;
  extraWaitingCharges: number;
}

export interface OutstationFareUpdate {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  // Add these properties to fix the TypeScript error
  roundTripBasePrice?: number;
  roundTripPricePerKm?: number;
}

/**
 * Updates local package fares for a vehicle
 */
export async function updateLocalFare(data: LocalFareUpdate) {
  console.log('Updating local fare:', data);
  
  try {
    // Validate data
    if (!data.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Make sure all numeric values are properly set (not undefined)
    const fareData = {
      vehicleId: data.vehicleId,
      price4hrs40km: data.price4hrs40km || 0,
      price8hrs80km: data.price8hrs80km || 0,
      price10hrs100km: data.price10hrs100km || 0,
      priceExtraKm: data.priceExtraKm || 0,
      priceExtraHour: data.priceExtraHour || 0
    };
    
    const response = await apiCall('api/admin/update-local-fare.php', {
      data: fareData,
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
      }));
      
      return response;
    } else {
      console.error('Error updating local fare:', response.message);
      throw new Error(response.message || 'Failed to update local fare');
    }
  } catch (error: any) {
    console.error('Error in updateLocalFare:', error);
    throw error;
  }
}

// Add alias for updateLocalFare as updateLocalFares for compatibility
export const updateLocalFares = updateLocalFare;

/**
 * Updates airport transfer fares for a vehicle
 */
export async function updateAirportFare(data: AirportFareUpdate) {
  console.log('Updating airport fare:', data);
  
  try {
    // Validate data
    if (!data.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Make sure all numeric values are properly set (not undefined)
    const fareData = {
      vehicleId: data.vehicleId,
      basePrice: data.basePrice || 0,
      pricePerKm: data.pricePerKm || 0,
      pickupPrice: data.pickupPrice || 0,
      dropPrice: data.dropPrice || 0,
      tier1Price: data.tier1Price || 0,
      tier2Price: data.tier2Price || 0,
      tier3Price: data.tier3Price || 0,
      tier4Price: data.tier4Price || 0,
      extraKmCharge: data.extraKmCharge || 0,
      nightCharges: data.nightCharges || 0,
      extraWaitingCharges: data.extraWaitingCharges || 0
    };
    
    try {
      // First try the direct-airport-fares-update endpoint which is more reliable
      const directResponse = await apiCall('api/admin/direct-airport-fares-update.php', {
        data: fareData,
        method: 'POST',
        headers: {
          'X-Admin-Mode': 'true'
        }
      });
      
      if (directResponse.status === 'success') {
        // Clear vehicle cache to ensure updated data is fetched next time
        clearVehicleDataCache();
        
        // Dispatch an event to notify components that fares changed
        window.dispatchEvent(new CustomEvent('airport-fares-updated', {
          detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
        }));
        
        toast.success('Airport fares updated successfully');
        return directResponse;
      }
      
      // If direct endpoint fails, try the original endpoint
      console.log('Direct endpoint failed, trying original endpoint...');
    } catch (directError) {
      console.error('Error with direct endpoint:', directError);
      // Continue to try original endpoint
    }
    
    // Original endpoint as fallback
    const response = await apiCall('api/admin/update-airport-fare.php', {
      data: fareData,
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
      }));
      
      toast.success('Airport fares updated successfully');
      return response;
    } else {
      console.error('Error updating airport fare:', response.message);
      toast.error(response.message || 'Failed to update airport fare');
      throw new Error(response.message || 'Failed to update airport fare');
    }
  } catch (error: any) {
    console.error('Error in updateAirportFare:', error);
    toast.error(error.message || 'Error updating airport fare');
    throw error;
  }
}

// Add alias for updateAirportFare as updateAirportFares for compatibility
export const updateAirportFares = updateAirportFare;

/**
 * Updates outstation fares for a vehicle
 */
export async function updateOutstationFare(data: OutstationFareUpdate) {
  console.log('Updating outstation fare:', data);
  
  try {
    // Validate data
    if (!data.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Make sure all numeric values are properly set (not undefined)
    const fareData = {
      vehicleId: data.vehicleId,
      basePrice: data.basePrice || 0,
      pricePerKm: data.pricePerKm || 0,
      driverAllowance: data.driverAllowance || 0,
      nightHaltCharge: data.nightHaltCharge || 0,
      // Include the optional round trip parameters if they exist
      ...(data.roundTripBasePrice !== undefined && { roundTripBasePrice: data.roundTripBasePrice }),
      ...(data.roundTripPricePerKm !== undefined && { roundTripPricePerKm: data.roundTripPricePerKm })
    };
    
    const response = await apiCall('api/admin/update-outstation-fare.php', {
      data: fareData,
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('outstation-fares-updated', {
        detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
      }));
      
      return response;
    } else {
      console.error('Error updating outstation fare:', response.message);
      throw new Error(response.message || 'Failed to update outstation fare');
    }
  } catch (error: any) {
    console.error('Error in updateOutstationFare:', error);
    throw error;
  }
}

// Add alias for updateOutstationFare as updateOutstationFares for compatibility
export const updateOutstationFares = updateOutstationFare;

/**
 * Gets all outstation fares from the backend
 */
export async function getAllOutstationFares() {
  try {
    const response = await apiCall('api/admin/outstation-fares.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      return response.fares || [];
    }
    
    console.error('Error getting outstation fares:', response.message);
    return [];
  } catch (error: any) {
    console.error('Error in getAllOutstationFares:', error);
    return [];
  }
}

/**
 * Gets all local fares from the backend
 */
export async function getAllLocalFares() {
  try {
    const response = await apiCall('api/admin/local-fares.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      return response.fares || [];
    }
    
    console.error('Error getting local fares:', response.message);
    return [];
  } catch (error: any) {
    console.error('Error in getAllLocalFares:', error);
    return [];
  }
}

/**
 * Gets all airport fares from the backend
 */
export async function getAllAirportFares() {
  try {
    const response = await apiCall('api/admin/airport-fares.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true'
      }
    });
    
    if (response.status === 'success') {
      return response.fares || [];
    }
    
    console.error('Error getting airport fares:', response.message);
    return [];
  } catch (error: any) {
    console.error('Error in getAllAirportFares:', error);
    return [];
  }
}

/**
 * Syncs the airport fares table from a reliable source
 */
export async function syncAirportFares(forceRefresh: boolean = false): Promise<boolean> {
  try {
    console.log('Syncing airport fares table');
    
    const response = await apiCall('api/admin/sync-airport-fares.php', {
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    }
    
    console.error('Failed to sync airport fares:', response.message);
    return false;
  } catch (error: any) {
    console.error('Error syncing airport fares:', error);
    return false;
  }
}

/**
 * Syncs the local fares table from a reliable source
 */
export async function syncLocalFares(forceRefresh: boolean = false): Promise<boolean> {
  try {
    console.log('Syncing local fares table');
    
    const response = await apiCall('api/admin/sync-local-fares.php', {
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    }
    
    console.error('Failed to sync local fares:', response.message);
    return false;
  } catch (error: any) {
    console.error('Error syncing local fares:', error);
    return false;
  }
}

/**
 * Syncs the outstation fares table from a reliable source
 */
export async function syncOutstationFares(forceRefresh: boolean = false): Promise<boolean> {
  try {
    console.log('Syncing outstation fares table');
    
    const response = await apiCall('api/admin/sync-outstation-fares.php', {
      method: 'POST',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    if (response.status === 'success') {
      // Clear vehicle cache to ensure updated data is fetched next time
      clearVehicleDataCache();
      
      // Dispatch an event to notify components that fares changed
      window.dispatchEvent(new CustomEvent('outstation-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    }
    
    console.error('Failed to sync outstation fares:', response.message);
    return false;
  } catch (error: any) {
    console.error('Error syncing outstation fares:', error);
    return false;
  }
}
