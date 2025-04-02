import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation } from '@/utils/apiHelper';

// Comprehensive ID mapping with all known numeric IDs and their proper vehicle_ids
const numericIdMapExtended: Record<string, string> = {
  '1': 'sedan',
  '2': 'ertiga',
  '180': 'etios',
  '1266': 'MPV',
  '592': 'Urbania',
  '1270': 'MPV',
  '1271': 'etios',
  '1272': 'etios',
  '1273': 'etios',
  '1274': 'etios',
  '1275': 'etios',
  '1276': 'etios',
  '1277': 'etios',
  '1278': 'etios',
  '1279': 'etios',
  '1280': 'etios',
  '100': 'sedan',
  '101': 'sedan',
  '102': 'sedan',
  '103': 'sedan',
  '200': 'ertiga',
  '201': 'ertiga'
};

// CRITICAL FIX: Normalize and validate vehicle ID to prevent numeric ID usage
const normalizeVehicleId = (vehicleId: string | number): string => {
  if (!vehicleId) {
    console.error('Empty vehicleId provided to normalizeVehicleId');
    throw new Error('Vehicle ID is required');
  }
  
  // Convert to string and trim
  let normalizedId = String(vehicleId).trim();
  console.log(`Normalizing vehicle ID: ${normalizedId}`);
  
  // Remove item- prefix if it exists
  if (normalizedId.startsWith('item-')) {
    normalizedId = normalizedId.substring(5);
    console.log(`Removed item- prefix, now: ${normalizedId}`);
  }
  
  // Check if this is already a known vehicle ID string
  const knownVehicleIds = ['sedan', 'ertiga', 'etios', 'MPV', 'Urbania'];
  if (knownVehicleIds.includes(normalizedId)) {
    console.log(`Using known vehicle ID: ${normalizedId}`);
    return normalizedId;
  }
  
  // CRITICAL FIX: Map numeric IDs to proper vehicle_id values
  if (numericIdMapExtended[normalizedId]) {
    const mappedId = numericIdMapExtended[normalizedId];
    console.log(`CRITICAL: Converting numeric ID ${normalizedId} to vehicle_id: ${mappedId}`);
    return mappedId;
  }
  
  // If it's numeric, reject it completely - ZERO TOLERANCE POLICY
  if (/^\d+$/.test(normalizedId)) {
    console.error(`REJECTED: Numeric ID ${normalizedId} not allowed as vehicle ID to prevent duplicates`);
    throw new Error(`Cannot use numeric ID ${normalizedId} as a vehicle identifier. Please use the proper vehicle ID like 'sedan', 'ertiga', 'etios', etc.`);
  }
  
  return normalizedId;
};

