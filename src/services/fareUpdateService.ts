
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';

// Standard vehicle types allowed in the system
const STANDARD_VEHICLE_TYPES = [
  'sedan', 'ertiga', 'innova', 'innova_crysta', 'luxury', 'tempo', 
  'traveller', 'etios', 'mpv', 'urbania', 'hycross'
];

// Known numeric ID mappings
const NUMERIC_ID_MAPPINGS: Record<string, string> = {
  '1': 'sedan',
  '2': 'ertiga', 
  '180': 'etios',
  '1266': 'innova_crysta',
  '592': 'urbania',
  '1290': 'sedan'
};

/**
 * Validate and normalize a vehicle ID
 */
const normalizeVehicleId = (vehicleId: string): string => {
  if (!vehicleId) return '';
  
  // Check if it's a numeric ID that needs mapping
  if (/^\d+$/.test(vehicleId)) {
    const mappedId = NUMERIC_ID_MAPPINGS[vehicleId];
    if (mappedId) {
      console.log(`Mapped numeric ID ${vehicleId} to ${mappedId}`);
      return mappedId;
    }
    console.warn(`Received unmapped numeric ID: ${vehicleId}`);
  }
  
  // Normalize to lowercase with underscores instead of spaces
  return vehicleId.toLowerCase().replace(/\s+/g, '_');
};

/**
 * Check if a vehicle ID is valid before updating
 */
const checkVehicleId = async (vehicleId: string): Promise<boolean> => {
  try {
    // First normalize the ID
    const normalizedId = normalizeVehicleId(vehicleId);
    
    // Skip check if it's empty
    if (!normalizedId) return false;
    
    // Check if it's a standard vehicle type
    const isStandard = STANDARD_VEHICLE_TYPES.includes(normalizedId);
    if (!isStandard) {
      console.warn(`Vehicle ID ${normalizedId} is not a standard type`);
    }
    
    // Call the backend to validate
    const response = await fetch(`${getApiUrl('/api/check-vehicle')}?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        ...getBypassHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vehicleId: normalizedId })
    });
    
    if (!response.ok) {
      throw new Error(`Vehicle check failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Vehicle check response:', data);
    
    return data.vehicleExists || isStandard;
  } catch (error) {
    console.error('Error checking vehicle ID:', error);
    return false;
  }
};

/**
 * Update outstation fares for a vehicle
 */
export const updateOutstationFares = async (params: {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  roundtripBasePrice?: number;
  roundtripPricePerKm?: number;
  driverAllowance?: number;
  nightHaltCharge?: number;
}): Promise<boolean> => {
  try {
    // Validate vehicle ID first
    const normalizedId = normalizeVehicleId(params.vehicleId);
    if (!normalizedId) {
      toast.error('Invalid vehicle ID');
      return false;
    }
    
    const isValid = await checkVehicleId(normalizedId);
    if (!isValid) {
      toast.error(`Invalid vehicle: ${params.vehicleId}`);
      return false;
    }
    
    // Prepare request with normalized ID
    const requestData = {
      ...params,
      vehicleId: normalizedId
    };
    
    console.log('Updating outstation fares with data:', requestData);
    
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
    console.log('Outstation fares update response:', data);
    
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

/**
 * Update local fares for a vehicle
 */
export const updateLocalFares = async (params: {
  vehicleId: string;
  price_4hrs_40km: number;
  price_8hrs_80km: number;
  price_10hrs_100km: number;
  price_extra_km: number;
  price_extra_hour: number;
}): Promise<boolean> => {
  try {
    // Validate vehicle ID first
    const normalizedId = normalizeVehicleId(params.vehicleId);
    if (!normalizedId) {
      toast.error('Invalid vehicle ID');
      return false;
    }
    
    // Check if vehicle exists via backend
    const isValid = await checkVehicleId(normalizedId);
    if (!isValid) {
      toast.error(`Invalid vehicle: ${params.vehicleId}`);
      return false;
    }
    
    // Log the validated vehicle ID
    console.log(`Updating local fares for validated vehicle: ${normalizedId} (original: ${params.vehicleId})`);
    
    // Prepare request with normalized ID
    const requestData = {
      ...params,
      vehicleId: normalizedId
    };
    
    // First try the direct endpoint
    console.log('Trying direct endpoint for local fares update:', requestData);
    try {
      const directResponse = await fetch(`${getApiUrl('/api/direct-local-fares')}?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          ...getBypassHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (directResponse.ok) {
        const directData = await directResponse.json();
        console.log('Direct local fares update response:', directData);
        
        if (directData.status === 'success') {
          toast.success('Local package fares updated successfully');
          
          // Dispatch event to trigger UI refresh
          window.dispatchEvent(new CustomEvent('local-fares-updated', {
            detail: {
              vehicleId: normalizedId,
              timestamp: Date.now()
            }
          }));
          
          return true;
        }
      }
      
      // If direct endpoint failed, try the legacy endpoint
      console.log('Direct endpoint failed, trying legacy endpoint');
    } catch (directError) {
      console.error('Error with direct local fares endpoint:', directError);
      console.log('Falling back to legacy endpoint');
    }
    
    // Legacy endpoint fallback
    const response = await fetch(`${getApiUrl('/api/local-fares-update')}?_t=${Date.now()}`, {
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

/**
 * Update airport fares for a vehicle
 */
export const updateAirportFares = async (params: {
  vehicleId: string;
  basePrice?: number;
  dropPrice?: number;
  pickupPrice?: number;
  pricePerKm?: number;
  extraKmCharge?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
}): Promise<boolean> => {
  try {
    // Validate vehicle ID first
    const normalizedId = normalizeVehicleId(params.vehicleId);
    if (!normalizedId) {
      toast.error('Invalid vehicle ID');
      return false;
    }
    
    const isValid = await checkVehicleId(normalizedId);
    if (!isValid) {
      toast.error(`Invalid vehicle: ${params.vehicleId}`);
      return false;
    }
    
    // Prepare request with normalized ID
    const requestData = {
      ...params,
      vehicleId: normalizedId
    };
    
    console.log('Updating airport fares with data:', requestData);
    
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
    console.log('Airport fares update response:', data);
    
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

/**
 * Clear any cached vehicle data 
 */
export const clearCache = (): void => {
  console.log('Clearing API cache');
  // Create a timestamp for cache busting
  const timestamp = Date.now();
  // Dispatch events to trigger data refresh
  window.dispatchEvent(new CustomEvent('vehicle-data-refresh', { detail: { timestamp } }));
  window.dispatchEvent(new CustomEvent('fare-data-refresh', { detail: { timestamp } }));
};
