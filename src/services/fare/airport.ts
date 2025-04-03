
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';
import { normalizeVehicleId, checkVehicleId } from './vehicleIdValidator';

/**
 * Get all airport fares from the backend
 */
export const getAllAirportFares = async (): Promise<Record<string, any>> => {
  try {
    const response = await fetch(`${getApiUrl('/api/airport-fares')}?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        ...getBypassHeaders()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch airport fares: ${response.status}`);
    }
    
    const data = await response.json();
    return data.fares || {};
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    toast.error('Failed to load airport fares');
    return {};
  }
};

/**
 * Update airport fares for a vehicle
 */
export const updateAirportFares = async (
  vehicleId: string,
  locationFares: {
    pickup?: number;
    drop?: number;
    tier1?: number;
    tier2?: number;
    tier3?: number;
    tier4?: number;
  }
): Promise<boolean> => {
  try {
    // Validate vehicle ID first
    const normalizedId = normalizeVehicleId(vehicleId);
    if (!normalizedId) {
      toast.error(`Invalid vehicle ID: ${vehicleId}`);
      return false;
    }
    
    const isValid = await checkVehicleId(normalizedId);
    if (!isValid) {
      toast.error(`Invalid vehicle: ${vehicleId}`);
      return false;
    }
    
    // Prepare request with normalized ID
    const requestData = {
      vehicleId: normalizedId,
      pickupPrice: locationFares.pickup,
      dropPrice: locationFares.drop,
      tier1Price: locationFares.tier1,
      tier2Price: locationFares.tier2,
      tier3Price: locationFares.tier3,
      tier4Price: locationFares.tier4
    };
    
    // Send request to update airport fares
    const response = await fetch(`${getApiUrl('/api/direct-airport-fares')}?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        ...getBypassHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`Airport fare update failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success') {
      toast.success('Airport fares updated successfully');
      
      // Dispatch event to trigger UI refresh
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: {
          vehicleId: normalizedId,
          timestamp: Date.now()
        }
      }));
      
      return true;
    } else {
      toast.error(`Failed to update airport fares: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error updating airport fares:', error);
    toast.error('Failed to update airport fares');
    return false;
  }
};
