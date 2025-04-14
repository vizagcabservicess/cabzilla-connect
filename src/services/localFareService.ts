
import { getApiUrl } from '@/config/api';
import { getBypassHeaders } from '@/config/requestConfig';
import { toast } from 'sonner';
import fareStateManager from './FareStateManager';

export interface LocalFareData {
  vehicleId: string;
  vehicle_id?: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
  [key: string]: any;
}

// Cache local fare data in memory
const localFareCache = new Map<string, { data: LocalFareData, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

/**
 * Fetch local fare for a specific vehicle
 */
export const fetchLocalFare = async (vehicleId: string): Promise<LocalFareData | null> => {
  try {
    console.log(`Fetching local fare for vehicle ${vehicleId}`);
    
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
      
      // Convert to standard format
      const standardizedData: LocalFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        price4hrs40km: parseFloat(fareData.price4hrs40km || fareData.price_4hrs_40km || 0),
        price8hrs80km: parseFloat(fareData.price8hrs80km || fareData.price_8hrs_80km || 0),
        price10hrs100km: parseFloat(fareData.price10hrs100km || fareData.price_10hrs_100km || 0),
        priceExtraKm: parseFloat(fareData.priceExtraKm || fareData.extraKmRate || fareData.price_extra_km || 0),
        priceExtraHour: parseFloat(fareData.priceExtraHour || fareData.extraHourRate || fareData.price_extra_hour || 0)
      };
      
      // Cache the result
      localFareCache.set(vehicleId, {
        data: standardizedData,
        timestamp: Date.now()
      });
      
      return standardizedData;
    }
    
    // If FareStateManager doesn't have the data, try direct API endpoint
    const response = await fetch(
      getApiUrl(`api/direct-local-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
      { headers: getBypassHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
      // Get the first fare in the array
      const fare = data.fares[0];
      
      const fareData: LocalFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        price4hrs40km: parseFloat(fare.price4hrs40km || fare.price_4hrs_40km || 0),
        price8hrs80km: parseFloat(fare.price8hrs80km || fare.price_8hrs_80km || 0),
        price10hrs100km: parseFloat(fare.price10hrs100km || fare.price_10hrs_100km || 0),
        priceExtraKm: parseFloat(fare.priceExtraKm || fare.extraKmRate || fare.price_extra_km || 0),
        priceExtraHour: parseFloat(fare.priceExtraHour || fare.extraHourRate || fare.price_extra_hour || 0)
      };
      
      // Cache the result
      localFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
      return fareData;
    }
    
    throw new Error('No valid fare data found in the response');
  } catch (error) {
    console.error(`Error fetching local fare for ${vehicleId}:`, error);
    return null;
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
      
      toast({
        title: "Success",
        description: "Local fare updated successfully.",
        duration: 3000
      });
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error updating local fare');
    }
  } catch (error) {
    console.error('Error updating local fare:', error);
    
    toast({
      title: "Error",
      description: `Failed to update local fare: ${error instanceof Error ? error.message : 'Unknown error'}`,
      variant: "destructive",
      duration: 3000
    });
    
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
    
    toast({
      title: "Success",
      description: "Local fare tables initialized successfully.",
      duration: 3000
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing local fare tables:', error);
    
    toast({
      title: "Error",
      description: `Failed to initialize local fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
      variant: "destructive",
      duration: 3000
    });
    
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
    
    toast({
      title: "Success",
      description: "Local fare tables synced successfully.",
      duration: 3000
    });
    
    return true;
  } catch (error) {
    console.error('Error syncing local fare tables:', error);
    
    toast({
      title: "Error",
      description: `Failed to sync local fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
      variant: "destructive",
      duration: 3000
    });
    
    return false;
  }
};
