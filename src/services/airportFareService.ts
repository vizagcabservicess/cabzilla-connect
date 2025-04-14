
import { getApiUrl } from '@/config/api';
import { getBypassHeaders } from '@/config/requestConfig';
import { toast } from 'sonner';
import fareStateManager from './FareStateManager';

export interface AirportFareData {
  vehicleId: string;
  vehicle_id?: string;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  [key: string]: any;
}

// Cache airport fare data in memory
const airportFareCache = new Map<string, { data: AirportFareData, timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache duration (reduced from 5 minutes)

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
    
    if (fareData && fareData.tier1Price && parseFloat(fareData.tier1Price) > 0) {
      console.log(`Retrieved airport fare from FareStateManager for ${vehicleId}`, fareData);
      
      // Convert to standard format with validation
      const standardizedData: AirportFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        tier1Price: parseFloat(fareData.tier1Price || 0),
        tier2Price: parseFloat(fareData.tier2Price || 0),
        tier3Price: parseFloat(fareData.tier3Price || 0),
        tier4Price: parseFloat(fareData.tier4Price || 0),
        extraKmCharge: parseFloat(fareData.extraKmCharge || 0)
      };
      
      // Verify we have valid numeric values
      if (standardizedData.tier1Price <= 0 || 
          standardizedData.tier2Price <= 0 || 
          standardizedData.tier3Price <= 0 || 
          standardizedData.tier4Price <= 0) {
        console.warn(`Retrieved airport fare has invalid values for vehicle ${vehicleId}`, standardizedData);
      } else {
        // Cache the result only if it has valid values
        airportFareCache.set(vehicleId, {
          data: standardizedData,
          timestamp: Date.now()
        });
        
        return standardizedData;
      }
    }
    
    // If FareStateManager doesn't have valid data, try direct API endpoint
    const response = await fetch(
      getApiUrl(`api/direct-airport-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
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
      
      const fareData: AirportFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        tier1Price: parseFloat(fareItem.tier1Price || 0),
        tier2Price: parseFloat(fareItem.tier2Price || 0),
        tier3Price: parseFloat(fareItem.tier3Price || 0),
        tier4Price: parseFloat(fareItem.tier4Price || 0),
        extraKmCharge: parseFloat(fareItem.extraKmCharge || 0)
      };
      
      // Validate the fare data before caching
      if (fareData.tier1Price <= 0 || 
          fareData.tier2Price <= 0 || 
          fareData.tier3Price <= 0 || 
          fareData.tier4Price <= 0) {
        console.warn(`Direct API returned invalid airport fare for vehicle ${vehicleId}`, fareData);
        return null;
      }
      
      // Cache the valid result
      airportFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
      // Initialize FareStateManager data with the fetched fare
      fareStateManager.storeAirportFare(vehicleId, fareData);
      
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
    formData.append('tier1Price', fareData.tier1Price.toString());
    formData.append('tier2Price', fareData.tier2Price.toString());
    formData.append('tier3Price', fareData.tier3Price.toString());
    formData.append('tier4Price', fareData.tier4Price.toString());
    formData.append('extraKmCharge', fareData.extraKmCharge.toString());
    
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
    const response = await fetch(getApiUrl('api/direct-airport-fares.php?init=true&_t=' + Date.now()), {
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
    const response = await fetch(getApiUrl('api/direct-airport-fares.php?sync=true&_t=' + Date.now()), {
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
