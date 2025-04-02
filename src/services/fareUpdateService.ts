
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
  
  // Ensure vehicleId is a string and properly formatted
  if (!vehicleId || vehicleId === 'undefined') {
    console.error("Invalid vehicle ID provided to updateLocalFares:", vehicleId);
    toast.error("Invalid vehicle ID. Please try again.");
    return Promise.reject(new Error("Invalid vehicle ID"));
  }
  
  // Clean the vehicleId if it contains a prefix
  if (typeof vehicleId === 'string' && vehicleId.startsWith('item-')) {
    vehicleId = vehicleId.substring(5);
    console.log(`Cleaned vehicleId to: ${vehicleId}`);
  }
  
  try {
    // Try using the direct endpoint first
    const directResult = await directVehicleOperation('/api/admin/direct-local-fares.php', 'POST', {
      vehicleId,
      extraKmRate,
      extraHourRate,
      packages: typeof packages === 'object' ? JSON.stringify(packages) : packages
    });
    
    if (directResult && directResult.status === 'success') {
      toast.success(`Updated local fares for ${vehicleId}`);
      return directResult;
    }
    
    // Fall back to the older endpoint
    const result = await directVehicleOperation('/api/admin/local-package-fares-update.php', 'POST', {
      vehicleId,
      extraKmRate,
      extraHourRate,
      packages: typeof packages === 'object' ? JSON.stringify(packages) : packages
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
  console.log(`Fetching all outstation fares from API directly`);
  
  try {
    // First try the direct admin endpoint for outstation fares with explicit force_refresh
    const result = await directVehicleOperation('/api/admin/direct-outstation-fares.php', 'GET', {
      getAllFares: 'true',
      force_refresh: 'true', // Force synchronization with the database
      force_sync: 'true',   // Additional parameter to ensure fresh data
      includeInactive: 'true', // Include inactive vehicles for admin view
      isAdminMode: 'true'    // Ensure we're in admin mode
    });
    
    if (result && result.fares && Object.keys(result.fares).length > 0) {
      console.log(`Retrieved ${Object.keys(result.fares).length} outstation fares directly`);
      return result.fares;
    }
    
    // Try the fallback endpoint if first one returns empty
    const fallbackResult = await directVehicleOperation('/api/admin/outstation-fares-update.php', 'GET', {
      sync: 'true',
      force_sync: 'true',
      force_refresh: 'true',
      includeInactive: 'true', 
      isAdminMode: 'true'
    });
    
    if (fallbackResult && fallbackResult.fares && Object.keys(fallbackResult.fares).length > 0) {
      console.log(`Retrieved ${Object.keys(fallbackResult.fares).length} outstation fares from fallback`);
      return fallbackResult.fares;
    }
    
    // If both methods fail, try to get vehicles directly and combine with any existing fare data
    const vehiclesResult = await directVehicleOperation('/api/admin/get-vehicles.php', 'GET', { 
      includeInactive: 'true',
      force_sync: 'true',
      force_refresh: 'true',
      isAdminMode: 'true'
    });
    
    if (vehiclesResult && vehiclesResult.vehicles && vehiclesResult.vehicles.length > 0) {
      console.log(`Retrieved ${vehiclesResult.vehicles.length} vehicles with outstation fare data`);
      
      const faresMap: Record<string, any> = {};
      vehiclesResult.vehicles.forEach((vehicle: any) => {
        if (vehicle.id || vehicle.vehicleId) {
          const id = vehicle.id || vehicle.vehicleId;
          faresMap[id] = {
            id: id,
            vehicleId: id,
            name: vehicle.name || id,
            basePrice: vehicle.outstation?.base_price || vehicle.base_price || vehicle.price || 0,
            pricePerKm: vehicle.outstation?.price_per_km || vehicle.price_per_km || 0,
            nightHaltCharge: vehicle.outstation?.night_halt_charge || vehicle.night_halt_charge || 700,
            driverAllowance: vehicle.outstation?.driver_allowance || vehicle.driver_allowance || 300,
            roundTripBasePrice: vehicle.outstation?.roundtrip_base_price || 0,
            roundTripPricePerKm: vehicle.outstation?.roundtrip_price_per_km || 0
          };
        }
      });
      
      if (Object.keys(faresMap).length > 0) {
        return faresMap;
      }
    }
    
    console.warn('No outstation fares found after trying multiple methods');
    return {};
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
