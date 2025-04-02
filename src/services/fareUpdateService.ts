
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation } from '@/utils/apiHelper';

// Expanded ID mapping with all known numeric IDs and their proper vehicle_ids
const numericIdMapExtended: Record<string, string> = {
  '1': 'sedan',
  '2': 'ertiga',
  '180': 'etios',
  '1266': 'MPV',
  '592': 'Urbania',
  '1270': 'MPV',   // Map these duplicates back to proper vehicle_id
  '1271': 'etios', // Map these duplicates back to proper vehicle_id
  '1272': 'etios', // Map these duplicates back to proper vehicle_id
  '1273': 'etios', // Add any new numeric IDs that have appeared
  '1274': 'etios',
  '1275': 'etios'
};

// Enhanced helper function to normalize vehicle IDs with more robust logic
const normalizeVehicleId = (vehicleId: string | number): string => {
  if (!vehicleId) return '';
  
  // Convert to string and trim
  let normalizedId = String(vehicleId).trim();
  
  // Remove item- prefix if it exists
  if (normalizedId.startsWith('item-')) {
    normalizedId = normalizedId.substring(5);
  }
  
  // Check if this is already a known vehicle ID string
  const knownVehicleIds = ['sedan', 'ertiga', 'etios', 'MPV', 'Urbania'];
  if (knownVehicleIds.includes(normalizedId)) {
    console.log(`Using known vehicle ID: ${normalizedId}`);
    return normalizedId;
  }
  
  // If it's in our mapping, always use the mapped value to prevent duplicate vehicles
  if (numericIdMapExtended[normalizedId]) {
    const mappedId = numericIdMapExtended[normalizedId];
    console.log(`CRITICAL: Converting numeric ID ${normalizedId} to vehicle ID: ${mappedId}`);
    return mappedId;
  }
  
  // If it's purely numeric, we need to check the database for the actual vehicle_id
  if (/^\d+$/.test(normalizedId)) {
    // STRICTER APPROACH: If this is a numeric ID above 10, BLOCK it completely
    // This is more aggressive but necessary to prevent duplicate vehicles
    if (parseInt(normalizedId) > 10) {
      console.error(`REJECTED: Numeric ID ${normalizedId} not allowed as vehicle ID to prevent duplicates`);
      throw new Error(`Cannot use numeric ID ${normalizedId} as a vehicle identifier. Please use the proper vehicle ID.`);
    }
    
    // If it's a small number (below 10), log a warning but allow it
    console.warn(`Small numeric ID: ${normalizedId} - allowing but verifying with check-vehicle.php`);
  }
  
  return normalizedId;
};

