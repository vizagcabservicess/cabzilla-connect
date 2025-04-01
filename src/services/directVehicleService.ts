
/**
 * Direct vehicle service for operations that bypass API layers
 * This ensures consistent behavior for vehicle CRUD operations
 */
import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';
import { getBypassHeaders, safeFetch } from '@/config/requestConfig';
import { directVehicleOperation, checkApiHealth, fixDatabaseTables } from '@/utils/apiHelper';
import { toast } from 'sonner';

// Helper function to ensure consistent vehicle ID format
const normalizeVehicleId = (id: string): string => {
  if (!id) return '';
  // Return the ID as-is without any transformations to maintain compatibility with backend
  return id.trim();
};

/**
 * Create a new vehicle
 */
export const createVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    console.log('Creating vehicle:', vehicle);
    
    // Normalize vehicle ID before sending
    const normalizedVehicle = {
      ...vehicle,
      id: normalizeVehicleId(vehicle.id || vehicle.vehicleId || ''),
      vehicleId: normalizeVehicleId(vehicle.id || vehicle.vehicleId || ''),
    };
    
    // Use FormData instead of JSON for better PHP compatibility
    const formData = new FormData();
    Object.entries(normalizedVehicle).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value || ''));
      }
    });
    
    // Make direct request to create endpoint with FormData
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-create.php?_t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: getBypassHeaders(),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return {
        ...normalizedVehicle,
        id: normalizedVehicle.id,
        vehicleId: normalizedVehicle.id,
      };
    } else {
      throw new Error(result.message || 'Failed to create vehicle');
    }
  } catch (error) {
    console.error('Error creating vehicle:', error);
    // Re-throw to allow the UI to handle the error
    throw error;
  }
};

/**
 * Update an existing vehicle
 */
export const updateVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    console.log('Updating vehicle:', vehicle);
    
    // Normalize vehicle ID before sending
    const normalizedVehicle = {
      ...vehicle,
      id: normalizeVehicleId(vehicle.id || vehicle.vehicleId || ''),
      vehicleId: normalizeVehicleId(vehicle.id || vehicle.vehicleId || ''),
    };
    
    // Use FormData instead of JSON for better PHP compatibility
    const formData = new FormData();
    Object.entries(normalizedVehicle).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value || ''));
      }
    });
    
    // Make direct request to update endpoint with FormData
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-update.php?_t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: getBypassHeaders(),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return normalizedVehicle;
    } else {
      throw new Error(result.message || 'Failed to update vehicle');
    }
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  try {
    console.log('Deleting vehicle:', vehicleId);
    
    const normalizedId = normalizeVehicleId(vehicleId);
    
    // Make direct request to delete endpoint with URL parameters
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-delete.php?vehicleId=${encodeURIComponent(normalizedId)}&_t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getBypassHeaders(),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return true;
    } else {
      throw new Error(result.message || 'Failed to delete vehicle');
    }
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

/**
 * Update a vehicle's fares
 */
export const updateVehicleFares = async (vehicleId: string, fareData: any): Promise<boolean> => {
  try {
    console.log('Updating vehicle fares:', vehicleId, fareData);
    
    const result = await directVehicleOperation(
      '/api/admin/direct-vehicle-update.php', 
      'POST', 
      {
        vehicleId,
        ...fareData
      }
    );
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return true;
    } else {
      throw new Error(result.message || 'Failed to update vehicle fares');
    }
  } catch (error) {
    console.error('Error updating vehicle fares:', error);
    throw error;
  }
};

/**
 * Sync vehicle data with server
 * Use this to fix database tables if needed
 */
export const syncVehicleData = async (): Promise<boolean> => {
  try {
    // Start by checking API health
    const isHealthy = await checkApiHealth();
    
    if (!isHealthy) {
      toast.warning("API not responding. Try using Fix Database option.");
      return false;
    }
    
    // Try to fix database tables
    const isFixed = await fixDatabaseTables();
    
    if (!isFixed) {
      toast.error('Failed to fix vehicle tables');
      return false;
    }
    
    toast.success('Successfully synchronized vehicle data across tables');
    
    // Clear any cached data
    localStorage.removeItem('cachedVehicles');
    
    // Dispatch event to notify other components about the change
    window.dispatchEvent(new CustomEvent('vehicle-data-cache-cleared'));
    
    return true;
  } catch (error) {
    console.error('Error syncing vehicle data:', error);
    return false;
  }
};

/**
 * Sync a specific vehicle's data across all tables
 */
export const syncVehicleTables = async (vehicleId: string): Promise<boolean> => {
  try {
    // Call the fix-vehicle-tables endpoint with the specific vehicle ID
    const url = `${apiBaseUrl}/api/admin/fix-vehicle-tables.php?vehicleId=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getBypassHeaders(),
      cache: 'no-store',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      console.error(`Failed to sync vehicle tables: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log(`Vehicle ${vehicleId} synchronized across all tables`);
      return true;
    } else {
      console.error('Failed to sync vehicle tables:', result.message);
      return false;
    }
  } catch (error) {
    console.error('Error syncing vehicle tables:', error);
    return false;
  }
};

/**
 * Get a specific vehicle by ID
 */
export const getVehicleById = async (vehicleId: string): Promise<CabType | null> => {
  try {
    // Check local storage cache first
    const cachedVehiclesString = localStorage.getItem('cachedVehicles');
    if (cachedVehiclesString) {
      const cachedVehicles = JSON.parse(cachedVehiclesString);
      const cachedVehicle = cachedVehicles.find((v: CabType) => 
        v.id === vehicleId || v.vehicleId === vehicleId
      );
      
      if (cachedVehicle) {
        return cachedVehicle;
      }
    }
    
    // If not in cache, try to fetch from server
    const url = `${apiBaseUrl}/api/admin/get-vehicles.php?_t=${Date.now()}`;
    const response = await safeFetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.vehicles) {
      const vehicle = data.vehicles.find((v: CabType) => 
        v.id === vehicleId || v.vehicleId === vehicleId
      );
      
      return vehicle || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching vehicle by ID:', error);
    return null;
  }
};
