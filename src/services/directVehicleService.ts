
/**
 * Direct vehicle service for operations that bypass API layers
 * This ensures consistent behavior for vehicle CRUD operations
 */
import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';
import { getBypassHeaders, safeFetch } from '@/config/requestConfig';
import { directVehicleOperation, checkApiHealth } from '@/utils/apiHelper';
import { toast } from 'sonner';

/**
 * Create a new vehicle
 */
export const createVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    console.log('Creating vehicle:', vehicle);
    
    const result = await directVehicleOperation(
      '/api/admin/direct-vehicle-create.php', 
      'POST', 
      vehicle
    );
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return {
        ...vehicle,
        id: vehicle.vehicleId || vehicle.id
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
    
    const result = await directVehicleOperation(
      '/api/admin/direct-vehicle-update.php', 
      'POST', 
      vehicle
    );
    
    if (result.status === 'success') {
      // Clear any cached data
      localStorage.removeItem('cachedVehicles');
      
      // Dispatch event to notify other components about the change
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
      
      return vehicle;
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
    
    const result = await directVehicleOperation(
      `/api/admin/direct-vehicle-delete.php?vehicleId=${encodeURIComponent(vehicleId)}`, 
      'POST'
    );
    
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
    const fixUrl = `${apiBaseUrl}/api/admin/fix-vehicle-tables.php`;
    const fixResponse = await fetch(fixUrl, {
      method: 'GET',
      headers: getBypassHeaders(),
      cache: 'no-store',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!fixResponse.ok) {
      toast.error('Failed to fix vehicle tables');
      return false;
    }
    
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
    const url = `${apiBaseUrl}/api/fares/vehicles-data.php?_t=${Date.now()}`;
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
