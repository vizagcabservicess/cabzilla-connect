
import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';
import { toast } from 'sonner';
import { clearVehicleDataCache } from './vehicleDataService';

interface VehicleResponse {
  status: string;
  message: string;
  vehicleId?: string;
  vehicle?: CabType;
}

/**
 * Create a new vehicle
 */
export const createVehicle = async (vehicleData: CabType): Promise<VehicleResponse> => {
  // Convert the vehicle data to FormData
  const formData = new FormData();
  
  // Add all vehicle data properties
  for (const [key, value] of Object.entries(vehicleData)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'boolean') {
        formData.append(key, value ? '1' : '0');
      } else {
        formData.append(key, String(value));
      }
    }
  }
  
  // Add special fields to ensure the creation works in all tables
  formData.append('ac', '1');
  formData.append('active', '1');
  formData.append('is_active', '1');
  formData.append('forceSync', 'true');
  formData.append('force_sync', 'true');
  formData.append('vehicle_id', vehicleData.id);
  formData.append('vehicleId', vehicleData.id);
  
  // Add snake case versions of camel case fields
  for (const [key, value] of Object.entries(vehicleData)) {
    if (key.match(/[A-Z]/)) {
      const snakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(snakeCase, JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          formData.append(snakeCase, value ? '1' : '0');
        } else {
          formData.append(snakeCase, String(value));
        }
      }
    }
  }
  
  try {
    // First try to create in all tables via vehicle pricing endpoint
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-create.php`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      mode: 'cors',
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // Try fallback endpoint
      const fallbackUrl = `${apiBaseUrl}/api/admin/vehicles-update.php`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`API error: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      // Force a sync between tables
      await syncVehicleData(true);
      
      // Clear cache
      clearVehicleDataCache();
      
      // Trigger an event to notify components
      window.dispatchEvent(new CustomEvent('vehicles-updated', {
        detail: { vehicleId: vehicleData.id, timestamp: Date.now() }
      }));
      
      return {
        status: fallbackData.status || 'success',
        message: fallbackData.message || 'Vehicle created successfully via fallback',
        vehicleId: vehicleData.id,
        vehicle: vehicleData
      };
    }
    
    const data = await response.json();
    
    // Force a sync between tables
    await syncVehicleData(true);
    
    // Clear cache
    clearVehicleDataCache();
    
    // Trigger an event to notify components
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: { vehicleId: vehicleData.id, timestamp: Date.now() }
    }));
    
    return {
      status: data.status || 'success',
      message: data.message || 'Vehicle created successfully',
      vehicleId: vehicleData.id,
      vehicle: vehicleData
    };
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

/**
 * Update an existing vehicle
 */
