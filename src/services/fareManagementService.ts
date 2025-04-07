
import { directVehicleOperation } from '@/utils/apiHelper';
import { getApiUrl } from '@/config/api';

export interface FareData {
  vehicleId: string;
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
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraHour?: number;
  priceExtraKm?: number;
  // Airport specific fields
  priceOneWay?: number;
  priceRoundTrip?: number;
  nightCharges?: number;
  extraWaitingCharges?: number;
  // For flexible property access
  [key: string]: any;
}

// Function to initialize database tables to ensure they exist
export const initializeDatabaseTables = async (): Promise<boolean> => {
  try {
    console.log('Initializing database tables...');
    const result = await directVehicleOperation('api/admin/db_setup.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    console.log('Database initialization result:', result);
    
    // If successful, also run fix-vehicle-tables to ensure all columns are properly set
    try {
      const fixResult = await directVehicleOperation('api/admin/fix-vehicle-tables.php', 'GET', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'X-Debug': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      console.log('Fix vehicle tables result:', fixResult);
      
      // Also ensure airport_transfer_fares table is synced
      await syncAirportFares();
      
    } catch (fixError) {
      console.warn('Warning: Fix vehicle tables failed, continuing anyway:', fixError);
    }
    
    return result && result.status === 'success';
  } catch (error) {
    console.error('Error initializing database tables:', error);
    return false;
  }
};

export const fetchLocalFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    // Ensure we have database tables initialized
    await initializeDatabaseTables();
    
    // Clean and encode vehicleId
    const cleanVehicleId = vehicleId ? encodeURIComponent(vehicleId.trim()) : '';
    const endpoint = `api/admin/direct-local-fares.php${cleanVehicleId ? `?vehicle_id=${cleanVehicleId}` : ''}`;
    
    const result = await directVehicleOperation(endpoint, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    console.log('Local fares response:', result);
    
    if (result && result.status === 'success' && Array.isArray(result.fares)) {
      return result.fares;
    } else if (result && result.fares && typeof result.fares === 'object') {
      if (Array.isArray(result.fares)) {
        return result.fares;
      } else {
        // Convert object with keys to array
        return Object.values(result.fares);
      }
    } else if (result && Array.isArray(result)) {
      return result;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching local fares:', error);
    throw error;
  }
};

export const fetchAirportFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    // Make sure database tables are initialized before fetching
    await initializeDatabaseTables();
    
    // Clean up vehicle ID and ensure it's properly formatted
    const cleanVehicleId = vehicleId ? encodeURIComponent(vehicleId.trim()) : '';
    const endpoint = `api/admin/direct-airport-fares.php${cleanVehicleId ? `?vehicle_id=${cleanVehicleId}` : ''}`;
    console.log(`Fetching airport fares from: ${endpoint}`);
    
    const result = await directVehicleOperation(endpoint, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    console.log('Airport fares raw response:', result);
    
    // Properly handle different response formats
    if (result) {
      if (result.status === 'success' && Array.isArray(result.fares)) {
        return result.fares;
      } else if (result.fares && typeof result.fares === 'object') {
        if (Array.isArray(result.fares)) {
          return result.fares;
        } else {
          // Convert object with keys to array
          return Object.values(result.fares);
        }
      } else if (Array.isArray(result)) {
        return result;
      } else {
        // Try one more sync attempt if no valid data
        console.warn('No valid fare data in response, trying to sync airport fares');
        await syncAirportFares();
        
        // Try fetching again after sync
        const retryResult = await directVehicleOperation(endpoint, 'GET', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'X-Debug': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (retryResult && retryResult.fares) {
          if (Array.isArray(retryResult.fares)) {
            return retryResult.fares;
          } else {
            return Object.values(retryResult.fares);
          }
        }
        
        // If still no valid format is found, return an empty array
        console.warn('No valid fare data after retry, returning empty array');
        return [];
      }
    }
    
    // Default empty response
    return [];
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    // Try to sync and repair before giving up
    try {
      await syncAirportFares();
    } catch (syncError) {
      console.error('Error syncing airport fares during error recovery:', syncError);
    }
    // Return empty array instead of throwing to avoid breaking the UI
    return [];
  }
};

export const updateLocalFares = async (fareData: FareData): Promise<void> => {
  try {
    // Make sure database tables are initialized before updating
    await initializeDatabaseTables();
    
    // Ensure fareData has both vehicleId and vehicle_id formats for compatibility
    if (fareData.vehicleId && !fareData.vehicle_id) {
      fareData.vehicle_id = fareData.vehicleId;
    } else if (fareData.vehicle_id && !fareData.vehicleId) {
      fareData.vehicleId = fareData.vehicle_id;
    }
    
    console.log('Updating local fares with data:', fareData);
    
    const result = await directVehicleOperation('api/admin/local-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Content-Type': 'application/json'
      },
      data: fareData
    });

    console.log('Local fares update response:', result);

    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to update local fares');
    }
    
    // Sync local fares after update to ensure consistency
    try {
      await syncLocalFares();
    } catch (syncError) {
      console.warn('Warning: Post-update local fare sync failed:', syncError);
    }
  } catch (error) {
    console.error('Error updating local fares:', error);
    throw error;
  }
};