// Enhanced verification function to always return proper vehicle_id
const verifyVehicleId = async (vehicleId: string): Promise<string> => {
  try {
    console.log(`Starting vehicle ID verification for: ${vehicleId}`);
    
    // First normalize the ID - this will reject any unmapped numeric IDs immediately
    let normalizedId;
    try {
      normalizedId = normalizeVehicleId(vehicleId);
      console.log(`After normalization: ${normalizedId}`);
    } catch (error) {
      console.error(`Error normalizing vehicle ID: ${error}`);
      throw error; // Re-throw to prevent processing with invalid IDs
    }
    
    // DOUBLE CHECK: After normalization, check again that it's not numeric
    if (/^\d+$/.test(normalizedId)) {
      console.error(`EMERGENCY: Normalized vehicle ID '${normalizedId}' is still numeric. Rejecting.`);
      throw new Error(`Cannot use numeric ID ${normalizedId}. Please use a proper vehicle ID like 'sedan'.`);
    }
    
    // Use check-vehicle endpoint to verify this ID exists
    console.log(`Verifying vehicle ID exists: ${normalizedId}`);
    try {
      const checkResult = await directVehicleOperation('/api/admin/check-vehicle.php', 'GET', {
        vehicleId: normalizedId
      });
      
      // Check if the response indicates this is a problematic numeric ID
      if (checkResult && checkResult.isNumericId === true) {
        console.error(`Server rejected numeric ID: ${normalizedId}`);
        throw new Error(checkResult.message || `Cannot use numeric ID ${normalizedId} as vehicle identifier`);
      }
      
      if (checkResult && checkResult.status === 'success' && checkResult.exists) {
        // CRITICAL FIX: Always use the vehicle_id field from the response
        const actualVehicleId = checkResult.vehicle.vehicle_id;
        console.log(`Using verified vehicle_id: ${actualVehicleId} from database`);
        
        if (!actualVehicleId) {
          throw new Error(`Vehicle found but has no vehicle_id. Cannot proceed.`);
        }
        
        // Final validation - never use numeric values as vehicle_id
        if (/^\d+$/.test(actualVehicleId)) {
          console.error(`CRITICAL: Database returned numeric vehicle_id: ${actualVehicleId}. Using normalized ID instead.`);
          return normalizedId;
        }
        
        return actualVehicleId;
      }
      
      // If we couldn't verify, log an error
      console.error(`Could not verify vehicle ID: ${normalizedId}`, checkResult);
      throw new Error(`Vehicle with ID ${normalizedId} not found in database. Cannot update fares.`);
    } catch (checkError) {
      console.error(`Error checking vehicle ID: ${checkError}`);
      throw checkError;
    }
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
    // Verify and normalize the vehicle ID first - always use vehicle_id!
    const verifiedVehicleId = await verifyVehicleId(vehicleId);
    console.log(`Updating outstation fares for vehicle ${vehicleId} (verified: ${verifiedVehicleId})`);
    
    // Use directVehicleOperation for direct API access with explicit endpoint
    const result = await directVehicleOperation('/api/admin/direct-outstation-fares.php', 'POST', {
      vehicleId: verifiedVehicleId,
      basePrice: oneWayBasePrice,
      pricePerKm: oneWayPricePerKm,
      roundTripBasePrice: roundTripBasePrice || oneWayBasePrice * 0.9,
      roundTripPricePerKm: roundTripPricePerKm || oneWayPricePerKm * 0.85,
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
    console.log(`Starting local fare update for vehicle ID ${vehicleId}`);
    
    // CRITICAL FIX: First check - reject numeric IDs immediately, no exceptions
    if (/^\d+$/.test(String(vehicleId))) {
      const errorMsg = `Cannot use numeric ID ${vehicleId} directly. Please use the proper vehicle ID.`;
      console.error(errorMsg);
      toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    
    // Verify and normalize the vehicle ID - get the proper vehicle_id from database
    let verifiedVehicleId;
    try {
      verifiedVehicleId = await verifyVehicleId(vehicleId);
      console.log(`Verified vehicle ID: ${verifiedVehicleId} (original: ${vehicleId})`);
      
      // Triple check - one final verification after all processing
      if (/^\d+$/.test(verifiedVehicleId)) {
        console.error(`CRITICAL ERROR: Verified ID ${verifiedVehicleId} is still numeric! Rejecting.`);
        throw new Error(`Cannot use numeric ID ${verifiedVehicleId}. Please use the proper vehicle ID.`);
      }
    } catch (error) {
      console.error(`Vehicle verification failed: ${error}`);
      toast.error(`Cannot update fares: ${error instanceof Error ? error.message : String(error)}`);
      return Promise.reject(error);
    }
    
    // Extra validation to prevent problematic IDs
    if (!verifiedVehicleId || verifiedVehicleId === 'undefined' || verifiedVehicleId === 'null') {
      console.error("Invalid vehicle ID provided to updateLocalFares:", vehicleId);
      toast.error("Invalid vehicle ID. Please try again.");
      return Promise.reject(new Error("Invalid vehicle ID"));
    }
    
    console.log(`Using final verified ID for local fares: ${verifiedVehicleId}`);
    
    // Try the direct endpoint first which has the most aggressive validation
    try {
      console.log(`Trying direct local fares endpoint with ID: ${verifiedVehicleId}`);
      const directResult = await directVehicleOperation('/api/admin/direct-local-fares.php', 'POST', {
        vehicleId: verifiedVehicleId,  // CRITICAL: Always use the vehicle_id field!
        vehicle_id: verifiedVehicleId, // Add this to be extra sure
        extraKmRate,
        extraHourRate,
        packages: typeof packages === 'object' ? JSON.stringify(packages) : packages,
        use_vehicle_id: 'true' // Signal to backend to explicitly use vehicle_id instead of id
      });
      
      if (directResult && directResult.status === 'success') {
        toast.success(`Updated local fares for ${verifiedVehicleId}`);
        return directResult;
      } else if (directResult && directResult.status === 'error') {
        throw new Error(directResult.message || 'Failed to update local fares using direct endpoint');
      }
    } catch (directError) {
      console.error(`Error with direct endpoint: ${directError}`);
      // Continue to next method - don't return yet
    }
    
    // Try using the local-fares-update endpoint
    console.log(`Trying local-fares-update endpoint with ID: ${verifiedVehicleId}`);
    try {
      const localResult = await directVehicleOperation('/api/admin/local-fares-update.php', 'POST', {
        vehicleId: verifiedVehicleId,
        vehicle_id: verifiedVehicleId, // Add this to be extra sure
        extraKmRate,
        extraHourRate,
        package4hr40km: typeof packages === 'object' && packages['4hrs-40km'] ? packages['4hrs-40km'] : 0,
        package8hr80km: typeof packages === 'object' && packages['8hrs-80km'] ? packages['8hrs-80km'] : 0, 
        package10hr100km: typeof packages === 'object' && packages['10hrs-100km'] ? packages['10hrs-100km'] : 0,
        use_vehicle_id: 'true' // Signal to backend to explicitly use vehicle_id instead of id
      });
      
      console.log("local-fares-update endpoint response:", localResult);
      
      if (localResult && localResult.status === 'success') {
        toast.success(`Updated local fares for ${verifiedVehicleId}`);
        return localResult;
      }
    } catch (localError) {
      console.error(`Error with local-fares-update endpoint: ${localError}`);
    }
    
    // Try using the universal fare update endpoint as fallback
    console.log(`Trying universal fare update endpoint with ID: ${verifiedVehicleId}`);
    try {
      const universalResult = await directVehicleOperation('/api/admin/fare-update.php', 'POST', {
        tripType: 'local',
        vehicleId: verifiedVehicleId,
        vehicle_id: verifiedVehicleId, // Add this to be extra sure 
        extraKmRate,
        extraHourRate,
        price4hr: typeof packages === 'object' && packages['4hrs-40km'] ? packages['4hrs-40km'] : 0,
        price8hr: typeof packages === 'object' && packages['8hrs-80km'] ? packages['8hrs-80km'] : 0,
        price10hr: typeof packages === 'object' && packages['10hrs-100km'] ? packages['10hrs-100km'] : 0,
        use_vehicle_id: 'true' // Signal to backend to explicitly use vehicle_id instead of id
      });
      
      console.log("Universal endpoint response:", universalResult);
      
      if (universalResult && universalResult.status === 'success') {
        toast.success(`Updated local fares for ${verifiedVehicleId}`);
        return universalResult;
      }
    } catch (universalError) {
      console.error(`Error with universal endpoint: ${universalError}`);
    }
    
    // Fall back to the older endpoint as last resort
    console.log(`Trying older local package fares update endpoint with ID: ${verifiedVehicleId}`);
    try {
      const result = await directVehicleOperation('/api/admin/local-package-fares-update.php', 'POST', {
        vehicleId: verifiedVehicleId,
        vehicle_id: verifiedVehicleId, // Add this to be extra sure
        extraKmRate,
        extraHourRate,
        packages: typeof packages === 'object' ? JSON.stringify(packages) : packages,
        use_vehicle_id: 'true' // Signal to backend to explicitly use vehicle_id instead of id
      });
      
      if (result && result.status === 'success') {
        toast.success(`Updated local fares for ${verifiedVehicleId}`);
        return result;
      } else {
        throw new Error(result?.message || 'Failed to update local fares with any endpoint');
      }
    } catch (error: any) {
      console.error(`Error updating local fares with legacy endpoint: ${error.message}`, error);
      toast.error(`Failed to update local fares: ${error.message}`);
      throw error;
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
    // Verify and normalize the vehicle ID first - always use vehicle_id!
    const verifiedVehicleId = await verifyVehicleId(vehicleId);
    console.log(`Updating airport fares for vehicle ${vehicleId} (verified: ${verifiedVehicleId})`);
    
    const result = await directVehicleOperation('/api/admin/airport-fares-update.php', 'POST', {
      vehicleId: verifiedVehicleId,
      vehicle_id: verifiedVehicleId, // Add this to be extra sure
      fares: locationFares,
      use_vehicle_id: 'true' // Signal to backend to explicitly use vehicle_id instead of id
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
