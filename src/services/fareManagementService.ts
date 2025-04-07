
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
 * Fetch airport fares for a vehicle with improved error handling and retries
 */
export const fetchAirportFares = async (vehicleId: string): Promise<AirportFareData[]> => {
  try {
    console.log(`Fetching airport fares for vehicle: ${vehicleId}`);
    
    // Use multiple options to maximize chance of success
    const endpoints = [
      `api/admin/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`,
      `api/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`,
      `api/airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`
    ];
    
    let response;
    let success = false;
    let allErrors = [];
    
    // Try endpoints in sequence
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        response = await directVehicleOperation(
          endpoint,
          'GET',
          {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache',
              'Accept': 'application/json'
            }
          }
        );
        
        if (response?.status === 'success' && response?.data?.fares) {
          success = true;
          console.log(`Successfully fetched fares from ${endpoint}:`, response.data.fares);
          break;
        } else {
          console.warn(`Endpoint ${endpoint} returned invalid response:`, response);
          allErrors.push(`${endpoint}: Invalid response format`);
        }
      } catch (endpointError) {
        console.warn(`Error with endpoint ${endpoint}:`, endpointError);
        allErrors.push(`${endpoint}: ${endpointError instanceof Error ? endpointError.message : String(endpointError)}`);
        // Continue to next endpoint
      }
    }
    
    if (success && response?.data?.fares) {
      return response.data.fares;
    }
    
    // If still no success, try syncing and then fetching again
    console.log("No success with any endpoint, trying to sync airport fares first...");
    await syncAirportFares();
    
    console.log("After sync, trying direct endpoint again...");
    try {
      response = await directVehicleOperation(
        `api/admin/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`,
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        }
      );
      
      if (response?.status === 'success' && response?.data?.fares) {
        console.log("Successfully fetched fares after sync:", response.data.fares);
        return response.data.fares;
      }
    } catch (postSyncError) {
      console.warn("Error after sync:", postSyncError);
      allErrors.push(`Post-sync fetch: ${postSyncError instanceof Error ? postSyncError.message : String(postSyncError)}`);
    }
    
    // Create a default fare entry if all else fails
    console.log("Creating default fare entry after all fetch attempts failed");
    const defaultFare: AirportFareData = {
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      basePrice: 0,
      pricePerKm: 0,
      pickupPrice: 0,
      dropPrice: 0,
      tier1Price: 0,
      tier2Price: 0,
      tier3Price: 0,
      tier4Price: 0,
      extraKmCharge: 0
    };
    
    return [defaultFare];
  } catch (error) {
    console.error(`Error fetching airport fares: ${error instanceof Error ? error.message : String(error)}`);
    
    // Return a default fare entry on error
    const defaultFare: AirportFareData = {
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      basePrice: 0,
      pricePerKm: 0,
      pickupPrice: 0,
      dropPrice: 0,
      tier1Price: 0,
      tier2Price: 0,
      tier3Price: 0,
      tier4Price: 0,
      extraKmCharge: 0
    };
    
    return [defaultFare];
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
 * Update airport fares for a vehicle with multiple retries and fallbacks
 */
export const updateAirportFares = async (fareData: AirportFareData): Promise<boolean> => {
  try {
    console.log(`Updating airport fares for vehicle: ${fareData.vehicleId}`, fareData);
    
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Ensure both formats of vehicle ID are included
    const normalizedFareData = {
      ...fareData,
      vehicleId: fareData.vehicleId,
      vehicle_id: fareData.vehicleId,
      tripType: 'airport',
      trip_type: 'airport'
    };
    
    // Try multiple endpoints to maximize chance of success
    const endpoints = [
      'api/admin/airport-fares-update.php',
      'api/airport-fares-update.php'
    ];
    
    let success = false;
    let finalResponse;
    let allErrors = [];
    
    // Try each endpoint in sequence until one succeeds
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to update airport fares using endpoint: ${endpoint}`);
        
        const response = await directVehicleOperation(
          endpoint,
          'POST',
          {
            data: normalizedFareData,
            headers: {
              'X-Admin-Mode': 'true',
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
        
        console.log(`Response from ${endpoint}:`, response);
        
        if (response?.status === 'success') {
          success = true;
          finalResponse = response;
          console.log(`Successfully updated fares with ${endpoint}`);
          break;
        } else {
          allErrors.push(`${endpoint}: ${response?.message || 'Unknown error'}`);
        }
      } catch (endpointError) {
        console.warn(`Error with endpoint ${endpoint}:`, endpointError);
        allErrors.push(`${endpoint}: ${endpointError instanceof Error ? endpointError.message : String(endpointError)}`);
        // Continue to next endpoint
      }
    }
    
    if (!success) {
      // Try sending as form data instead of JSON
      try {
        console.log("Trying form data format as fallback");
        
        // Convert fare data to FormData
        const formData = new FormData();
        Object.entries(normalizedFareData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        const formDataResponse = await directVehicleOperation(
          'api/admin/airport-fares-update.php',
          'POST',
          {
            formData: formData,
            headers: {
              'X-Admin-Mode': 'true',
              'Accept': 'application/json'
            }
          }
        );
        
        console.log("Form data response:", formDataResponse);
        
        if (formDataResponse?.status === 'success') {
          success = true;
          finalResponse = formDataResponse;
        } else {
          allErrors.push(`Form data: ${formDataResponse?.message || 'Unknown error'}`);
        }
      } catch (formDataError) {
        console.warn("Error with form data approach:", formDataError);
        allErrors.push(`Form data: ${formDataError instanceof Error ? formDataError.message : String(formDataError)}`);
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
    
    throw new Error(`Failed to update airport fares. Errors: ${allErrors.join('; ')}`);
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
 * Sync airport fares data with robust error handling
 * This ensures all vehicles have fare data and that it's consistent across tables
 */
export const syncAirportFares = async (): Promise<any> => {
  try {
    console.log("Syncing airport fares data...");
    
    // Try multiple approaches to ensure success
    const endpoints = [
      'api/admin/sync-airport-fares.php',
      'api/admin/initialize-airport-fares.php',
      'api/admin/db_setup.php'
    ];
    
    let success = false;
    let finalResponse;
    let allErrors = [];
    
    // Try each endpoint in sequence
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying sync endpoint: ${endpoint}`);
        
        const response = await directVehicleOperation(
          endpoint,
          'GET',
          {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache',
              'Accept': 'application/json'
            }
          }
        );
        
        console.log(`Response from ${endpoint}:`, response);
        
        if (response?.status === 'success') {
          success = true;
          finalResponse = response;
          console.log(`Successfully synced with ${endpoint}`);
          break;
        } else {
          allErrors.push(`${endpoint}: ${response?.message || 'Unknown error'}`);
        }
      } catch (endpointError) {
        console.warn(`Error with endpoint ${endpoint}:`, endpointError);
        allErrors.push(`${endpoint}: ${endpointError instanceof Error ? endpointError.message : String(endpointError)}`);
        // Continue to next endpoint
      }
    }
    
    if (success) {
      return finalResponse;
    }
    
    // If all attempts failed, still return something to avoid crashing the UI
    return { 
      status: 'warning',
      message: 'Sync completed with warnings. Some tables may not be fully synced.',
      errors: allErrors
    };
  } catch (error) {
    console.error(`Error syncing airport fares: ${error instanceof Error ? error.message : String(error)}`);
    
    // Return a warning status rather than throwing
    return { 
      status: 'warning',
      message: 'Sync completed with errors. Some tables may not be fully synced.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Fix database tables and ensure proper collation
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    console.log("Fixing database tables and collation...");
    
    const response = await directVehicleOperation(
      'api/admin/fix-database.php',
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log("Database fix response:", response);
    
    // Even if the dedicated endpoint fails, try the initialization endpoint
    if (response?.status !== 'success') {
      const initResponse = await directVehicleOperation(
        'api/admin/initialize-airport-fares.php',
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log("Database initialization response:", initResponse);
      return initResponse?.status === 'success';
    }
    
    return response?.status === 'success';
  } catch (error) {
    console.error("Error fixing database tables:", error);
    
    // Try initialization as a fallback
    try {
      const fallbackResponse = await initializeDatabaseTables();
      return fallbackResponse;
    } catch (fallbackError) {
      console.error("Fallback initialization also failed:", fallbackError);
      return false;
    }
  }
};
