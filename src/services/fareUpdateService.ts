
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation } from '@/utils/apiHelper';

/**
 * Update outstation fares for a specific vehicle
 */
export const updateOutstationFares = async (
  vehicleId: string,
  oneWayBasePrice: number,
  oneWayPricePerKm: number,
  roundTripBasePrice: number = 0,
  roundTripPricePerKm: number = 0,
  driverAllowance: number = 300,
  nightHaltCharge: number = 700
): Promise<any> => {
  console.log(`Updating outstation fares for vehicle ${vehicleId}`);
  
  try {
    // Use directVehicleOperation for direct API access with explicit endpoint
    const result = await directVehicleOperation('/api/admin/direct-outstation-fares.php', 'POST', {
      vehicleId,
      basePrice: oneWayBasePrice,
      pricePerKm: oneWayPricePerKm,
      roundTripBasePrice: roundTripBasePrice || oneWayBasePrice * 0.9, // Default to 90% of one-way if not specified
      roundTripPricePerKm: roundTripPricePerKm || oneWayPricePerKm * 0.85, // Default to 85% of one-way if not specified
      driverAllowance,
      nightHaltCharge
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated outstation fares for ${vehicleId}`);
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update outstation fares');
    }
  } catch (error: any) {
    console.error(`Error updating outstation fares: ${error.message}`, error);
    toast.error(`Failed to update outstation fares: ${error.message}`);
    throw error;
  }
};

/**
 * Update local package fares for a specific vehicle
 */
export const updateLocalFares = async (
  vehicleId: string, 
  extraKmRate: number,
  extraHourRate: number = 0,
  packages: any[] = []
): Promise<any> => {
  console.log(`Updating local fares for vehicle ${vehicleId}`);
  
  try {
    const result = await directVehicleOperation('/api/admin/local-package-fares-update.php', 'POST', {
      vehicleId,
      extraKmRate,
      extraHourRate,
      packages: JSON.stringify(packages)
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated local fares for ${vehicleId}`);
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update local fares');
    }
  } catch (error: any) {
    console.error(`Error updating local fares: ${error.message}`, error);
    toast.error(`Failed to update local fares: ${error.message}`);
    throw error;
  }
};

/**
 * Update airport transfer fares for a specific vehicle
 */
export const updateAirportFares = async (
  vehicleId: string,
  locationFares: Record<string, number>
): Promise<any> => {
  console.log(`Updating airport fares for vehicle ${vehicleId}`);
  
  try {
    const result = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
      vehicleId,
      fares: locationFares
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated airport fares for ${vehicleId}`);
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update airport fares');
    }
  } catch (error: any) {
    console.error(`Error updating airport fares: ${error.message}`, error);
    toast.error(`Failed to update airport fares: ${error.message}`);
    throw error;
  }
};

/**
 * Get outstation fares for all vehicles (force refresh to get live data)
 */
export const getAllOutstationFares = async (): Promise<Record<string, any>> => {
  console.log(`Fetching all outstation fares`);
  
  try {
    // Use directVehicleOperation for direct API access
    const result = await directVehicleOperation('/api/admin/outstation-fares-update.php', 'GET', {
      sync: 'true',
      force_sync: 'true',
      includeInactive: 'true', // Include inactive vehicles for admin view
      isAdminMode: 'true'      // Ensure admin mode is active
    });
    
    if (result && result.status === 'success' && result.fares) {
      console.log(`Retrieved ${Object.keys(result.fares).length} outstation fares`);
      return result.fares;
    } else {
      console.warn('No outstation fares found or API returned error');
      return {};
    }
  } catch (error: any) {
    console.error(`Error fetching outstation fares: ${error.message}`, error);
    toast.error(`Failed to fetch outstation fares: ${error.message}`);
    return {};
  }
};

/**
 * Get local package fares for all vehicles
 */
export const getAllLocalFares = async (): Promise<Record<string, any>> => {
  console.log(`Fetching all local package fares`);
  
  try {
    const result = await directVehicleOperation('/api/admin/local-fares-update.php', 'GET', {
      sync: 'true',
      includeInactive: 'true',
      isAdminMode: 'true'
    });
    
    if (result && result.status === 'success' && result.fares) {
      console.log(`Retrieved ${Object.keys(result.fares).length} local fares`);
      return result.fares;
    } else {
      console.warn('No local fares found or API returned error');
      return {};
    }
  } catch (error: any) {
    console.error(`Error fetching local fares: ${error.message}`, error);
    return {};
  }
};

/**
 * Get airport transfer fares for all vehicles
 */
export const getAllAirportFares = async (): Promise<Record<string, any>> => {
  console.log(`Fetching all airport fares`);
  
  try {
    const result = await directVehicleOperation('/api/admin/airport-fares-update.php', 'GET', {
      includeInactive: 'true',
      isAdminMode: 'true'
    });
    
    if (result && result.status === 'success' && result.fares) {
      console.log(`Retrieved ${Object.keys(result.fares).length} airport fares`);
      return result.fares;
    } else {
      console.warn('No airport fares found or API returned error');
      return {};
    }
  } catch (error: any) {
    console.error(`Error fetching airport fares: ${error.message}`, error);
    return {};
  }
};
