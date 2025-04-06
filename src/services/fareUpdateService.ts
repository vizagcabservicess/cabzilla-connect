
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
      
      return response;
    } else {
      console.error('Error updating airport fare:', response.message);
      throw new Error(response.message || 'Failed to update airport fare');
    }
  } catch (error: any) {
    console.error('Error in updateAirportFare:', error);
    throw error;
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
