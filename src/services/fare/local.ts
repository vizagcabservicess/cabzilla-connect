
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';
import { normalizeVehicleId, checkVehicleId, STANDARD_VEHICLE_TYPES, NUMERIC_ID_MAPPINGS } from './vehicleIdValidator';

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
 * Validate and normalize vehicle ID with strict blocking for numeric IDs
 */
export const validateAndNormalizeVehicleId = (vehicleId: string): string | null => {
  // CRITICAL: First check if vehicle ID is numeric - handle numeric IDs with improved mapping
  if (/^\d+$/.test(vehicleId)) {
    console.log(`Checking numeric vehicle ID: ${vehicleId}`);
    
    // Check if we have a mapping for this numeric ID
    if (NUMERIC_ID_MAPPINGS[vehicleId]) {
      const mappedId = NUMERIC_ID_MAPPINGS[vehicleId];
      console.log(`Mapped numeric ID ${vehicleId} to ${mappedId}`);
      return mappedId;
    }
    
    // IMPROVEMENT: Try to map common numeric patterns
    if (vehicleId === '1' || vehicleId === '100' || vehicleId === '101' || vehicleId === '102') {
      console.log(`Mapped numeric pattern ${vehicleId} to sedan`);
      return 'sedan';
    }
    
    if (vehicleId === '2' || vehicleId === '200' || vehicleId === '201') {
      console.log(`Mapped numeric pattern ${vehicleId} to ertiga`);
      return 'ertiga';
    }
    
    if (vehicleId === '3' || vehicleId === '300' || vehicleId === '301') {
      console.log(`Mapped numeric pattern ${vehicleId} to innova`);
      return 'innova';
    }
    
    console.error('BLOCKED: Unmapped numeric vehicle ID detected:', vehicleId);
    toast.error(`Invalid numeric vehicle ID: ${vehicleId}. Please use standard vehicle names.`);
    return null;
  }
  
  // Normalize vehicle ID 
  const normalizedId = normalizeVehicleId(vehicleId);
  if (!normalizedId) {
    console.error(`Failed to normalize invalid vehicle ID: ${vehicleId}`);
    toast.error(`Invalid vehicle ID: ${vehicleId}. Please use standard vehicle names.`);
    return null;
  }
  
  // Check if normalized ID is in our standard list
  const isStandard = STANDARD_VEHICLE_TYPES.includes(normalizedId.toLowerCase());
  if (!isStandard) {
    // Check for common aliases
    if (['mpv', 'innova_hycross', 'hycross'].includes(normalizedId.toLowerCase())) {
      return 'innova_crysta';
    } else if (['dzire', 'swift'].includes(normalizedId.toLowerCase())) {
      return 'sedan';
    }
    
    console.error(`Non-standard vehicle ID: ${vehicleId} (normalized: ${normalizedId})`);
    toast.error(`Invalid vehicle ID: ${vehicleId}. Please use standard vehicle names.`);
    return null;
  }
  
  return normalizedId;
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
    
    // Validate and normalize vehicle ID with strict blocking for numeric IDs
    const normalizedId = validateAndNormalizeVehicleId(vehicleId);
    if (!normalizedId) {
      return false; // Validation failed
    }
    
    // CRITICAL: Check if vehicle exists via backend - NEVER proceed without this verification
    console.log(`Verifying vehicle ID exists: ${normalizedId}`);
    const isValid = await checkVehicleId(normalizedId);
    if (!isValid) {
      console.error(`Vehicle ID validation failed: ${normalizedId} (original: ${vehicleId})`);
      toast.error(`Vehicle '${vehicleId}' does not exist or is invalid`);
      return false;
    }
    
    // Log the validated vehicle ID
    console.log(`✅ Updating local fares for validated vehicle: ${normalizedId} (original: ${vehicleId})`);
    
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
    
    console.log('Sending local fare update with data:', requestData);
    
    // IMPROVEMENT: Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      // Use direct-local-fares endpoint with consistent field naming
      const response = await fetch(`${getApiUrl('/api/direct-local-fares')}?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          ...getBypassHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is valid JSON
      let data: any;
      try {
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        // Strip out any leading PHP errors before JSON
        const jsonStart = responseText.indexOf('{');
        if (jsonStart > 0) {
          console.error('PHP errors detected before JSON:', responseText.substring(0, jsonStart));
          data = JSON.parse(responseText.substring(jsonStart));
        } else {
          data = JSON.parse(responseText);
        }
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }
      
      console.log('Local fares update response:', data);
      
      if (data && data.status === 'success') {
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
        toast.error(`Failed to update local fares: ${data?.message || 'Unknown error'}`);
        return false;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timed out');
        throw new Error('Request timed out. Server may be overloaded.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error updating local fares:', error);
    toast.error(`Failed to update local fares: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};
