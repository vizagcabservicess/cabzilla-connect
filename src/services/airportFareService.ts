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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

/**
 * Fetch airport fare for a specific vehicle
 */
export const fetchAirportFare = async (vehicleId: string): Promise<AirportFareData | null> => {
  try {
    console.log(`Fetching airport fare for vehicle ${vehicleId}`);
    
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
      
      // Convert to standard format
      const standardizedData: AirportFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        tier1Price: parseFloat(fareData.tier1Price || 0),
        tier2Price: parseFloat(fareData.tier2Price || 0),
        tier3Price: parseFloat(fareData.tier3Price || 0),
        tier4Price: parseFloat(fareData.tier4Price || 0),
        extraKmCharge: parseFloat(fareData.extraKmCharge || 0)
      };
      
      // Cache the result
      airportFareCache.set(vehicleId, {
        data: standardizedData,
        timestamp: Date.now()
      });
      
      return standardizedData;
    }
    
    // If FareStateManager doesn't have the data, try direct API endpoint
    const response = await fetch(
      getApiUrl(`api/direct-airport-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
      { headers: getBypassHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
      // Get the first fare in the array
      const fare = data.fares[0];
      
      const fareData: AirportFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        tier1Price: parseFloat(fare.tier1Price || 0),
        tier2Price: parseFloat(fare.tier2Price || 0),
        tier3Price: parseFloat(fare.tier3Price || 0),
        tier4Price: parseFloat(fare.tier4Price || 0),
        extraKmCharge: parseFloat(fare.extraKmCharge || 0)
      };
      
      // Cache the result
      airportFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
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
      
      toast({
        description: "Airport fare updated successfully.",
        duration: 3000
      });
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error updating airport fare');
    }
  } catch (error) {
    console.error('Error updating airport fare:', error);
    
    toast({
      variant: "destructive",
      description: `Failed to update airport fare: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 3000
    });
    
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
    
    toast({
      description: "Airport fare tables initialized successfully.",
      duration: 3000
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing airport fare tables:', error);
    
    toast({
      variant: "destructive",
      description: `Failed to initialize airport fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 3000
    });
    
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
    
    toast({
      description: "Airport fare tables synced successfully.",
      duration: 3000
    });
    
    return true;
  } catch (error) {
    console.error('Error syncing airport fare tables:', error);
    
    toast({
      variant: "destructive",
      description: `Failed to sync airport fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 3000
    });
    
    return false;
  }
};
