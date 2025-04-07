
/**
 * Fare Management Service
 * Handles all interactions with the fare management APIs
 */

import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';

// Local fare types
export interface LocalFareData {
  vehicleId?: string;
  vehicle_id?: string;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  extraKmCharge?: number; // Alternate field name
  [key: string]: any;
}

// Airport fare types
export interface AirportFareData {
  vehicleId?: string;
  vehicle_id?: string;
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  [key: string]: any;
}

// Generic fare data type for backwards compatibility
export type FareData = LocalFareData | AirportFareData;

/**
 * Initialize database tables
 * Creates all required tables for fare management
 */
export const initializeDatabaseTables = async (): Promise<boolean> => {
  try {
    console.log("Initializing database tables...");
    
    // First try the dedicated airport fares initialization
    const response = await directVehicleOperation(
      'api/admin/initialize-airport-fares.php', 
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      }
    );
    
    if (response?.status === 'success') {
      console.log("Successfully initialized database tables:", response);
      return true;
    } 
    
    // Fallback to general DB setup
    const fallbackResponse = await directVehicleOperation(
      'api/admin/db_setup.php', 
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      }
    );
    
    console.log("Fallback initialization response:", fallbackResponse);
    return true;
  } catch (error) {
    console.error("Error initializing database tables:", error);
    return false;
  }
};

/**
 * Fetch local fares for a vehicle
 */
export const fetchLocalFares = async (vehicleId: string): Promise<LocalFareData[]> => {
  try {
    console.log(`Fetching local fares for vehicle: ${vehicleId}`);
    
    const response = await directVehicleOperation(
      `api/admin/direct-local-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`,
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      }
    );
    
    if (response?.status === 'success' && response?.data?.fares) {
      return response.data.fares;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching local fares: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

/**
 * Fetch airport fares for a vehicle
 */
export const fetchAirportFares = async (vehicleId: string): Promise<AirportFareData[]> => {
  try {
    console.log(`Fetching airport fares for vehicle: ${vehicleId}`);
    
    // Use multiple options to maximize chance of success
    const endpoints = [
      `api/admin/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`,
      `api/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`
    ];
    
    let response;
    let success = false;
    
    // Try endpoints in sequence
    for (const endpoint of endpoints) {
      try {
        response = await directVehicleOperation(
          endpoint,
          'GET',
          {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache'
            }
          }
        );
        
        if (response?.status === 'success' && response?.data?.fares) {
          success = true;
          break;
        }
      } catch (endpointError) {
        console.warn(`Error with endpoint ${endpoint}:`, endpointError);
        // Continue to next endpoint
      }
    }
    
    if (success && response?.data?.fares) {
      return response.data.fares;
    }
    
    // If still no success, try syncing and then fetching again
    await syncAirportFares();
    
    response = await directVehicleOperation(
      `api/admin/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`,
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      }
    );
    
    if (response?.status === 'success' && response?.data?.fares) {
      return response.data.fares;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching airport fares: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

/**
 * Update local fares for a vehicle
 */
export const updateLocalFares = async (fareData: LocalFareData): Promise<boolean> => {
  try {
    console.log(`Updating local fares for vehicle: ${fareData.vehicleId}`, fareData);
    
    const response = await directVehicleOperation(
      'api/admin/local-fares-update.php',
      'POST',
      {
        data: fareData,
        headers: {
          'X-Admin-Mode': 'true',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response?.status === 'success') {
      // Dispatch event to notify other components of the update
      window.dispatchEvent(new CustomEvent('fare-data-updated', { 
        detail: { 
          fareType: 'local',
          vehicleId: fareData.vehicleId
        } 
      }));
      
      return true;
    }
    
    throw new Error(response?.message || 'Failed to update local fares');
  } catch (error) {
    console.error(`Error updating local fares: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

/**
 * Update airport fares for a vehicle
 */
export const updateAirportFares = async (fareData: AirportFareData): Promise<boolean> => {
  try {
    console.log(`Updating airport fares for vehicle: ${fareData.vehicleId}`, fareData);
    
    // Try multiple endpoints to maximize chance of success
    const endpoints = [
      'api/admin/airport-fares-update.php',
      'api/airport-fares-update.php',
      'api/admin/fare-update.php?tripType=airport'
    ];
    
    let success = false;
    let finalResponse;
    
    // Try each endpoint in sequence until one succeeds
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to update airport fares using endpoint: ${endpoint}`);
        
        const requestData = {
          ...fareData,
          // Add both formats of vehicle ID to ensure one works
          vehicleId: fareData.vehicleId,
          vehicle_id: fareData.vehicleId,
          tripType: 'airport',
          trip_type: 'airport'
        };
        
        const response = await directVehicleOperation(
          endpoint,
          'POST',
          {
            data: requestData,
            headers: {
              'X-Admin-Mode': 'true',
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`Response from ${endpoint}:`, response);
        
        if (response?.status === 'success') {
          success = true;
          finalResponse = response;
          break;
        }
      } catch (endpointError) {
        console.warn(`Error with endpoint ${endpoint}:`, endpointError);
        // Continue to next endpoint
      }
    }
    
    if (success) {
      // Dispatch event to notify other components of the update
      window.dispatchEvent(new CustomEvent('fare-data-updated', { 
        detail: { 
          fareType: 'airport',
          vehicleId: fareData.vehicleId
        } 
      }));
      
      // Clear fare cache
      localStorage.removeItem(`airport_fares_${fareData.vehicleId}`);
      
      return true;
    }
    
    throw new Error(finalResponse?.message || 'Failed to update airport fares');
  } catch (error) {
    console.error(`Error updating airport fares: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

/**
 * Sync local fares data
 * This ensures all vehicles have fare data and that it's consistent across tables
 */
export const syncLocalFares = async (): Promise<any> => {
  try {
    console.log("Syncing local fares data...");
    
    const response = await directVehicleOperation(
      'api/admin/sync-local-fares.php',
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      }
    );
    
    return response || { status: 'error', message: 'No response from sync endpoint' };
  } catch (error) {
    console.error(`Error syncing local fares: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

/**
 * Sync airport fares data
 * This ensures all vehicles have fare data and that it's consistent across tables
 */
export const syncAirportFares = async (): Promise<any> => {
  try {
    console.log("Syncing airport fares data...");
    
    // Try the dedicated sync endpoint
    try {
      const response = await directVehicleOperation(
        'api/admin/sync-airport-fares.php',
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      if (response?.status === 'success') {
        console.log("Successfully synced airport fares:", response);
        return response;
      }
    } catch (syncError) {
      console.warn("Error using sync-airport-fares endpoint:", syncError);
      // Continue to fallback
    }
    
    // Fallback: Try initializing tables
    try {
      const response = await directVehicleOperation(
        'api/admin/initialize-airport-fares.php',
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      if (response?.status === 'success') {
        console.log("Successfully initialized airport fares tables:", response);
        return response;
      }
    } catch (initError) {
      console.warn("Error using initialize-airport-fares endpoint:", initError);
      // Continue to next fallback
    }
    
    // Final fallback: General DB setup
    try {
      await initializeDatabaseTables();
      return { status: 'success', message: 'Database initialized successfully' };
    } catch (generalError) {
      throw new Error(`All sync endpoints failed: ${generalError instanceof Error ? generalError.message : String(generalError)}`);
    }
  } catch (error) {
    console.error(`Error syncing airport fares: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};