// Helper function to verify a vehicle ID exists before updating fares
const verifyVehicleId = async (vehicleId: string): Promise<string> => {
  try {
    // First normalize the ID using our enhanced function
    let normalizedId;
    try {
      normalizedId = normalizeVehicleId(vehicleId);
    } catch (error) {
      console.error(`Error normalizing vehicle ID: ${error}`);
      throw error; // Re-throw to prevent processing with invalid IDs
    }
    
    // Use check-vehicle endpoint to verify this ID exists
    const checkResult = await directVehicleOperation('/api/admin/check-vehicle.php', 'GET', {
      vehicleId: normalizedId
    });
    
    // Check if the response indicates this is a problematic numeric ID
    if (checkResult && checkResult.isNumericId === true) {
      console.error(`Server rejected numeric ID: ${normalizedId}`);
      throw new Error(checkResult.message || `Cannot use numeric ID ${normalizedId} as vehicle identifier`);
    }
    
    if (checkResult && checkResult.status === 'success' && checkResult.exists) {
      // If we found the vehicle, use its actual vehicle_id from the database
      const actualVehicleId = checkResult.vehicle.vehicle_id;
      if (actualVehicleId && actualVehicleId !== normalizedId) {
        console.log(`Using actual vehicle_id ${actualVehicleId} instead of ${normalizedId}`);
        return actualVehicleId;
      }
      return normalizedId;
    }
    
    // If we couldn't verify, log an error but return the normalized ID
    console.error(`Could not verify vehicle ID: ${normalizedId}`, checkResult);
    
    // IMPORTANT: If this is numeric, throw an error to prevent creation of duplicate vehicles
    if (/^\d+$/.test(normalizedId)) {
      throw new Error(`Cannot use numeric ID ${normalizedId} as it may create a duplicate vehicle`);
    }
    
    return normalizedId;
  } catch (error) {
    console.error(`Error verifying vehicle ID: ${error}`);
    throw error;
  }
};

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
  try {
    // Verify and normalize the vehicle ID first
    const verifiedVehicleId = await verifyVehicleId(vehicleId);
    console.log(`Updating outstation fares for vehicle ${vehicleId} (verified: ${verifiedVehicleId})`);
    
    // Use directVehicleOperation for direct API access with explicit endpoint
    const result = await directVehicleOperation('/api/admin/direct-outstation-fares.php', 'POST', {
      vehicleId: verifiedVehicleId,
      basePrice: oneWayBasePrice,
      pricePerKm: oneWayPricePerKm,
      roundTripBasePrice: roundTripBasePrice || oneWayBasePrice * 0.9, // Default to 90% of one-way if not specified
      roundTripPricePerKm: roundTripPricePerKm || oneWayPricePerKm * 0.85, // Default to 85% of one-way if not specified
      driverAllowance,
      nightHaltCharge
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated outstation fares for ${verifiedVehicleId}`);
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
  try {
    // Verify and normalize the vehicle ID first
    const verifiedVehicleId = await verifyVehicleId(vehicleId);
    console.log(`Updating local fares for vehicle ${vehicleId} (verified: ${verifiedVehicleId})`);
    
    // Add additional validation to prevent problematic IDs
    if (!verifiedVehicleId || verifiedVehicleId === 'undefined' || verifiedVehicleId === 'null') {
      console.error("Invalid vehicle ID provided to updateLocalFares:", vehicleId);
      toast.error("Invalid vehicle ID. Please try again.");
      return Promise.reject(new Error("Invalid vehicle ID"));
    }
    
    // First try using the universal fare update endpoint which has better validation
    const universalResult = await directVehicleOperation('/api/admin/fare-update.php', 'POST', {
      tripType: 'local',
      vehicleId: verifiedVehicleId,
      extraKmRate,
      extraHourRate,
      price4hr: typeof packages === 'object' && packages['4hrs-40km'] ? packages['4hrs-40km'] : 0,
      price8hr: typeof packages === 'object' && packages['8hrs-80km'] ? packages['8hrs-80km'] : 0,
      price10hr: typeof packages === 'object' && packages['10hrs-100km'] ? packages['10hrs-100km'] : 0
    });
    
    console.log("Universal endpoint response:", universalResult);
    
    if (universalResult && universalResult.status === 'success') {
      toast.success(`Updated local fares for ${verifiedVehicleId}`);
      return universalResult;
    }
    
    // If universal endpoint fails, try the direct endpoint
    const directResult = await directVehicleOperation('/api/admin/direct-local-fares.php', 'POST', {
      vehicleId: verifiedVehicleId,
      extraKmRate,
      extraHourRate,
      packages: typeof packages === 'object' ? JSON.stringify(packages) : packages
    });
    
    if (directResult && directResult.status === 'success') {
      toast.success(`Updated local fares for ${verifiedVehicleId}`);
      return directResult;
    }
    
    // Fall back to the older endpoint
    const result = await directVehicleOperation('/api/admin/local-package-fares-update.php', 'POST', {
      vehicleId: verifiedVehicleId,
      extraKmRate,
      extraHourRate,
      packages: typeof packages === 'object' ? JSON.stringify(packages) : packages
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated local fares for ${verifiedVehicleId}`);
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
  try {
    // Verify and normalize the vehicle ID first
    const verifiedVehicleId = await verifyVehicleId(vehicleId);
    console.log(`Updating airport fares for vehicle ${vehicleId} (verified: ${verifiedVehicleId})`);
    
    const result = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
      vehicleId: verifiedVehicleId,
      fares: locationFares
    });
    
    if (result && result.status === 'success') {
      toast.success(`Updated airport fares for ${verifiedVehicleId}`);
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
