
// Add required imports at the top of the file
import fareStateManager from './FareStateManager';

// Add missing method if not present in FareStateManager
if (!fareStateManager.storeOutstationFare) {
  fareStateManager.storeOutstationFare = async (vehicleId: string, fareData: any) => {
    console.log('FareStateManager.storeOutstationFare polyfill called', vehicleId, fareData);
    // Try to update internal cache if possible
    try {
      if (typeof fareStateManager.updateInternalCache === 'function') {
        fareStateManager.updateInternalCache('outstation', vehicleId, fareData);
      }
      return true;
    } catch (e) {
      console.error('Failed to update internal cache:', e);
      return false;
    }
  };
}

// Cache outstation fare data in memory
const outstationFareCache = new Map<string, { data: OutstationFareData, timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache duration (reduced from 5 minutes)

/**
 * Fetch outstation fare for a specific vehicle
 */
export const fetchOutstationFare = async (vehicleId: string): Promise<OutstationFareData | null> => {
  try {
    console.log(`Fetching outstation fare for vehicle ${vehicleId}`);
    
    if (!vehicleId) {
      console.error('Vehicle ID is required for fetchOutstationFare');
      return null;
    }
    
    // Check cache first
    const cachedFare = outstationFareCache.get(vehicleId);
    if (cachedFare && Date.now() - cachedFare.timestamp < CACHE_DURATION) {
      console.log(`Using cached outstation fare for ${vehicleId}`);
      return cachedFare.data;
    }
    
    // Try to get from FareStateManager first (which connects to the database)
    const fareData = await fareStateManager.getOutstationFareForVehicle(vehicleId);
    
    if (fareData) {
      console.log(`Retrieved outstation fare from FareStateManager for ${vehicleId}`, fareData);
      
      // Convert to standard format with all possible field mappings
      const standardizedData: OutstationFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        oneWayBasePrice: parseFloat(fareData.basePrice || fareData.oneWayBasePrice || fareData.one_way_base_price || 0),
        oneWayPricePerKm: parseFloat(fareData.pricePerKm || fareData.oneWayPricePerKm || fareData.one_way_price_per_km || 0),
        roundTripBasePrice: parseFloat(fareData.roundTripBasePrice || fareData.round_trip_base_price || 0),
        roundTripPricePerKm: parseFloat(fareData.roundTripPricePerKm || fareData.round_trip_price_per_km || 0),
        driverAllowance: parseFloat(fareData.driverAllowance || fareData.driver_allowance || 250),
        nightHaltCharge: parseFloat(fareData.nightHaltCharge || fareData.night_halt_charge || 700)
      };
      
      // Validate the fare data
      if (standardizedData.oneWayBasePrice <= 0 || 
          standardizedData.oneWayPricePerKm <= 0 || 
          standardizedData.roundTripBasePrice <= 0 || 
          standardizedData.roundTripPricePerKm <= 0) {
        console.warn(`Retrieved outstation fare has invalid values for vehicle ${vehicleId}`, standardizedData);
      } else {
        // Cache the valid result
        outstationFareCache.set(vehicleId, {
          data: standardizedData,
          timestamp: Date.now()
        });
        
        return standardizedData;
      }
    }
    
    // If FareStateManager doesn't have valid data, try direct API endpoint
    const response = await fetch(
      getApiUrl(`api/admin/direct-outstation-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
      { headers: getBypassHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fares) {
      // Extract fare - API returns either an object with vehicle IDs as keys or a direct fare object
      let fareItem;
      
      if (data.fares[vehicleId]) {
        // Vehicle ID is a key in the fares object
        fareItem = data.fares[vehicleId];
      } else if (Array.isArray(data.fares) && data.fares.length > 0) {
        // Find the fare for our specific vehicle id in an array
        fareItem = data.fares.find((fare: any) => 
          fare.vehicleId === vehicleId || 
          fare.vehicle_id === vehicleId
        );
      } else if (Object.keys(data.fares).length > 0) {
        // If array check fails but we have data, use the first item (last resort)
        const keys = Object.keys(data.fares);
        fareItem = data.fares[keys[0]];
        console.warn(`Could not find exact fare match for ${vehicleId}, using ${keys[0]} as fallback`);
      }
      
      if (!fareItem) {
        console.error(`No fare found for vehicle ${vehicleId} in API response`);
        return null;
      }
      
      // Map from all possible field names
      const fareData: OutstationFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        oneWayBasePrice: parseFloat(fareItem.basePrice || fareItem.oneWayBasePrice || fareItem.one_way_base_price || 0),
        oneWayPricePerKm: parseFloat(fareItem.pricePerKm || fareItem.oneWayPricePerKm || fareItem.one_way_price_per_km || 0),
        roundTripBasePrice: parseFloat(fareItem.roundTripBasePrice || fareItem.round_trip_base_price || 0),
        roundTripPricePerKm: parseFloat(fareItem.roundTripPricePerKm || fareItem.round_trip_price_per_km || 0),
        driverAllowance: parseFloat(fareItem.driverAllowance || fareItem.driver_allowance || 250),
        nightHaltCharge: parseFloat(fareItem.nightHaltCharge || fareItem.night_halt_charge || 700)
      };
      
      // If round trip values are missing but one way values exist, calculate them (as a fallback only)
      if (fareData.roundTripBasePrice <= 0 && fareData.oneWayBasePrice > 0) {
        fareData.roundTripBasePrice = fareData.oneWayBasePrice * 0.95; // 5% discount
      }
      
      if (fareData.roundTripPricePerKm <= 0 && fareData.oneWayPricePerKm > 0) {
        fareData.roundTripPricePerKm = fareData.oneWayPricePerKm * 0.85; // 15% discount
      }
      
      // Validate the fare data before caching
      if (fareData.oneWayBasePrice <= 0 || 
          fareData.oneWayPricePerKm <= 0 || 
          fareData.roundTripBasePrice <= 0 || 
          fareData.roundTripPricePerKm <= 0) {
        console.warn(`Direct API returned invalid outstation fare for vehicle ${vehicleId}`, fareData);
        return null;
      }
      
      // Cache the valid result
      outstationFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
      // Initialize FareStateManager data with the fetched fare
      fareStateManager.storeOutstationFare(vehicleId, fareData);
      
      return fareData;
    }
    
    throw new Error('No valid fare data found in the response');
  } catch (error) {
    console.error(`Error fetching outstation fare for ${vehicleId}:`, error);
    return null;
  }
};

/**
 * Update outstation fare for a vehicle
 */
export const updateOutstationFare = async (fareData: OutstationFareData): Promise<boolean> => {
  try {
    console.log(`Updating outstation fare for vehicle ${fareData.vehicleId}`, fareData);
    
    // Ensure vehicle ID is properly set
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Create FormData for the request
    const formData = new FormData();
    formData.append('vehicle_id', fareData.vehicleId);
    formData.append('basePrice', fareData.oneWayBasePrice.toString());
    formData.append('pricePerKm', fareData.oneWayPricePerKm.toString());
    formData.append('roundTripBasePrice', fareData.roundTripBasePrice.toString());
    formData.append('roundTripPricePerKm', fareData.roundTripPricePerKm.toString());
    formData.append('driverAllowance', fareData.driverAllowance.toString());
    formData.append('nightHaltCharge', fareData.nightHaltCharge.toString());
    
    // Add duplicate fields for compatibility with different backend formats
    formData.append('oneWayBasePrice', fareData.oneWayBasePrice.toString());
    formData.append('oneWayPricePerKm', fareData.oneWayPricePerKm.toString());
    
    const response = await fetch(getApiUrl('api/admin/direct-outstation-fares.php'), {
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
      console.log('Outstation fare update successful:', result);
      
      // Clear caches to ensure fresh data is fetched
      outstationFareCache.delete(fareData.vehicleId);
      fareStateManager.clearCache();
      
      // Sync fare data with the database
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after outstation fare update');
        });
      }, 1000);
      
      toast("Outstation fare updated successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error updating outstation fare');
    }
  } catch (error) {
    console.error('Error updating outstation fare:', error);
    
    toast(`Failed to update outstation fare: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

/**
 * Initialize outstation fare tables in the database
 */
export const initializeOutstationFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/admin/outstation-fares.php?init=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Outstation fare tables initialized:', result);
      
      // Clear caches to ensure fresh data is fetched
      outstationFareCache.clear();
      fareStateManager.clearCache();
      
      // Sync fare data with the database
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after table initialization');
        });
      }, 1000);
      
      toast("Outstation fare tables initialized successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error initializing outstation fare tables');
    }
  } catch (error) {
    console.error('Error initializing outstation fare tables:', error);
    
    toast(`Failed to initialize outstation fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

/**
 * Sync outstation fare tables from the database
 */
export const syncOutstationFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/admin/outstation-fares.php?sync=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Outstation fare tables synced:', result);
      
      // Clear caches to ensure fresh data is fetched
      outstationFareCache.clear();
      fareStateManager.clearCache();
      
      // Sync fare data with the database
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after table sync');
        });
      }, 1000);
      
      toast("Outstation fare tables synced successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error syncing outstation fare tables');
    }
  } catch (error) {
    console.error('Error syncing outstation fare tables:', error);
    
    toast(`Failed to sync outstation fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};
