
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';

// Types for airport fares
export interface AirportFare {
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

// Response type for API calls
interface ApiResponse {
  status: string;
  message: string;
  [key: string]: any;
}

// Prevent concurrent operations
let isUpdatingFare = false;
let isFetchingFare = false;
let isSyncingFares = false;

/**
 * Get airport fare for a specific vehicle
 */
export const getAirportFare = async (vehicleId: string): Promise<AirportFare | null> => {
  if (isFetchingFare) {
    console.log('Already fetching airport fare, skipping duplicate call');
    return null;
  }
  
  try {
    isFetchingFare = true;
    console.log('Getting airport fare for vehicle:', vehicleId);
    
    const timestamp = Date.now();
    const response = await directVehicleOperation(
      `api/direct-airport-fares.php?id=${encodeURIComponent(vehicleId)}&_t=${timestamp}`,
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
    console.log('Airport fare response:', response);
    
    if (response && response.status === 'success' && response.fare) {
      return response.fare;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching airport fare:', error);
    return null;
  } finally {
    // Release the lock after a short delay
    setTimeout(() => {
      isFetchingFare = false;
    }, 500);
  }
};

/**
 * Update airport fare for a specific vehicle
 */
export const updateAirportFare = async (fare: AirportFare): Promise<ApiResponse> => {
  if (isUpdatingFare) {
    console.log('Already updating airport fare, skipping duplicate call');
    return { 
      status: 'error', 
      message: 'An update is already in progress. Please try again in a moment.' 
    };
  }
  
  try {
    isUpdatingFare = true;
    console.log('Updating airport fare for vehicle:', fare.vehicleId, fare);
    
    // Ensure all required fields have values
    const validatedFare = {
      ...fare,
      basePrice: fare.basePrice || 0,
      pricePerKm: fare.pricePerKm || 0,
      pickupPrice: fare.pickupPrice || 0,
      dropPrice: fare.dropPrice || 0,
      tier1Price: fare.tier1Price || 0,
      tier2Price: fare.tier2Price || 0,
      tier3Price: fare.tier3Price || 0,
      tier4Price: fare.tier4Price || 0,
      extraKmCharge: fare.extraKmCharge || 0,
      nightCharges: fare.nightCharges || 0,
      extraWaitingCharges: fare.extraWaitingCharges || 0
    };
    
    const response = await directVehicleOperation(
      'api/admin/direct-airport-fares-update.php',
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify(validatedFare)
      }
    );
    
    console.log('Airport fare update response:', response);
    
    if (response && response.status === 'success') {
      return response;
    }
    
    throw new Error(response?.message || 'Failed to update airport fare');
  } catch (error: any) {
    console.error('Error updating airport fare:', error);
    return { 
      status: 'error', 
      message: error.message || 'Failed to update airport fare' 
    };
  } finally {
    // Release the lock after a delay
    setTimeout(() => {
      isUpdatingFare = false;
    }, 500);
  }
};

/**
 * Sync airport fares from vehicle data
 */
export const syncAirportFares = async (applyDefaults: boolean = true): Promise<boolean> => {
  if (isSyncingFares) {
    console.log('Already syncing airport fares, skipping duplicate call');
    return false;
  }
  
  try {
    isSyncingFares = true;
    console.log('Syncing airport fares with applyDefaults =', applyDefaults);
    
    const response = await directVehicleOperation(
      'api/admin/sync-airport-fares.php', 
      'POST',
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: JSON.stringify({ applyDefaults })
      }
    );
    
    console.log('Sync airport fares response:', response);
    
    return (response && response.status === 'success');
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    return false;
  } finally {
    // Release the lock after a delay
    setTimeout(() => {
      isSyncingFares = false;
    }, 1000);
  }
};
