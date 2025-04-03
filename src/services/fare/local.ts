
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';
import { normalizeVehicleId, checkVehicleId } from './vehicleIdValidator';

/**
 * Get all local fares from the backend
 */
export const getAllLocalFares = async (): Promise<Record<string, any>> => {
  try {
    const response = await fetch(`${getApiUrl('/api/local-fares')}?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        ...getBypassHeaders()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch local fares: ${response.status}`);
    }
    
    const data = await response.json();
    return data.fares || {};
  } catch (error) {
    console.error('Error fetching local fares:', error);
    toast.error('Failed to load local fares');
    return {};
  }
};

/**
 * Update local fares for a vehicle
 */
export const updateLocalFares = async (
  vehicleId: string,
  extraKmRate: number,
  extraHourRate: number,
  packages: Array<{ hours: number, km: number, price: number }>
): Promise<boolean> => {
  try {
    console.log(`Starting local fares update for vehicle ID: ${vehicleId}`);
    
    // CRITICAL: First check if vehicle ID is numeric
    if (/^\d+$/.test(vehicleId)) {
      console.error('Rejecting numeric vehicle ID:', vehicleId);
      toast.error(`Invalid numeric vehicle ID: ${vehicleId}. Please use standard vehicle names.`);
      return false;
    }
    
    // Validate vehicle ID through normalizer
    const normalizedId = normalizeVehicleId(vehicleId);
    if (!normalizedId) {
      console.error(`Failed to normalize invalid vehicle ID: ${vehicleId}`);
      toast.error(`Invalid vehicle ID: ${vehicleId}. Please use standard vehicle names.`);
      return false;
    }
    
    // Double-check the ID doesn't become numeric after normalization (shouldn't happen, but safety check)
    if (/^\d+$/.test(normalizedId)) {
      console.error('Normalized ID became numeric, rejecting:', normalizedId);
      toast.error(`Invalid vehicle ID format: ${vehicleId}`);
      return false;
    }
    
    // Check if vehicle exists via backend - CRITICAL STEP
    const isValid = await checkVehicleId(normalizedId);
    if (!isValid) {
      console.error(`Vehicle ID validation failed: ${normalizedId} (original: ${vehicleId})`);
      toast.error(`Vehicle '${vehicleId}' does not exist or is invalid`);
      return false;
    }
    
    // Log the validated vehicle ID
    console.log(`Updating local fares for validated vehicle: ${normalizedId} (original: ${vehicleId})`);
    
    // Find the packages by hours
    const pkg4hr = packages.find(p => p.hours === 4) || { price: 0 };
    const pkg8hr = packages.find(p => p.hours === 8) || { price: 0 };
    const pkg12hr = packages.find(p => p.hours === 12 || p.hours === 10) || { price: 0 };
    
    // Prepare request with normalized ID and package prices
    const requestData = {
      vehicleId: normalizedId,
      price_extra_km: extraKmRate,
      price_extra_hour: extraHourRate,
      price_4hrs_40km: pkg4hr.price,
      price_8hrs_80km: pkg8hr.price,
      price_10hrs_100km: pkg12hr.price
    };
    
    // CHANGE: Use direct-local-fares endpoint instead of local-fares-update for consistency with airport
    const response = await fetch(`${getApiUrl('/api/direct-local-fares')}?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        ...getBypassHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`Local fare update failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Local fares update response:', data);
    
    if (data.status === 'success') {
      toast.success('Local package fares updated successfully');
      
      // Dispatch event to trigger UI refresh
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: {
          vehicleId: normalizedId,
          timestamp: Date.now()
        }
      }));
      
      return true;
    } else {
      toast.error(`Failed to update local fares: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error updating local fares:', error);
    toast.error('Failed to update local fares');
    return false;
  }
};
