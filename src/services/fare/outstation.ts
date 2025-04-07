
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';
import { normalizeVehicleId, checkVehicleId } from './vehicleIdValidator';

/**
 * Get all outstation fares from the backend
 */
export const getAllOutstationFares = async (): Promise<Record<string, any>> => {
  try {
    const response = await fetch(`${getApiUrl('/api/outstation-fares')}?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        ...getBypassHeaders()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch outstation fares: ${response.status}`);
    }
    
    const data = await response.json();
    return data.fares || {};
  } catch (error) {
    console.error('Error fetching outstation fares:', error);
    toast.error('Failed to load outstation fares');
    return {};
  }
};

/**
 * Update outstation fares for a vehicle
 */
export const updateOutstationFares = async (
  vehicleId: string,
  basePrice: number,
  pricePerKm: number,
  roundTripBasePrice?: number,
  roundTripPricePerKm?: number,
  driverAllowance?: number,
  nightHaltCharge?: number
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
      basePrice,
      pricePerKm,
      roundtripBasePrice: roundTripBasePrice,
      roundtripPricePerKm: roundTripPricePerKm,
      driverAllowance,
      nightHaltCharge
    };
    
    // Send request to update fares
    const response = await fetch(`${getApiUrl('/api/direct-outstation-fares')}?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        ...getBypassHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`Outstation fare update failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success') {
      toast.success('Outstation fares updated successfully');
      
      // Dispatch event to trigger UI refresh
      window.dispatchEvent(new CustomEvent('trip-fares-updated', {
        detail: {
          vehicleId: normalizedId,
          tripType: 'outstation',
          timestamp: Date.now()
        }
      }));
      
      return true;
    } else {
      toast.error(`Failed to update outstation fares: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error updating outstation fares:', error);
    toast.error('Failed to update outstation fares');
    return false;
  }
};
