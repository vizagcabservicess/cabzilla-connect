
import { getBypassHeaders, getAdminRequestConfig } from '@/config/api';
import fareStateManager from './FareStateManager';

export interface LocalFareData {
  id?: number;
  vehicleId: string;
  vehicle_id?: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

/**
 * Normalize hourly package name
 */
export const normalizeHourlyPackage = (packageName: string): string => {
  return packageName.toLowerCase().replace(/\s+/g, '');
};

/**
 * Fetch local fare data from the server
 */
export const fetchLocalFare = async (vehicleId: string): Promise<LocalFareData | null> => {
  if (!vehicleId) {
    console.error('Vehicle ID is required to fetch local fare');
    return null;
  }
  
  try {
    console.log(`Fetching local fare for vehicle ID: ${vehicleId}`);
    
    // Try to get from FareStateManager first
    const fareFromCache = await fareStateManager.getLocalFareForVehicle(vehicleId);
    
    if (fareFromCache) {
      console.log(`Local fare found in cache for ${vehicleId}:`, fareFromCache);
      return fareFromCache as LocalFareData;
    }
    
    // If not in cache, fetch directly from API
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Local fare API response:', data);
    
    if (data.status !== 'success') {
      console.warn(`No local fare found for vehicle ${vehicleId}`);
      return null;
    }
    
    // Extract fare data from response
    let fareData = null;
    
    if (data.fares) {
      if (Array.isArray(data.fares)) {
        // Find fare for the requested vehicle
        fareData = data.fares.find((fare: any) => 
          fare.vehicleId === vehicleId || fare.vehicle_id === vehicleId
        );
        
        // If not found by exact match, use the first one (shouldn't happen)
        if (!fareData && data.fares.length > 0) {
          console.warn(`No exact match for ${vehicleId}, using first fare in array`);
          fareData = data.fares[0];
        }
      } else if (typeof data.fares === 'object') {
        // Try to get by vehicle ID
        fareData = data.fares[vehicleId] || null;
      }
    }
    
    if (!fareData) {
      console.warn(`No local fare data found for ${vehicleId}`);
      return null;
    }
    
    // Normalize field names
    const normalizedFare: LocalFareData = {
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      price4hrs40km: parseFloat(String(fareData.price4hrs40km ?? fareData.price_4hrs_40km ?? 0)),
      price8hrs80km: parseFloat(String(fareData.price8hrs80km ?? fareData.price_8hrs_80km ?? 0)),
      price10hrs100km: parseFloat(String(fareData.price10hrs100km ?? fareData.price_10hrs_100km ?? 0)),
      priceExtraKm: parseFloat(String(fareData.priceExtraKm ?? fareData.price_extra_km ?? 0)),
      priceExtraHour: parseFloat(String(fareData.priceExtraHour ?? fareData.price_extra_hour ?? 0))
    };
    
    console.log(`Normalized local fare for ${vehicleId}:`, normalizedFare);
    
    // Store in FareStateManager for future use
    await fareStateManager.storeLocalFare(vehicleId, normalizedFare);
    
    return normalizedFare;
  } catch (error) {
    console.error(`Error fetching local fare for ${vehicleId}:`, error);
    return null;
  }
};

/**
 * Update local fare data on the server
 */
export const updateLocalFare = async (fareData: LocalFareData): Promise<boolean> => {
  if (!fareData.vehicleId) {
    console.error('Vehicle ID is required to update local fare');
    return false;
  }
  
  try {
    console.log(`Updating local fare for ${fareData.vehicleId}:`, fareData);
    
    // Create FormData for the request
    const formData = new FormData();
    formData.append('vehicle_id', fareData.vehicleId);
    
    // Add all fare data fields
    Object.entries(fareData).forEach(([key, value]) => {
      if (key !== 'vehicleId' && key !== 'vehicle_id' && key !== 'id') {
        formData.append(key, String(value));
      }
    });
    
    // Also add with underscore format for compatibility
    formData.append('price_4hrs_40km', String(fareData.price4hrs40km));
    formData.append('price_8hrs_80km', String(fareData.price8hrs80km));
    formData.append('price_10hrs_100km', String(fareData.price10hrs100km));
    formData.append('price_extra_km', String(fareData.priceExtraKm));
    formData.append('price_extra_hour', String(fareData.priceExtraHour));
    
    // Send request
    const response = await fetch('/api/admin/direct-local-fares.php', {
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
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to update local fare');
    }
    
    // Update in FareStateManager
    await fareStateManager.storeLocalFare(fareData.vehicleId, fareData);
    
    console.log(`Local fare updated successfully for ${fareData.vehicleId}`);
    return true;
  } catch (error) {
    console.error(`Error updating local fare for ${fareData.vehicleId}:`, error);
    return false;
  }
};

/**
 * Sync local fare tables
 */
export const syncLocalFareTables = async (): Promise<boolean> => {
  try {
    console.log('Syncing local fare tables');
    
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-local-fares.php?sync=true&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to sync local fare tables');
    }
    
    // Force refresh in FareStateManager
    await fareStateManager.syncFareData();
    
    console.log('Local fare tables synced successfully');
    return true;
  } catch (error) {
    console.error('Error syncing local fare tables:', error);
    return false;
  }
};

/**
 * Initialize local fare tables
 */
export const initializeLocalFareTables = async (): Promise<boolean> => {
  try {
    console.log('Initializing local fare tables');
    
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-local-fares.php?initialize=true&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to initialize local fare tables');
    }
    
    // Force refresh in FareStateManager
    await fareStateManager.syncFareData();
    
    console.log('Local fare tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing local fare tables:', error);
    return false;
  }
};
