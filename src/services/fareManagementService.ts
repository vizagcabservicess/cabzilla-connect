import { directVehicleOperation } from '@/utils/apiHelper';

// Define common fare data interface with optional fields to support different fare types
export interface FareData {
  vehicleId?: string;
  vehicle_id?: string;
  // Local fare fields
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  // Airport fare fields
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  // For flexible property access
  [key: string]: any;
}

// Function to clear browser cache for fare data
export const clearFareCache = () => {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(key => key.includes('fare') || key.includes('Fare'));
  
  cacheKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  toast.info('Fare cache cleared');
};

// Initialize database tables for fare management
export const initializeDatabaseTables = async (): Promise<boolean> => {
  try {
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-collation.php?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to initialize database tables: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      console.log('Database tables initialized successfully:', result);
      return true;
    } else {
      console.error('Failed to initialize database tables:', result?.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('Error initializing database tables:', error);
    return false;
  }
};

// Get local fares for a specific vehicle
export const fetchLocalFares = async (vehicleId: string): Promise<FareData[]> => {
  try {
    // Append a timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/direct-local-fares.php?vehicleId=${vehicleId}&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch local fares: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    if (responseData && responseData.status === 'success' && responseData.fares) {
      return Array.isArray(responseData.fares) ? responseData.fares : [responseData.fares];
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching local fares:', error);
    throw error;
  }
};

// Update local fares for a specific vehicle
export const updateLocalFares = async (fareData: FareData): Promise<any> => {
  try {
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Ensure vehicle_id is set
    fareData.vehicle_id = fareData.vehicleId;
    
    // Create form data to pass to the API
    const formData = new FormData();
    formData.append('vehicleId', fareData.vehicleId);
    formData.append('vehicle_id', fareData.vehicleId);
    
    // Append all fare fields that exist in the data
    if (fareData.price4hrs40km !== undefined) formData.append('price4hrs40km', String(fareData.price4hrs40km));
    if (fareData.price8hrs80km !== undefined) formData.append('price8hrs80km', String(fareData.price8hrs80km));
    if (fareData.price10hrs100km !== undefined) formData.append('price10hrs100km', String(fareData.price10hrs100km));
    if (fareData.priceExtraKm !== undefined) formData.append('priceExtraKm', String(fareData.priceExtraKm));
    if (fareData.priceExtraHour !== undefined) formData.append('priceExtraHour', String(fareData.priceExtraHour));
    
    // Add compatibility for both field naming conventions
    if (fareData.extraKmCharge !== undefined) formData.append('extraKmCharge', String(fareData.extraKmCharge));
    
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/local-fares-update.php?_t=${timestamp}`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update local fares: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      // Dispatch custom event to notify other components
      const event = new CustomEvent('fare-data-updated', {
        detail: {
          fareType: 'local',
          vehicleId: fareData.vehicleId
        }
      });
      window.dispatchEvent(event);
      
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update local fares');
    }
  } catch (error) {
    console.error('Error updating local fares:', error);
    throw error;
  }
};

// Get airport fares for a specific vehicle
export async function fetchAirportFares(vehicleId: string): Promise<any> {
  try {
    const timestamp = new Date().getTime();
    const urlParams = new URLSearchParams({
      vehicleId: vehicleId,
      _t: timestamp.toString(),
    });
    
    // First try the direct vehicle pricing endpoint
    try {
      const response = await directVehicleOperation(
        `api/admin/direct-airport-fares.php?${urlParams.toString()}`,
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'X-Debug': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        }
      );
      
      console.log('Direct airport fares response:', response);
      return response;
    } catch (err) {
      console.warn('Error with direct airport fares, trying fallback:', err);
      
      // Fallback to the legacy endpoint
      const fallbackResponse = await directVehicleOperation(
        `api/airport-fares.php?${urlParams.toString()}`,
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'X-Debug': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        }
      );
      
      console.log('Fallback airport fares response:', fallbackResponse);
      return fallbackResponse;
    }
  } catch (err) {
    console.error('Failed to fetch airport fares:', err);
    throw new Error(`Failed to fetch airport fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Update airport fares for a specific vehicle
export async function updateAirportFares(fareData: FareData): Promise<any> {
  try {
    if (!fareData.vehicleId && !fareData.vehicle_id) {
      throw new Error('Vehicle ID is required');
    }
    
    const timestamp = new Date().getTime();
    
    const response = await directVehicleOperation(
      `api/admin/airport-fares-update.php?_t=${timestamp}`, 
      'POST',
      { 
        __data: {
          ...fareData,
          vehicleId: fareData.vehicleId || fareData.vehicle_id,
          vehicle_id: fareData.vehicleId || fareData.vehicle_id
        },
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'X-Debug': 'true',
          'Content-Type': 'application/json',
        }
      }
    );
    
    return response;
  } catch (err) {
    console.error('Failed to update airport fares:', err);
    throw new Error(`Failed to update airport fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Sync local fare tables (update or create tables if needed)
export async function syncLocalFares(): Promise<any> {
  try {
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/sync-local-fares.php?force_sync=true&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync local fares: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      // Refresh fare cache
      clearFareCache();
      
      // Dispatch custom event
      const event = new CustomEvent('fare-data-updated', {
        detail: {
          fareType: 'local',
          allVehicles: true
        }
      });
      window.dispatchEvent(event);
      
      return result;
    } else {
      throw new Error(result?.message || 'Failed to sync local fares');
    }
  } catch (error) {
    console.error('Error syncing local fares:', error);
    throw error;
  }
}

// Sync airport fare tables (update or create tables if needed)
export async function syncAirportFares(): Promise<any> {
  try {
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await directVehicleOperation(
      `api/admin/sync-airport-fares.php?_t=${timestamp}`, 
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'X-Debug': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );
    
    return response;
  } catch (err) {
    console.error('Failed to sync airport fares:', err);
    throw new Error(`Failed to sync airport fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
