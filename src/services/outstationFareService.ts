
import { getApiUrl } from '@/config/api';
import { getBypassHeaders } from '@/config/requestConfig';
import { toast } from 'sonner';
import fareStateManager from './FareStateManager';

export interface OutstationFareData {
  vehicleId: string;
  vehicle_id?: string;
  oneWayBasePrice: number;
  oneWayPricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  [key: string]: any;
}

// Cache outstation fare data in memory
const outstationFareCache = new Map<string, { data: OutstationFareData, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

/**
 * Fetch outstation fare for a specific vehicle
 */
export const fetchOutstationFare = async (vehicleId: string): Promise<OutstationFareData | null> => {
  try {
    console.log(`Fetching outstation fare for vehicle ${vehicleId}`);
    
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
      
      // Convert to standard format
      const standardizedData: OutstationFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        oneWayBasePrice: parseFloat(fareData.basePrice || fareData.oneWayBasePrice || 0),
        oneWayPricePerKm: parseFloat(fareData.pricePerKm || fareData.oneWayPricePerKm || 0),
        roundTripBasePrice: parseFloat(fareData.roundTripBasePrice || 0),
        roundTripPricePerKm: parseFloat(fareData.roundTripPricePerKm || 0),
        driverAllowance: parseFloat(fareData.driverAllowance || 250),
        nightHaltCharge: parseFloat(fareData.nightHaltCharge || 700)
      };
      
      // Cache the result
      outstationFareCache.set(vehicleId, {
        data: standardizedData,
        timestamp: Date.now()
      });
      
      return standardizedData;
    }
    
    // If FareStateManager doesn't have the data, try direct API endpoint
    const response = await fetch(
      getApiUrl(`api/admin/direct-outstation-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
      { headers: getBypassHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fares && (data.fares[vehicleId] || Object.values(data.fares).length > 0)) {
      // Either get specific vehicle fare or the first one in the response
      const fare = data.fares[vehicleId] || Object.values(data.fares)[0];
      
      const fareData: OutstationFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        oneWayBasePrice: parseFloat(fare.basePrice || fare.oneWayBasePrice || 0),
        oneWayPricePerKm: parseFloat(fare.pricePerKm || fare.oneWayPricePerKm || 0),
        roundTripBasePrice: parseFloat(fare.roundTripBasePrice || 0),
        roundTripPricePerKm: parseFloat(fare.roundTripPricePerKm || 0),
        driverAllowance: parseFloat(fare.driverAllowance || 250),
        nightHaltCharge: parseFloat(fare.nightHaltCharge || 700)
      };
      
      // Cache the result
      outstationFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
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
