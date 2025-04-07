
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation, formatDataForMultipart } from '@/utils/apiHelper';

// Comprehensive ID mapping with all known numeric IDs and their proper vehicle_ids
const numericIdMapExtended: Record<string, string> = {
  '1': 'sedan',
  '2': 'ertiga',
  '3': 'innova',
  '4': 'crysta',
  '5': 'tempo',
  '6': 'bus',
  '7': 'van',
  '8': 'suv',
  '9': 'traveller',
  '10': 'luxury',
  '180': 'etios',
  '592': 'urbania',
  '1266': 'mpv',
  '1270': 'mpv',
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
  '201': 'ertiga',
  '202': 'ertiga', 
  '300': 'innova',
  '301': 'innova',
  '302': 'innova',
  '400': 'crysta',
  '401': 'crysta',
  '500': 'tempo',
  '501': 'tempo'
};

// Standard vehicle types to prevent creation of random vehicle IDs
const standardVehicleTypes: string[] = [
  'sedan', 'ertiga', 'innova', 'crysta', 'tempo', 'bus', 'van', 
  'suv', 'traveller', 'luxury', 'etios', 'urbania', 'mpv'
];

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
  
  // Handle comma-separated lists (use first ID only)
  if (normalizedId.includes(',')) {
    const parts = normalizedId.split(',');
    normalizedId = parts[0].trim();
    console.log(`Found comma-separated list, using first ID: ${normalizedId}`);
  }
  
  // Check if this is already a known standard vehicle ID string (case-insensitive)
  const normalizedIdLower = normalizedId.toLowerCase();
  
  for (const known of standardVehicleTypes) {
    if (normalizedIdLower === known.toLowerCase()) {
      console.log(`Using known vehicle ID: ${known.toLowerCase()}`);
      return known.toLowerCase(); // Use lowercase for consistent ID handling
    }
  }
  
  // CRITICAL FIX: Map numeric IDs to proper vehicle_id values
  if (numericIdMapExtended[normalizedId]) {
    const mappedId = numericIdMapExtended[normalizedId];
    console.log(`CRITICAL: Converting numeric ID ${normalizedId} to vehicle_id: ${mappedId}`);
    return mappedId.toLowerCase(); // Use lowercase for consistent ID handling
  }
  
  // If it's numeric, reject it completely - ZERO TOLERANCE POLICY
  if (/^\d+$/.test(normalizedId)) {
    console.error(`REJECTED: Numeric ID ${normalizedId} not allowed as vehicle ID to prevent duplicates`);
    throw new Error(`Cannot use numeric ID ${normalizedId} as a vehicle identifier. Please use the proper vehicle ID like 'sedan', 'ertiga', 'etios', etc.`);
  }
  
  // Final check - only allow standard vehicle types
  if (!standardVehicleTypes.includes(normalizedId.toLowerCase())) {
    console.error(`REJECTED: Non-standard vehicle ID ${normalizedId} is not in allowed list`);
    throw new Error(`Cannot use non-standard vehicle ID ${normalizedId}. Please use one of the standard types: ${standardVehicleTypes.join(', ')}`);
  }
  
  // Return normalized ID in lowercase for consistency
  return normalizedId.toLowerCase();
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
      
      // Triple check - one final verification after all processing
      if (/^\d+$/.test(normalizedId)) {
        console.error(`CRITICAL ERROR: Normalized ID ${normalizedId} is still numeric! Rejecting.`);
        throw new Error(`Cannot use numeric ID ${normalizedId}. Please use the proper vehicle ID.`);
      }
      
      // Only allow standard vehicle types
      if (!standardVehicleTypes.includes(normalizedId.toLowerCase())) {
        console.error(`CRITICAL ERROR: Verified ID ${normalizedId} is not a standard type! Rejecting.`);
        throw new Error(`Cannot use non-standard vehicle ID ${normalizedId}. Please use one of the standard types.`);
      }
      
      return normalizedId;
    } catch (error) {
      console.error(`Error normalizing vehicle ID: ${error}`);
      throw error; // Re-throw to prevent processing with invalid IDs
    }
    
    // Use check-vehicle endpoint to verify this ID exists
    console.log(`Verifying vehicle ID exists: ${normalizedId}`);
    try {
      // FIX: Use direct fetch instead of directVehicleOperation to avoid CORS issues
      const response = await fetch(`${apiBaseUrl}/api/admin/check-vehicle.php?vehicleId=${normalizedId}&_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true', 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to verify vehicle ID: ${response.status} ${response.statusText}`);
      }
      
      const checkResult = await response.json();
      
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
        
        return actualVehicleId.toLowerCase(); // Use lowercase for consistency
      }
      
      // If we couldn't verify, use the normalized ID if it's a standard type
      if (standardVehicleTypes.includes(normalizedId.toLowerCase())) {
        console.log(`Could not verify vehicle ID but it's a standard type: ${normalizedId}`);
        return normalizedId.toLowerCase();
      }
      
      // Otherwise reject
      console.error(`Could not verify non-standard vehicle ID: ${normalizedId}`);
      throw new Error(`Vehicle with ID ${normalizedId} not found and is not a standard type. Cannot update fares.`);
    } catch (checkError) {
      if (standardVehicleTypes.includes(normalizedId.toLowerCase())) {
        console.log(`Error checking vehicle but using standard type: ${normalizedId}`);
        return normalizedId.toLowerCase();
      }
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
    
    // FIX: Use direct fetch with FormData instead of directVehicleOperation
    const formData = new FormData();
    formData.append('vehicleId', verifiedVehicleId);
    formData.append('vehicle_id', verifiedVehicleId);
    formData.append('basePrice', oneWayBasePrice.toString());
    formData.append('pricePerKm', oneWayPricePerKm.toString());
    formData.append('roundTripBasePrice', (roundTripBasePrice || oneWayBasePrice * 0.9).toString());
    formData.append('roundTripPricePerKm', (roundTripPricePerKm || oneWayPricePerKm * 0.85).toString());
    formData.append('driverAllowance', driverAllowance.toString());
    formData.append('nightHaltCharge', nightHaltCharge.toString());
    formData.append('use_vehicle_id', 'true');
    
    const response = await fetch(`${apiBaseUrl}/api/admin/direct-outstation-fares.php?_t=${Date.now()}`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update outstation fares: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
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
    
    // Handle comma-separated IDs (a common source of problems)
    if (typeof vehicleId === 'string' && vehicleId.includes(',')) {
      console.warn(`Found comma-separated ID list: ${vehicleId}. Using first ID only.`);
      const parts = vehicleId.split(',');
      vehicleId = parts[0].trim();
    }
    
    // Verify and normalize the vehicle ID - get the proper vehicle_id from database or fail
    let verifiedVehicleId;
    try {
      verifiedVehicleId = await verifyVehicleId(vehicleId);
      console.log(`Verified vehicle ID: ${verifiedVehicleId} (original: ${vehicleId})`);
      
      // Make sure it's a standard vehicle type
      if (!standardVehicleTypes.includes(verifiedVehicleId.toLowerCase())) {
        console.error(`CRITICAL ERROR: Verified ID ${verifiedVehicleId} is not a standard type! Rejecting.`);
        throw new Error(`Cannot use non-standard vehicle ID ${verifiedVehicleId}. Please use one of the standard types.`);
      }
      
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
    
    // FIX: Use direct fetch with FormData instead of directVehicleOperation
    const formData = new FormData();
    formData.append('vehicleId', verifiedVehicleId);
    formData.append('vehicle_id', verifiedVehicleId);
    formData.append('extraKmRate', extraKmRate.toString());
    formData.append('extraHourRate', extraHourRate.toString());
    formData.append('use_vehicle_id', 'true');
    
    // Add package prices if provided
    if (typeof packages === 'object') {
      if (packages['4hrs-40km']) {
        formData.append('price4hr40km', String(packages['4hrs-40km']));
      }
      if (packages['8hrs-80km']) {
        formData.append('price8hr80km', String(packages['8hrs-80km']));
      }
      if (packages['10hrs-100km']) {
        formData.append('price10hr100km', String(packages['10hrs-100km']));
      }
      formData.append('packages', JSON.stringify(packages));
    }
    
    // Try the new direct endpoint first
    try {
      console.log(`Trying direct-local-fares endpoint with ID: ${verifiedVehicleId}`);
      
      const response = await fetch(`${apiBaseUrl}/api/admin/direct-local-fares.php?_t=${Date.now()}`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (!response.ok) {
        console.warn(`Direct local fares endpoint failed with status: ${response.status}`);
        throw new Error(`Failed to update local fares: ${response.status} ${response.statusText}`);
      }
      
      const responseText = await response.text();
      let directResult;
      
      try {
        directResult = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
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
      // Create new FormData for this request to ensure fresh data
      const localFormData = new FormData();
      localFormData.append('vehicleId', verifiedVehicleId);
      localFormData.append('vehicle_id', verifiedVehicleId);
      localFormData.append('extraKmRate', extraKmRate.toString());
      localFormData.append('extraHourRate', extraHourRate.toString());
      localFormData.append('use_vehicle_id', 'true');
      
      if (typeof packages === 'object') {
        if (packages['4hrs-40km']) {
          localFormData.append('package4hr40km', String(packages['4hrs-40km']));
        }
        if (packages['8hrs-80km']) {
          localFormData.append('package8hr80km', String(packages['8hrs-80km']));
        }
        if (packages['10hrs-100km']) {
          localFormData.append('package10hr100km', String(packages['10hrs-100km']));
        }
      }
      
      const localResponse = await fetch(`${apiBaseUrl}/api/admin/local-fares-update.php?_t=${Date.now()}`, {
        method: 'POST',
        body: localFormData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (!localResponse.ok) {
        console.warn(`local-fares-update endpoint failed with status: ${localResponse.status}`);
        throw new Error(`Failed to update local fares: ${localResponse.status} ${localResponse.statusText}`);
      }
      
      const localResponseText = await localResponse.text();
      let localResult;
      
      try {
        localResult = JSON.parse(localResponseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', localResponseText);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log("local-fares-update endpoint response:", localResult);
      
      if (localResult && localResult.status === 'success') {
        toast.success(`Updated local fares for ${verifiedVehicleId}`);
        return localResult;
      }
    } catch (localError) {
      console.error(`Error with local-fares-update endpoint: ${localError}`);
    }
    
    // Fall back to the older endpoint as last resort
    console.log(`Trying older local package fares update endpoint with ID: ${verifiedVehicleId}`);
    try {
      // Create new FormData for this request to ensure fresh data
      const legacyFormData = new FormData();
      legacyFormData.append('vehicleId', verifiedVehicleId);
      legacyFormData.append('vehicle_id', verifiedVehicleId);
      legacyFormData.append('extraKmRate', extraKmRate.toString());
      legacyFormData.append('extraHourRate', extraHourRate.toString());
      legacyFormData.append('use_vehicle_id', 'true');
      legacyFormData.append('packages', typeof packages === 'object' ? JSON.stringify(packages) : '{}');
      
      const legacyResponse = await fetch(`${apiBaseUrl}/api/admin/local-package-fares-update.php?_t=${Date.now()}`, {
        method: 'POST',
        body: legacyFormData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Admin-Mode': 'true'
        }
      });
      
      if (!legacyResponse.ok) {
        console.warn(`legacy endpoint failed with status: ${legacyResponse.status}`);
        throw new Error(`Failed to update local fares: ${legacyResponse.status} ${legacyResponse.statusText}`);
      }
      
      const legacyResponseText = await legacyResponse.text();
      let legacyResult;
      
      try {
        legacyResult = JSON.parse(legacyResponseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', legacyResponseText);
        throw new Error('Invalid JSON response from server');
      }
      
      if (legacyResult && legacyResult.status === 'success') {
        toast.success(`Updated local fares for ${verifiedVehicleId}`);
        return legacyResult;
      } else {
        throw new Error(legacyResult?.message || 'Failed to update local fares with any endpoint');
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
    
    // FIX: Use direct fetch with FormData instead of directVehicleOperation
    const formData = new FormData();
    formData.append('vehicleId', verifiedVehicleId);
    formData.append('vehicle_id', verifiedVehicleId);
    formData.append('use_vehicle_id', 'true');
    formData.append('fares', JSON.stringify(locationFares));
    
    const response = await fetch(`${apiBaseUrl}/api/admin/airport-fares-update.php?_t=${Date.now()}`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update airport fares: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    try {
      const result = JSON.parse(responseText);
      
      if (result && result.status === 'success') {
        toast.success(`Updated airport fares for ${verifiedVehicleId}`);
        return result;
      } else {
        throw new Error(result?.message || 'Failed to update airport fares');
      }
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid JSON response from server');
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
    const response = await fetch(`${apiBaseUrl}/api/admin/direct-outstation-fares.php?getAllFares=true&force_refresh=true&force_sync=true&includeInactive=true&isAdminMode=true&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.warn(`Outstation fares fetch failed with status: ${response.status}`);
      throw new Error(`Failed to fetch outstation fares: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    let result;
    
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid JSON response from server');
    }
    
    if (result && result.fares && Object.keys(result.fares).length > 0) {
      console.log(`Retrieved ${Object.keys(result.fares).length} outstation fares directly`);
      return result.fares;
    }
    
    // Try the fallback endpoint if first one returns empty
    const fallbackResponse = await fetch(`${apiBaseUrl}/api/admin/outstation-fares-update.php?sync=true&force_sync=true&force_refresh=true&includeInactive=true&isAdminMode=true&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!fallbackResponse.ok) {
      console.warn(`Fallback outstation fares fetch failed with status: ${fallbackResponse.status}`);
      throw new Error(`Failed to fetch outstation fares: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
    }
    
    const fallbackResponseText = await fallbackResponse.text();
    let fallbackResult;
    
    try {
      fallbackResult = JSON.parse(fallbackResponseText);
    } catch (e) {
      console.error('Failed to parse fallback response as JSON:', fallbackResponseText);
      throw new Error('Invalid JSON response from server');
    }
    
    if (fallbackResult && fallbackResult.fares && Object.keys(fallbackResult.fares).length > 0) {
      console.log(`Retrieved ${Object.keys(fallbackResult.fares).length} outstation fares from fallback`);
      return fallbackResult.fares;
    }
    
    // If both methods fail, try to get vehicles directly and combine with any existing fare data
    const vehiclesResponse = await fetch(`${apiBaseUrl}/api/admin/get-vehicles.php?includeInactive=true&force_sync=true&force_refresh=true&isAdminMode=true&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!vehiclesResponse.ok) {
      console.warn(`Vehicles fetch failed with status: ${vehiclesResponse.status}`);
      return {};
    }
    
    const vehiclesResponseText = await vehiclesResponse.text();
    let vehiclesResult;
    
    try {
      vehiclesResult = JSON.parse(vehiclesResponseText);
    } catch (e) {
      console.error('Failed to parse vehicles response as JSON:', vehiclesResponseText);
      return {};
    }
    
    if (vehiclesResult && vehiclesResult.vehicles && vehiclesResult.vehicles.length > 0) {
      console.log(`Retrieved ${vehiclesResult.vehicles.length} vehicles with outstation fare data`);
      
      const faresMap: Record<string, any> = {};
      vehiclesResult.vehicles.forEach((vehicle: any) => {
        if (vehicle.vehicle_id || vehicle.id) {
          const id = vehicle.vehicle_id || vehicle.id;
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
    // First try the new direct-local-fares endpoint
    const response = await fetch(`${apiBaseUrl}/api/admin/direct-local-fares.php?includeInactive=true&isAdminMode=true&force_refresh=true&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.warn(`Local fares fetch failed with status: ${response.status}`);
      throw new Error(`Failed to fetch local fares: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    let directResult;
    
    try {
      directResult = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid JSON response from server');
    }
    
    if (directResult && directResult.status === 'success' && directResult.fares) {
      console.log(`Retrieved ${Object.keys(directResult.fares).length} local fares from direct endpoint`);
      return directResult.fares;
    }

    // Fallback to the older endpoint
    const fallbackResponse = await fetch(`${apiBaseUrl}/api/admin/local-fares-update.php?sync=true&includeInactive=true&isAdminMode=true&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!fallbackResponse.ok) {
      console.warn(`Fallback local fares fetch failed with status: ${fallbackResponse.status}`);
      return {};
    }
    
    const fallbackResponseText = await fallbackResponse.text();
    let result;
    
    try {
      result = JSON.parse(fallbackResponseText);
    } catch (e) {
      console.error('Failed to parse fallback response as JSON:', fallbackResponseText);
      return {};
    }
    
    if (result && result.status === 'success' && result.fares) {
      console.log(`Retrieved ${Object.keys(result.fares).length} local fares from fallback endpoint`);
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
    const response = await fetch(`${apiBaseUrl}/api/admin/airport-fares-update.php?includeInactive=true&isAdminMode=true&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.warn(`Airport fares fetch failed with status: ${response.status}`);
      return {};
    }
    
    const responseText = await response.text();
    let result;
    
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      return {};
    }
    
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
