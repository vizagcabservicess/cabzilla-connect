
// Add required imports at the top
import fareStateManager from './FareStateManager';

// Add missing method if not present in FareStateManager
if (!fareStateManager.storeLocalFare) {
  fareStateManager.storeLocalFare = async (vehicleId: string, fareData: any) => {
    console.log('FareStateManager.storeLocalFare polyfill called', vehicleId, fareData);
    // Try to update internal cache if possible
    try {
      if (typeof fareStateManager.updateInternalCache === 'function') {
        fareStateManager.updateInternalCache('local', vehicleId, fareData);
      }
      return true;
    } catch (e) {
      console.error('Failed to update internal cache:', e);
      return false;
    }
  };
}

// Cache local fare data in memory
const localFareCache = new Map<string, { data: LocalFareData, timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache duration (reduced from 5 minutes)

// Helper function to normalize hourly package format
export const normalizeHourlyPackage = (packageStr: string): string => {
  // Convert various package formats to a standardized format
  if (!packageStr) return '';
  
  // Strip spaces and convert to lowercase
  const normalized = packageStr.toLowerCase().replace(/\s+/g, '');
  
  // Map common variations to standardized formats
  if (normalized.includes('4hr') || normalized.includes('4hrs') || normalized.includes('4h40') || normalized.includes('4hr40km')) {
    return '4hr40km';
  } else if (normalized.includes('8hr') || normalized.includes('8hrs') || normalized.includes('8h80') || normalized.includes('8hr80km')) {
    return '8hr80km';
  } else if (normalized.includes('10hr') || normalized.includes('10hrs') || normalized.includes('10h100') || normalized.includes('10hr100km')) {
    return '10hr100km';
  }
  
  // Return as-is if not matching any patterns
  return packageStr;
};

/**
 * Fetch local fare for a specific vehicle
 */
export const fetchLocalFare = async (vehicleId: string): Promise<LocalFareData | null> => {
  try {
    console.log(`Fetching local fare for vehicle ${vehicleId}`);
    
    if (!vehicleId) {
      console.error('Vehicle ID is required for fetchLocalFare');
      return null;
    }
    
    // Check cache first
    const cachedFare = localFareCache.get(vehicleId);
    if (cachedFare && Date.now() - cachedFare.timestamp < CACHE_DURATION) {
      console.log(`Using cached local fare for ${vehicleId}`);
      return cachedFare.data;
    }
    
    // Try to get from FareStateManager first (which connects to the database)
    const fareData = await fareStateManager.getLocalFareForVehicle(vehicleId);
    
    if (fareData) {
      console.log(`Retrieved local fare from FareStateManager for ${vehicleId}`, fareData);
      
      // Convert to standard format with all possible field mappings
      const standardizedData: LocalFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        price4hrs40km: parseFloat(fareData.price4hrs40km || fareData.price_4hrs_40km || fareData.local_package_4hr || 0),
        price8hrs80km: parseFloat(fareData.price8hrs80km || fareData.price_8hrs_80km || fareData.local_package_8hr || 0),
        price10hrs100km: parseFloat(fareData.price10hrs100km || fareData.price_10hrs_100km || fareData.local_package_10hr || 0),
        priceExtraKm: parseFloat(fareData.priceExtraKm || fareData.extraKmRate || fareData.price_extra_km || fareData.extra_km_charge || 0),
        priceExtraHour: parseFloat(fareData.priceExtraHour || fareData.extraHourRate || fareData.price_extra_hour || fareData.extra_hour_charge || 0)
      };
      
      // Validate the fare data
      if (standardizedData.price4hrs40km <= 0 || 
          standardizedData.price8hrs80km <= 0 || 
          standardizedData.price10hrs100km <= 0) {
        console.warn(`Retrieved local fare has invalid values for vehicle ${vehicleId}`, standardizedData);
      } else {
        // Cache the valid result
        localFareCache.set(vehicleId, {
          data: standardizedData,
          timestamp: Date.now()
        });
        
        return standardizedData;
      }
    }
    
    // If FareStateManager doesn't have valid data, try direct API endpoint
    const response = await fetch(
      getApiUrl(`api/direct-local-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
      { headers: getBypassHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
      // Find the fare for our specific vehicle id
      const fareItem = data.fares.find((fare: any) => 
        fare.vehicleId === vehicleId || 
        fare.vehicle_id === vehicleId
      );
      
      if (!fareItem) {
        console.error(`No fare found for vehicle ${vehicleId} in API response`);
        return null;
      }
      
      // Map from all possible field names
      const fareData: LocalFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        price4hrs40km: parseFloat(fareItem.price4hrs40km || fareItem.price_4hrs_40km || fareItem.local_package_4hr || fareItem.package4hr40km || 0),
        price8hrs80km: parseFloat(fareItem.price8hrs80km || fareItem.price_8hrs_80km || fareItem.local_package_8hr || fareItem.package8hr80km || 0),
        price10hrs100km: parseFloat(fareItem.price10hrs100km || fareItem.price_10hrs_100km || fareItem.local_package_10hr || fareItem.package10hr100km || 0),
        priceExtraKm: parseFloat(fareItem.priceExtraKm || fareItem.extraKmRate || fareItem.price_extra_km || fareItem.extra_km_charge || 0),
        priceExtraHour: parseFloat(fareItem.priceExtraHour || fareItem.extraHourRate || fareItem.price_extra_hour || fareItem.extra_hour_charge || 0)
      };
      
      // Validate the fare data before caching
      if (fareData.price4hrs40km <= 0 || 
          fareData.price8hrs80km <= 0 || 
          fareData.price10hrs100km <= 0) {
        console.warn(`Direct API returned invalid local fare for vehicle ${vehicleId}`, fareData);
        return null;
      }
      
      // Cache the valid result
      localFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
      // Initialize FareStateManager data with the fetched fare
      fareStateManager.storeLocalFare(vehicleId, fareData);
      
      return fareData;
    }
    
    throw new Error('No valid fare data found in the response');
  } catch (error) {
    console.error(`Error fetching local fare for ${vehicleId}:`, error);
    return null;
  }
};

// Helper function to map hourly package to the corresponding price
export const getLocalPackagePrice = (fareData: LocalFareData, hourlyPackage: string): number => {
  const normalizedPackage = normalizeHourlyPackage(hourlyPackage);
  
  console.log(`Getting local price for package ${hourlyPackage} (normalized: ${normalizedPackage})`);
  
  switch (normalizedPackage) {
    case '4hr40km':
    case '4hrs40km':
      return fareData.price4hrs40km;
    case '8hr80km':
    case '8hrs80km':
      return fareData.price8hrs80km;
    case '10hr100km':
    case '10hrs100km':
      return fareData.price10hrs100km;
    default:
      console.error(`Unsupported package type: ${hourlyPackage}`);
      // Try to find a match based on the package string
      if (hourlyPackage.includes('4') && (hourlyPackage.includes('hr') || hourlyPackage.includes('h'))) {
        return fareData.price4hrs40km;
      } else if (hourlyPackage.includes('8') && (hourlyPackage.includes('hr') || hourlyPackage.includes('h'))) {
        return fareData.price8hrs80km;
      } else if (hourlyPackage.includes('10') && (hourlyPackage.includes('hr') || hourlyPackage.includes('h'))) {
        return fareData.price10hrs100km;
      }
      return 0;
  }
};

/**
 * Update local fare for a vehicle
 */
export const updateLocalFare = async (fareData: LocalFareData): Promise<boolean> => {
  try {
    console.log(`Updating local fare for vehicle ${fareData.vehicleId}`, fareData);
    
    // Ensure vehicle ID is properly set
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Create FormData for the request
    const formData = new FormData();
    formData.append('vehicle_id', fareData.vehicleId);
    formData.append('price4hrs40km', fareData.price4hrs40km.toString());
    formData.append('price_4hrs_40km', fareData.price4hrs40km.toString());
    formData.append('price8hrs80km', fareData.price8hrs80km.toString());
    formData.append('price_8hrs_80km', fareData.price8hrs80km.toString());
    formData.append('price10hrs100km', fareData.price10hrs100km.toString());
    formData.append('price_10hrs_100km', fareData.price10hrs100km.toString());
    formData.append('priceExtraKm', fareData.priceExtraKm.toString());
    formData.append('price_extra_km', fareData.priceExtraKm.toString());
    formData.append('priceExtraHour', fareData.priceExtraHour.toString());
    formData.append('price_extra_hour', fareData.priceExtraHour.toString());
    
    const response = await fetch(getApiUrl('api/admin/direct-local-fares.php'), {
      method: 'POST',
      body: formData,
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Local fare update successful:', result);
      
      // Clear caches to ensure fresh data is fetched
      localFareCache.delete(fareData.vehicleId);
      fareStateManager.clearCache();
      
      // Sync fare data with the database
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after local fare update');
        });
      }, 1000);
      
      toast("Local fare updated successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error updating local fare');
    }
  } catch (error) {
    console.error('Error updating local fare:', error);
    
    toast(`Failed to update local fare: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

/**
 * Initialize local fare tables in the database
 */
export const initializeLocalFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/local-fares.php?init=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('Local fare tables initialization result:', result);
    
    // Clear caches to ensure fresh data is fetched
    localFareCache.clear();
    fareStateManager.clearCache();
    
    // Sync fare data with the database
    setTimeout(() => {
      fareStateManager.syncFareData().then(() => {
        console.log('Fare data synced after table initialization');
      });
    }, 1000);
    
    toast("Local fare tables initialized successfully.");
    
    return true;
  } catch (error) {
    console.error('Error initializing local fare tables:', error);
    
    toast(`Failed to initialize local fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

/**
 * Sync local fare tables from the database
 */
export const syncLocalFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/local-fares.php?sync=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('Local fare tables sync result:', result);
    
    // Clear caches to ensure fresh data is fetched
    localFareCache.clear();
    fareStateManager.clearCache();
    
    // Sync fare data with the database
    setTimeout(() => {
      fareStateManager.syncFareData().then(() => {
        console.log('Fare data synced after table sync');
      });
    }, 1000);
    
    toast("Local fare tables synced successfully.");
    
    return true;
  } catch (error) {
    console.error('Error syncing local fare tables:', error);
    
    toast(`Failed to sync local fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};