export const updateVehicle = async (vehicleData: CabType): Promise<VehicleResponse> => {
  // Similar approach as createVehicle
  const formData = new FormData();
  
  // Add all vehicle data properties
  for (const [key, value] of Object.entries(vehicleData)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'boolean') {
        formData.append(key, value ? '1' : '0');
      } else {
        formData.append(key, String(value));
      }
    }
  }
  
  // Add special fields to ensure the update works in all tables
  formData.append('forceSync', 'true');
  formData.append('force_sync', 'true');
  formData.append('vehicle_id', vehicleData.id);
  formData.append('vehicleId', vehicleData.id);
  formData.append('id', vehicleData.id);
  
  // Add snake case versions of camel case fields
  for (const [key, value] of Object.entries(vehicleData)) {
    if (key.match(/[A-Z]/)) {
      const snakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(snakeCase, JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          formData.append(snakeCase, value ? '1' : '0');
        } else {
          formData.append(snakeCase, String(value));
        }
      }
    }
  }
  
  try {
    // Try to update in all tables
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-update.php`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      mode: 'cors',
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // Try fallback endpoint
      const fallbackUrl = `${apiBaseUrl}/api/admin/vehicles-update.php`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`API error: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      // Force a sync between tables
      await syncVehicleData(true);
      
      // Clear cache
      clearVehicleDataCache();
      
      // Trigger an event to notify components
      window.dispatchEvent(new CustomEvent('vehicles-updated', {
        detail: { vehicleId: vehicleData.id, timestamp: Date.now() }
      }));
      
      return {
        status: fallbackData.status || 'success',
        message: fallbackData.message || 'Vehicle updated successfully via fallback',
        vehicleId: vehicleData.id,
        vehicle: vehicleData
      };
    }
    
    const data = await response.json();
    
    // Force a sync between tables
    await syncVehicleData(true);
    
    // Clear cache
    clearVehicleDataCache();
    
    // Trigger an event to notify components
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: { vehicleId: vehicleData.id, timestamp: Date.now() }
      }));
    
    return {
      status: data.status || 'success',
      message: data.message || 'Vehicle updated successfully',
      vehicleId: vehicleData.id,
      vehicle: vehicleData
    };
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<VehicleResponse> => {
  const formData = new FormData();
  formData.append('vehicleId', vehicleId);
  formData.append('vehicle_id', vehicleId);
  formData.append('id', vehicleId);
  formData.append('forceSync', 'true');
  formData.append('force_sync', 'true');
  
  try {
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-delete.php`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      mode: 'cors',
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // Try an alternative approach with a PUT/DELETE request
      const fallbackUrl = `${apiBaseUrl}/api/admin/vehicles-update.php?delete=true&vehicle_id=${vehicleId}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`API error: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      // Force a sync between tables
      await syncVehicleData(true);
      
      // Clear cache
      clearVehicleDataCache();
      
      // Trigger an event to notify components
      window.dispatchEvent(new CustomEvent('vehicles-updated', {
        detail: { vehicleId, action: 'delete', timestamp: Date.now() }
      }));
      
      return {
        status: fallbackData.status || 'success',
        message: fallbackData.message || 'Vehicle deleted successfully via fallback',
        vehicleId
      };
    }
    
    const data = await response.json();
    
    // Force a sync between tables
    await syncVehicleData(true);
    
    // Clear cache
    clearVehicleDataCache();
    
    // Trigger an event to notify components
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: { vehicleId, action: 'delete', timestamp: Date.now() }
    }));
    
    return {
      status: data.status || 'success',
      message: data.message || 'Vehicle deleted successfully',
      vehicleId
    };
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

/**
 * Update vehicle fares
 */
export const updateVehicleFares = async (vehicleId: string, tripType: string, fareData: any): Promise<VehicleResponse> => {
  // Convert the fare data to FormData
  const formData = new FormData();
  formData.append('vehicleId', vehicleId);
  formData.append('vehicle_id', vehicleId);
  formData.append('tripType', tripType);
  formData.append('trip_type', tripType);
  formData.append('forceSync', 'true');
  formData.append('force_sync', 'true');
  
  // Add all fare data properties
  for (const [key, value] of Object.entries(fareData)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
      
      // Add snake case version for compatibility
      const snakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (snakeCase !== key) {
        formData.append(snakeCase, String(value));
      }
    }
  }
  
  try {
    let url: string;
    
    // Choose the appropriate endpoint based on trip type
    switch (tripType) {
      case 'outstation':
        url = `${apiBaseUrl}/api/admin/direct-outstation-fares.php`;
        break;
      case 'local':
        url = `${apiBaseUrl}/api/admin/direct-local-fares.php`;
        break;
      case 'airport':
        url = `${apiBaseUrl}/api/admin/direct-airport-fares.php`;
        break;
      default:
        url = `${apiBaseUrl}/api/admin/direct-fare-update.php`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      mode: 'cors',
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // Try the generic fare update endpoint as fallback
      const fallbackUrl = `${apiBaseUrl}/api/admin/direct-fare-update.php`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`API error: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      // Force a sync between tables
      await syncVehicleData(true);
      
      // Clear cache
      clearVehicleDataCache();
      
      // Trigger events to notify components
      window.dispatchEvent(new CustomEvent('fare-data-updated', {
        detail: { vehicleId, tripType, timestamp: Date.now() }
      }));
      
      window.dispatchEvent(new CustomEvent('vehicles-updated', {
        detail: { vehicleId, action: 'fare-update', timestamp: Date.now() }
      }));
      
      return {
        status: fallbackData.status || 'success',
        message: fallbackData.message || `${tripType} fares updated successfully via fallback`,
        vehicleId
      };
    }
    
    const data = await response.json();
    
    // Force a sync between tables
    await syncVehicleData(true);
    
    // Clear cache
    clearVehicleDataCache();
    
    // Trigger events to notify components
    window.dispatchEvent(new CustomEvent('fare-data-updated', {
      detail: { vehicleId, tripType, timestamp: Date.now() }
    }));
    
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: { vehicleId, action: 'fare-update', timestamp: Date.now() }
    }));
    
    return {
      status: data.status || 'success',
      message: data.message || `${tripType} fares updated successfully`,
      vehicleId
    };
  } catch (error) {
    console.error(`Error updating ${tripType} fares:`, error);
    throw error;
  }
};

/**
 * Sync vehicle data across all tables
 */
