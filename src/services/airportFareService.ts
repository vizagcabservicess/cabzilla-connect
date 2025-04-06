
import { toast } from 'sonner';
import axios from 'axios';

// Define the interface for airport fares
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
  nightCharges?: number;
  extraWaitingCharges?: number;
}

// Define throttling mechanisms at module level to prevent recursive calls
let pendingRequests: Record<string, Promise<any>> = {};
let lastRequestTimes: Record<string, number> = {};
const THROTTLE_TIME = 2000; // 2 seconds between identical requests

/**
 * Get airport fare for a specific vehicle
 */
export const getAirportFare = async (vehicleId: string): Promise<AirportFare | null> => {
  // Check if we've made this request recently
  const now = Date.now();
  const requestKey = `get-${vehicleId}`;
  if (lastRequestTimes[requestKey] && now - lastRequestTimes[requestKey] < THROTTLE_TIME) {
    console.log(`Throttling getAirportFare for ${vehicleId} - too recent`);
    return null;
  }
  
  // Check if there's already a pending request for this vehicle
  if (pendingRequests[requestKey]) {
    console.log(`Reusing pending getAirportFare request for ${vehicleId}`);
    try {
      return await pendingRequests[requestKey];
    } catch (error) {
      console.error('Error in reused request:', error);
      return null;
    }
  }
  
  // Create and store the promise
  lastRequestTimes[requestKey] = now;
  pendingRequests[requestKey] = (async () => {
    try {
      console.log(`Fetching airport fare for vehicle: ${vehicleId}`);
      
      const response = await axios.get(`/api/direct-airport-fares.php`, {
        params: {
          id: vehicleId,
          _t: now // Cache busting
        },
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      console.log('Airport fare API response:', response.data);
      
      if (response.data && response.data.status === 'success' && response.data.fare) {
        return response.data.fare as AirportFare;
      }
      
      if (response.data && response.data.status === 'error') {
        console.warn('API returned error:', response.data.message);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching airport fare:', error);
      return null;
    } finally {
      // Clean up after request completes
      setTimeout(() => {
        delete pendingRequests[requestKey];
      }, 100);
    }
  })();
  
  try {
    return await pendingRequests[requestKey];
  } catch (error) {
    console.error('Error in getAirportFare:', error);
    return null;
  }
};

/**
 * Update airport fare for a specific vehicle
 */
export const updateAirportFare = async (fare: AirportFare): Promise<{ success: boolean; message: string }> => {
  // Apply throttling
  const now = Date.now();
  const requestKey = `update-${fare.vehicleId}`;
  if (lastRequestTimes[requestKey] && now - lastRequestTimes[requestKey] < THROTTLE_TIME) {
    console.log(`Throttling updateAirportFare for ${fare.vehicleId} - too recent`);
    return { 
      success: false, 
      message: 'Please wait a moment before submitting again.' 
    };
  }
  
  // Check for pending request
  if (pendingRequests[requestKey]) {
    console.log(`Already updating airport fare for ${fare.vehicleId}`);
    return { 
      success: false, 
      message: 'An update is already in progress.' 
    };
  }
  
  // Create and store the promise
  lastRequestTimes[requestKey] = now;
  pendingRequests[requestKey] = (async () => {
    try {
      console.log('Updating airport fare with data:', fare);
      
      // Ensure all required fields have valid values
      const validatedFare = {
        ...fare,
        basePrice: Math.max(0, fare.basePrice || 0),
        pricePerKm: Math.max(0, fare.pricePerKm || 0),
        pickupPrice: Math.max(0, fare.pickupPrice || 0),
        dropPrice: Math.max(0, fare.dropPrice || 0),
        tier1Price: Math.max(0, fare.tier1Price || 0),
        tier2Price: Math.max(0, fare.tier2Price || 0),
        tier3Price: Math.max(0, fare.tier3Price || 0),
        tier4Price: Math.max(0, fare.tier4Price || 0),
        extraKmCharge: Math.max(0, fare.extraKmCharge || 0),
        nightCharges: Math.max(0, fare.nightCharges || 0),
        extraWaitingCharges: Math.max(0, fare.extraWaitingCharges || 0)
      };
      
      const response = await axios.post(
        '/api/admin/direct-airport-fares-update.php', 
        validatedFare, 
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'X-Force-Creation': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
      
      console.log('Airport fare update response:', response.data);
      
      if (response.data && response.data.status === 'success') {
        return { success: true, message: 'Airport fare updated successfully' };
      }
      
      return { 
        success: false, 
        message: response.data?.message || 'Failed to update airport fare' 
      };
    } catch (error: any) {
      console.error('Error updating airport fare:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to update airport fare' 
      };
    } finally {
      // Clean up after request completes
      setTimeout(() => {
        delete pendingRequests[requestKey];
      }, 100);
    }
  })();
  
  try {
    return await pendingRequests[requestKey];
  } catch (error: any) {
    console.error('Error in updateAirportFare:', error);
    return { success: false, message: error.message || 'An unexpected error occurred' };
  }
};

/**
 * Sync airport fares from vehicle data
 */
export const syncAirportFares = async (): Promise<boolean> => {
  // Apply throttling
  const now = Date.now();
  const requestKey = 'sync-fares';
  if (lastRequestTimes[requestKey] && now - lastRequestTimes[requestKey] < THROTTLE_TIME * 2) {
    console.log('Throttling syncAirportFares - too recent');
    return false;
  }
  
  // Check for pending request
  if (pendingRequests[requestKey]) {
    console.log('Sync already in progress');
    return false;
  }
  
  // Create and store the promise
  lastRequestTimes[requestKey] = now;
  pendingRequests[requestKey] = (async () => {
    try {
      console.log('Syncing airport fares');
      
      const response = await axios.post(
        '/api/admin/sync-airport-fares.php', 
        { applyDefaults: true },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'X-Force-Creation': 'true'
          }
        }
      );
      
      console.log('Sync response:', response.data);
      
      if (response.data && response.data.status === 'success') {
        toast.success('Airport fares synced successfully');
        return true;
      } else {
        toast.error(response.data?.message || 'Failed to sync airport fares');
        return false;
      }
    } catch (error) {
      console.error('Error syncing airport fares:', error);
      toast.error('Failed to sync airport fares');
      return false;
    } finally {
      // Clean up after request completes
      setTimeout(() => {
        delete pendingRequests[requestKey];
      }, 100);
    }
  })();
  
  try {
    return await pendingRequests[requestKey];
  } catch (error) {
    console.error('Error in syncAirportFares:', error);
    return false;
  }
};
