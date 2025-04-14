
import { toast } from 'sonner';
import fareStateManager from './FareStateManager';
import { getApiUrl, getBypassHeaders } from '@/config/requestConfig';
import { AirportFareData } from '@/types/cab';

// Cache airport fare data in memory
const airportFareCache = new Map<string, { data: AirportFareData, timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache duration

/**
 * Fetch airport fare for a specific vehicle
 */
export const fetchAirportFare = async (vehicleId: string): Promise<AirportFareData | null> => {
  try {
    console.log(`Fetching airport fare for vehicle ${vehicleId}`);
    
    if (!vehicleId) {
      console.error('Vehicle ID is required for fetchAirportFare');
      return null;
    }
    
    // Check cache first
    const cachedFare = airportFareCache.get(vehicleId);
    if (cachedFare && Date.now() - cachedFare.timestamp < CACHE_DURATION) {
      console.log(`Using cached airport fare for ${vehicleId}`);
      return cachedFare.data;
    }
    
    // Try to get from FareStateManager first (which connects to the database)
    const fareData = await fareStateManager.getAirportFareForVehicle(vehicleId);
    
    if (fareData) {
      console.log(`Retrieved airport fare from FareStateManager for ${vehicleId}`, fareData);
      
      // Convert to standard format with all possible field mappings
      const standardizedData: AirportFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        basePrice: parseFloat(String(fareData.basePrice || 0)),
        pricePerKm: parseFloat(String(fareData.pricePerKm || 0)),
        pickupPrice: parseFloat(String(fareData.pickupPrice || 0)),
        dropPrice: parseFloat(String(fareData.dropPrice || 0)),
        tier1Price: parseFloat(String(fareData.tier1Price || 0)),
        tier2Price: parseFloat(String(fareData.tier2Price || 0)),
        tier3Price: parseFloat(String(fareData.tier3Price || 0)),
        tier4Price: parseFloat(String(fareData.tier4Price || 0)),
        extraKmCharge: parseFloat(String(fareData.extraKmCharge || 0))
      };
      
      // Cache the valid result
      airportFareCache.set(vehicleId, {
        data: standardizedData,
        timestamp: Date.now()
      });
      
      return standardizedData;
    }
    
    // If FareStateManager doesn't have valid data, try direct API endpoint
    const response = await fetch(
      getApiUrl(`api/admin/direct-airport-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
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
      
      // Create and initialize a default AirportFareData object
      const fareData: AirportFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        basePrice: parseFloat(String(fareItem.basePrice || 0)),
        pricePerKm: parseFloat(String(fareItem.pricePerKm || 0)),
        pickupPrice: parseFloat(String(fareItem.pickupPrice || 0)),
        dropPrice: parseFloat(String(fareItem.dropPrice || 0)),
        tier1Price: parseFloat(String(fareItem.tier1Price || 0)),
        tier2Price: parseFloat(String(fareItem.tier2Price || 0)),
        tier3Price: parseFloat(String(fareItem.tier3Price || 0)),
        tier4Price: parseFloat(String(fareItem.tier4Price || 0)),
        extraKmCharge: parseFloat(String(fareItem.extraKmCharge || 0))
      };
      
      // Cache the result
      airportFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
      // Initialize FareStateManager data with the fetched fare
      if (typeof fareStateManager.storeAirportFare === 'function') {
        fareStateManager.storeAirportFare(vehicleId, fareData);
      } else {
        console.warn('FareStateManager.storeAirportFare is not available');
      }
      
      return fareData;
    }
    
    throw new Error('No valid fare data found in the response');
  } catch (error) {
    console.error(`Error fetching airport fare for ${vehicleId}:`, error);
    return null;
  }
};

/**
 * Update airport fare for a vehicle
 */
export const updateAirportFare = async (fareData: AirportFareData): Promise<boolean> => {
  try {
    console.log(`Updating airport fare for vehicle ${fareData.vehicleId}`, fareData);
    
    // Ensure vehicle ID is properly set
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Create FormData for the request
    const formData = new FormData();
    formData.append('vehicle_id', fareData.vehicleId);
    formData.append('basePrice', String(fareData.basePrice));
    formData.append('pricePerKm', String(fareData.pricePerKm));
    formData.append('pickupPrice', String(fareData.pickupPrice));
    formData.append('dropPrice', String(fareData.dropPrice));
    formData.append('tier1Price', String(fareData.tier1Price));
    formData.append('tier2Price', String(fareData.tier2Price));
    formData.append('tier3Price', String(fareData.tier3Price));
    formData.append('tier4Price', String(fareData.tier4Price));
    formData.append('extraKmCharge', String(fareData.extraKmCharge));
    
    const response = await fetch(getApiUrl('api/admin/direct-airport-fares.php'), {
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
      console.log('Airport fare update successful:', result);
      
      // Clear caches to ensure fresh data is fetched
      airportFareCache.delete(fareData.vehicleId);
      fareStateManager.clearCache();
      
      // Sync fare data with the database
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after airport fare update');
        });
      }, 1000);
      
      toast("Airport fare updated successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error updating airport fare');
    }
  } catch (error) {
    console.error('Error updating airport fare:', error);
    
    toast(`Failed to update airport fare: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

/**
 * Initialize airport fare tables in the database
 */
export const initializeAirportFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/admin/airport-fares.php?init=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('Airport fare tables initialization result:', result);
    
    // Clear caches to ensure fresh data is fetched
    airportFareCache.clear();
    fareStateManager.clearCache();
    
    // Sync fare data with the database
    setTimeout(() => {
      fareStateManager.syncFareData().then(() => {
        console.log('Fare data synced after table initialization');
      });
    }, 1000);
    
    toast("Airport fare tables initialized successfully.");
    
    return true;
  } catch (error) {
    console.error('Error initializing airport fare tables:', error);
    
    toast(`Failed to initialize airport fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

/**
 * Sync airport fare tables from the database
 */
export const syncAirportFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/admin/airport-fares.php?sync=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('Airport fare tables sync result:', result);
    
    // Clear caches to ensure fresh data is fetched
    airportFareCache.clear();
    fareStateManager.clearCache();
    
    // Sync fare data with the database
    setTimeout(() => {
      fareStateManager.syncFareData().then(() => {
        console.log('Fare data synced after table sync');
      });
    }, 1000);
    
    toast("Airport fare tables synced successfully.");
    
    return true;
  } catch (error) {
    console.error('Error syncing airport fare tables:', error);
    
    toast(`Failed to sync airport fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};
