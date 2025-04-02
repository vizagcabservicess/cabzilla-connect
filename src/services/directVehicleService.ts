
import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';

/**
 * Add a new vehicle
 */
export const addVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    // Try multiple endpoints in sequence to ensure higher success rate
    const endpoints = [
      'api/admin/direct-vehicle-create.php',
      'api/admin/add-vehicle.php',
      'api/admin/vehicle-create.php'
    ];
    
    let lastError: Error | null = null;
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        const response = await directVehicleOperation(endpoint, 'POST', vehicle);
        
        if (response && response.status === 'success') {
          return response.vehicle || vehicle;
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Error with endpoint ${endpoint}:`, error);
        // Continue to the next endpoint
      }
    }
    
    // If we've reached here, all endpoints failed
    throw lastError || new Error('Failed to add vehicle');
  } catch (error) {
    console.error('Failed to add vehicle:', error);
    throw error;
  }
};

/**
 * Update an existing vehicle
 */
export const updateVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    // Try multiple endpoints in sequence to ensure higher success rate
    const endpoints = [
      'api/admin/direct-vehicle-modify.php',
      'api/admin/direct-vehicle-update.php',
      'api/admin/update-vehicle.php',
      'api/admin/vehicle-update.php',
      'api/admin/vehicles-update.php'
    ];
    
    let lastError: Error | null = null;
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        const response = await directVehicleOperation(endpoint, 'POST', vehicle);
        
        if (response && response.status === 'success') {
          return response.vehicle || vehicle;
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Error with endpoint ${endpoint}:`, error);
        // Continue to the next endpoint
      }
    }
    
    // If direct endpoint approach fails, try a direct fetch as a fallback
    try {
      console.log('Trying direct fetch as last resort...');
      const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-update.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Admin-Mode': 'true'
        },
        body: JSON.stringify(vehicle)
      });
      
      const result = await response.json();
      if (result && result.status === 'success') {
        return result.vehicle || vehicle;
      }
    } catch (error) {
      console.error('Last resort direct fetch failed:', error);
    }
    
    // If we've reached here, all endpoints failed
    throw lastError || new Error('Failed to update vehicle');
  } catch (error) {
    console.error('Failed to update vehicle:', error);
    throw error;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<void> => {
  try {
    // Try multiple endpoints in sequence to ensure higher success rate
    const endpoints = [
      'api/admin/direct-vehicle-delete.php',
      'api/admin/delete-vehicle.php',
      'api/admin/vehicle-delete.php'
    ];
    
    let lastError: Error | null = null;
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        const response = await directVehicleOperation(endpoint, 'POST', { vehicleId });
        
        if (response && response.status === 'success') {
          return;
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Error with endpoint ${endpoint}:`, error);
        // Continue to the next endpoint
      }
    }
    
    // If we've reached here, all endpoints failed
    throw lastError || new Error('Failed to delete vehicle');
  } catch (error) {
    console.error('Failed to delete vehicle:', error);
    throw error;
  }
};

/**
 * Get a specific vehicle
 */
export const getVehicle = async (vehicleId: string): Promise<CabType> => {
  try {
    const response = await directVehicleOperation(`api/admin/vehicles-data.php?id=${vehicleId}`, 'GET');
    
    if (response && response.vehicles && response.vehicles.length > 0) {
      return response.vehicles[0];
    }
    
    throw new Error('Vehicle not found');
  } catch (error) {
    console.error('Failed to get vehicle:', error);
    throw error;
  }
};
