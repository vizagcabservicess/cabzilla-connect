
import { directVehicleOperation } from '@/utils/apiHelper';
import { getApiUrl } from '@/config/api';

export interface FareData {
  vehicleId: string;
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
  // Airport specific fields
  priceOneWay?: number;
  priceRoundTrip?: number;
  nightCharges?: number;
  extraWaitingCharges?: number;
}

// Function to initialize database tables to ensure they exist
export const initializeDatabaseTables = async (): Promise<boolean> => {
  try {
    console.log('Initializing database tables...');
    const result = await directVehicleOperation('api/admin/db_setup.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    console.log('Database initialization result:', result);
    return result && result.status === 'success';
  } catch (error) {
    console.error('Error initializing database tables:', error);
    return false;
  }
};

export const fetchLocalFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    const endpoint = `api/admin/direct-local-fares.php${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`;
    const result = await directVehicleOperation(endpoint, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    console.log('Local fares response:', result);
    
    return result.fares || [];
  } catch (error) {
    console.error('Error fetching local fares:', error);
    throw error;
  }
};

export const fetchAirportFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    // Make sure database tables are initialized before fetching
    await initializeDatabaseTables();
    
    // Ensure airport fares are synced
    try {
      await syncAirportFares();
    } catch (syncError) {
      console.warn('Warning: Pre-fetch airport fare sync failed:', syncError);
      // Continue with fetch anyway
    }
    
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
    
    // Handle different response formats
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
    
    console.warn('No valid fare data in response:', result);
    return [];
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    throw error;
  }
};

export const updateLocalFares = async (fareData: FareData): Promise<void> => {
  try {
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
    const vehicleId = fareData.vehicleId ? fareData.vehicleId.trim() : '';
    
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
        'X-Debug': 'true'
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
    return result;
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    throw error;
  }
};
