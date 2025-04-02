
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
        // Add a timestamp to bypass cache
        const timestampedEndpoint = `${endpoint}?_t=${Date.now()}`;
        console.log(`Trying vehicle creation endpoint: ${apiBaseUrl}/${timestampedEndpoint}`);
        
        const response = await directVehicleOperation(timestampedEndpoint, 'POST', vehicle);
        
        if (response && response.status === 'success') {
          return response.vehicle || vehicle;
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Error with endpoint ${endpoint}:`, error);
        // Continue to the next endpoint
      }
    }
    
    // If all endpoints failed, try a direct fetch as a last resort
    try {
      console.log('Trying direct fetch as last resort for vehicle creation...');
      const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-create.php`, {
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
    throw lastError || new Error('Failed to add vehicle');
  } catch (error) {
    console.error('Failed to add vehicle:', error);
    throw error;
  }
};

// Add an alias for addVehicle as createVehicle for backward compatibility
export const createVehicle = addVehicle;

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
        // Add a timestamp to bypass cache
        const timestampedEndpoint = `${endpoint}?_t=${Date.now()}`;
        console.log(`Trying vehicle update endpoint: ${apiBaseUrl}/${timestampedEndpoint}`);
        
        const response = await directVehicleOperation(timestampedEndpoint, 'POST', vehicle);
        
        if (response && response.status === 'success') {
          return response.vehicle || vehicle;
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Error with endpoint ${endpoint}:`, error);
        // Continue to the next endpoint
      }
    }
    
    // If all endpoints failed, try a direct fetch as a last resort
    try {
      console.log('Trying direct fetch as last resort for vehicle update...');
      const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-update.php?_t=${Date.now()}`, {
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
    
    // If direct API calls failed, try using the backup domain if available
    if (typeof window !== 'undefined') {
      try {
        const backupDomain = 'https://vizagcabs.com';
        console.log(`Trying backup domain: ${backupDomain}`);
        const response = await fetch(`${backupDomain}/api/admin/direct-vehicle-update.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Admin-Mode': 'true'
          },
          body: JSON.stringify(vehicle)
        });
        
        const result = await response.json();
        if (result && result.status === 'success') {
          return result.vehicle || vehicle;
        }
      } catch (error) {
        console.error('Backup domain attempt failed:', error);
      }
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
export const deleteVehicle = async (vehicleId: string): Promise<{ status: string, message?: string }> => {
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
        // Add a timestamp to bypass cache
        const timestampedEndpoint = `${endpoint}?_t=${Date.now()}`;
        console.log(`Trying vehicle deletion endpoint: ${apiBaseUrl}/${timestampedEndpoint}`);
        
        const response = await directVehicleOperation(timestampedEndpoint, 'POST', { vehicleId });
        
        if (response && response.status === 'success') {
          return { status: 'success' };
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Error with endpoint ${endpoint}:`, error);
        // Continue to the next endpoint
      }
    }
    
    // If all API endpoints failed, try a direct fetch as a last resort
    try {
      console.log('Trying direct fetch as last resort for vehicle deletion...');
      const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-delete.php?id=${vehicleId}&_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Admin-Mode': 'true'
        },
        body: JSON.stringify({ vehicleId })
      });
      
      const result = await response.json();
      if (result && result.status === 'success') {
        return { status: 'success' };
      }
    } catch (error) {
      console.error('Last resort direct fetch for deletion failed:', error);
    }
    
    // If we've reached here, all endpoints failed
    throw lastError || new Error('Failed to delete vehicle');
  } catch (error: any) {
    console.error('Failed to delete vehicle:', error);
    throw new Error(error.message || 'Failed to delete vehicle');
  }
};

/**
 * Get a specific vehicle
 */
export const getVehicle = async (vehicleId: string): Promise<CabType> => {
  try {
    const response = await directVehicleOperation(`api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}`, 'GET');
    
    if (response && response.vehicles && response.vehicles.length > 0) {
      return response.vehicles[0];
    }
    
    throw new Error('Vehicle not found');
  } catch (error) {
    console.error('Failed to get vehicle:', error);
    throw error;
  }
};

/**
 * Get all vehicles
 */
export const getVehicles = async (includeInactive = false): Promise<CabType[]> => {
  try {
    const response = await directVehicleOperation(
      `api/admin/vehicles-data.php?includeInactive=${includeInactive ? 'true' : 'false'}&_t=${Date.now()}`, 
      'GET'
    );
    
    if (response && response.vehicles && Array.isArray(response.vehicles)) {
      return response.vehicles;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get vehicles:', error);
    return [];
  }
};