export const syncVehicleData = async (forceRefresh = false): Promise<{ success: boolean; message?: string; vehicleCount?: number; alreadyInProgress?: boolean }> => {
  try {
    // Clear existing vehicle data cache
    clearVehicleDataCache();
    
    // Use a timestamp to avoid caching
    const timestamp = Date.now();
    const url = `${apiBaseUrl}/api/admin/force-sync-outstation-fares.php?_t=${timestamp}&fullSync=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error' && data.message && data.message.includes('in progress')) {
      console.log('Sync already in progress:', data.message);
      return {
        success: false,
        message: data.message,
        alreadyInProgress: true
      };
    }
    
    // Now fetch all vehicles to ensure they're all properly synced
    const vehiclesUrl = `${apiBaseUrl}/api/admin/get-vehicles.php?_t=${timestamp}&includeInactive=true&fullSync=true`;
    
    const vehiclesResponse = await fetch(vehiclesUrl, {
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!vehiclesResponse.ok) {
      throw new Error(`API error: ${vehiclesResponse.status} ${vehiclesResponse.statusText}`);
    }
    
    const vehiclesData = await vehiclesResponse.json();
    
    // Trigger events to notify components
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: { action: 'sync', timestamp }
    }));
    
    window.dispatchEvent(new CustomEvent('fare-data-updated', {
      detail: { action: 'sync', timestamp }
    }));
    
    window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
      detail: { 
        count: vehiclesData.vehicles ? vehiclesData.vehicles.length : 0,
        timestamp,
        isAdminView: true
      }
    }));
    
    // Return success with vehicle count
    return {
      success: true,
      message: 'Vehicle data synchronized successfully',
      vehicleCount: vehiclesData.vehicles ? vehiclesData.vehicles.length : 0
    };
  } catch (error) {
    console.error('Error syncing vehicle data:', error);
    
    // Try another approach if the first one fails
    try {
      const timestamp = Date.now();
      const localSyncUrl = `${apiBaseUrl}/api/admin/sync-local-fares.php?_t=${timestamp}`;
      
      await fetch(localSyncUrl, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      const outstationSyncUrl = `${apiBaseUrl}/api/admin/sync-outstation-fares.php?_t=${timestamp}`;
      
      await fetch(outstationSyncUrl, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      // Trigger events to notify components
      window.dispatchEvent(new CustomEvent('vehicles-updated', {
        detail: { action: 'sync', timestamp }
      }));
      
      return {
        success: true,
        message: 'Vehicle data synchronized via alternative method'
      };
    } catch (fallbackError) {
      console.error('Fallback sync also failed:', fallbackError);
      return {
        success: false,
        message: 'Failed to synchronize vehicle data'
      };
    }
  }
};

/**
 * Get vehicle by ID
 */
export const getVehicleById = async (vehicleId: string): Promise<CabType | null> => {
  try {
    const timestamp = Date.now();
    const url = `${apiBaseUrl}/api/admin/get-vehicles.php?_t=${timestamp}&vehicleId=${vehicleId}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
      // Try to find the exact vehicle
      const vehicle = data.vehicles.find((v: any) => v.id === vehicleId || v.vehicleId === vehicleId);
      
      if (vehicle) {
        return vehicle as CabType;
      }
    }
    
    // If not found via the API, try the cached data
    const cachedVehicles = localStorage.getItem('cachedVehicles');
    if (cachedVehicles) {
      const parsed = JSON.parse(cachedVehicles);
      if (Array.isArray(parsed)) {
        const vehicle = parsed.find((v: any) => v.id === vehicleId || v.vehicleId === vehicleId);
        if (vehicle) {
          return vehicle as CabType;
        }
      }
    }
    
    // Not found
    return null;
  } catch (error) {
    console.error('Error getting vehicle by ID:', error);
    
    // Try to find in cached data as fallback
    try {
      const cachedVehicles = localStorage.getItem('cachedVehicles');
      if (cachedVehicles) {
        const parsed = JSON.parse(cachedVehicles);
        if (Array.isArray(parsed)) {
          const vehicle = parsed.find((v: any) => v.id === vehicleId || v.vehicleId === vehicleId);
          if (vehicle) {
            return vehicle as CabType;
          }
        }
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    return null;
  }
};

/**
 * Force refresh all vehicle data in the system
 */
export const forceRefreshVehicleData = async (): Promise<boolean> => {
  try {
    // Clear cache first
    clearVehicleDataCache();
    
    // Show toast to indicate refresh
    toast.info('Refreshing vehicle data...');
    
    // Sync vehicle data
    const syncResult = await syncVehicleData(true);
    
    if (syncResult.success) {
      toast.success(`Vehicle data refreshed successfully (${syncResult.vehicleCount || 0} vehicles)`);
      return true;
    } else {
      if (syncResult.alreadyInProgress) {
        toast.info('Vehicle sync already in progress, please wait');
      } else {
        toast.error('Failed to refresh vehicle data');
      }
      return false;
    }
  } catch (error) {
    console.error('Error forcing refresh of vehicle data:', error);
    toast.error('Error refreshing vehicle data');
    return false;
  }
};