export const updateAirportFares = async (fareData: FareData): Promise<void> => {
  try {
    // Make sure database tables are initialized before updating
    await initializeDatabaseTables();
    
    // Ensure we have both vehicle ID formats for compatibility and clean any whitespace
    const vehicleId = fareData.vehicleId ? fareData.vehicleId.trim() : (fareData.vehicle_id ? fareData.vehicle_id.trim() : '');
    
    if (!vehicleId) {
      throw new Error("Vehicle ID is required");
    }
    
    const dataToSend = {
      ...fareData,
      vehicleId: vehicleId,
      vehicle_id: vehicleId
    };
    
    console.log('Updating airport fares with data:', dataToSend);
    
    // First ensure the tables are synchronized before updating
    try {
      await syncAirportFares();
    } catch (syncError) {
      console.warn('Warning: Pre-update airport fare sync failed:', syncError);
      // Continue with update anyway
    }
    
    const result = await directVehicleOperation('api/admin/airport-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true', 
        'X-Force-Refresh': 'true',
        'X-Debug': 'true',
        'Content-Type': 'application/json'
      },
      data: dataToSend
    });

    console.log('Airport fares update response:', result);

    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to update airport fares');
    }
    
    // Trigger a sync after updating fares
    try {
      await syncAirportFares();
    } catch (syncError) {
      console.warn('Warning: Post-update airport fare sync failed:', syncError);
      // Continue anyway, the update was successful
    }
    
    // Dispatch an event to notify other components that fare data has been updated
    const fareDataUpdatedEvent = new CustomEvent('fare-data-updated', {
      detail: { 
        fareType: 'airport', 
        vehicleId: vehicleId
      }
    });
    window.dispatchEvent(fareDataUpdatedEvent);
    
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
};

export const syncLocalFares = async (): Promise<any> => {
  try {
    // Initialize database tables first to ensure they exist
    await initializeDatabaseTables();
    
    const result = await directVehicleOperation('api/admin/sync-local-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    console.log('Local fares sync response:', result);
    return result;
  } catch (error) {
    console.error('Error syncing local fares:', error);
    throw error;
  }
};

export const syncAirportFares = async (): Promise<any> => {
  try {
    // Initialize database tables first to ensure they exist
    await initializeDatabaseTables();
    
    console.log('Starting airport fares sync');
    const result = await directVehicleOperation('api/admin/sync-airport-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    console.log('Airport fares sync response:', result);
    
    // If sync was successful, trigger vehicle resync
    if (result && result.status === 'success') {
      try {
        // Make a call to reload-vehicles to ensure everything is in sync
        await directVehicleOperation('api/admin/reload-vehicles.php', 'GET', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'X-Debug': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      } catch (resyncError) {
        console.warn('Warning: Vehicle resync during airport fares sync failed:', resyncError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    // Return a standardized error response instead of throwing
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error during airport fares sync',
      timestamp: Date.now()
    };
  }
};
