
import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation, formatDataForMultipart } from '@/utils/apiHelper';
import { toast } from 'sonner';

/**
 * Add a new vehicle
 */
export const addVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    console.log('Attempting to add vehicle:', vehicle);
    
    // Try multiple endpoints in sequence with better error handling
    const endpoints = [
      'api/admin/add-vehicle-simple',  // Try simplified endpoint first (no .php extension)
      'api/admin/add-vehicle-simple.php',
      'api/admin/direct-vehicle-create',
      'api/admin/direct-vehicle-create.php',
      'api/admin/vehicles/create',
      'api/admin/add-vehicle',
      'api/admin/vehicle-create'
    ];
    
    let lastError: Error | null = null;
    let lastResponse: Response | null = null;
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        // Add a timestamp and force flag to bypass cache
        const uniqueId = Date.now();
        const timestampedEndpoint = `${endpoint}?_t=${uniqueId}&force=true`;
        console.log(`Trying vehicle creation endpoint: ${apiBaseUrl}/${timestampedEndpoint}`);
        
        const response = await fetch(`${apiBaseUrl}/${timestampedEndpoint}`, {
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

        lastResponse = response;
        
        // Log response details for debugging
        console.log(`Response status for ${endpoint}:`, response.status);
        const responseText = await response.text();
        console.log(`Response body for ${endpoint}:`, responseText);
        
        // If the response is HTML (contains DOCTYPE or <html>), it means PHP isn't executing correctly
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          console.error('PHP execution error: Server returned HTML instead of JSON');
          throw new Error('Server configuration issue: PHP not executing properly');
        }

        try {
          const result = JSON.parse(responseText);
          if (result && result.status === 'success') {
            console.log('Vehicle creation successful:', result);
            return result.vehicle || vehicle;
          } else {
            throw new Error(result.message || 'Vehicle creation failed');
          }
        } catch (e) {
          console.error('Failed to parse response:', e);
          throw new Error('Invalid server response');
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Error with endpoint ${endpoint}:`, error);
        // Continue to next endpoint
      }
    }
    
    // If all endpoints failed, try direct form submission as a last resort
    try {
      console.log('Trying direct form submission as last resort...');
      
      const formData = new FormData();
      Object.entries(vehicle).forEach(([key, value]) => {
        if (typeof value !== 'undefined') {
          formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
        }
      });
      
      const response = await fetch(`${apiBaseUrl}/api/admin/add-vehicle-simple.php?_t=${Date.now()}`, {
        method: 'POST',
        body: formData
      });
      
      const responseText = await response.text();
      console.log('Direct form submission response:', responseText);
      
      try {
        const result = JSON.parse(responseText);
        if (result && result.status === 'success') {
          console.log('Vehicle creation successful via form submission:', result);
          return result.vehicle || vehicle;
        }
      } catch (e) {
        console.error('Failed to parse form submission response:', e);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
    
    // If we've exhausted all options, provide a detailed error message
    if (lastResponse) {
      const errorDetails = `Status: ${lastResponse.status} ${lastResponse.statusText}`;
      throw new Error(`All vehicle creation attempts failed. Last response: ${errorDetails}`);
    } else {
      throw lastError || new Error('All vehicle creation attempts failed');
    }
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
    // Ensure we have valid id fields
    if (!vehicle.id && !vehicle.vehicleId) {
      throw new Error('Vehicle ID is required for update');
    }
    
    // Make sure numeric fields are actually numbers and set default values for problematic fields
    const preparedVehicle = {
      ...vehicle,
      id: vehicle.id || vehicle.vehicleId,
      vehicleId: vehicle.vehicleId || vehicle.id,
      capacity: Number(vehicle.capacity || 4),
      luggageCapacity: Number(vehicle.luggageCapacity || 2),
      basePrice: Number(vehicle.basePrice || vehicle.price || 0),
      price: Number(vehicle.price || vehicle.basePrice || 0),
      pricePerKm: Number(vehicle.pricePerKm || 0),
      // CRITICAL: Always provide default values for these fields to avoid NULL errors
      nightHaltCharge: Number(vehicle.nightHaltCharge || 700), 
      driverAllowance: Number(vehicle.driverAllowance || 250)  
    };
    
    console.log('Prepared vehicle data for update:', preparedVehicle);

    // Try multiple endpoints using form submission, which is more reliable with PHP
    const formData = formatDataForMultipart(preparedVehicle);
    
    // First try direct form submission to PHP endpoint
    try {
      const unique = Date.now();
      const url = `${apiBaseUrl}/api/admin/direct-vehicle-update.php?_t=${unique}`;
      console.log('Trying direct form submission to:', url);
      
      // FIX: Remove origin header as browsers prevent setting this header manually
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Admin-Mode': 'true'
        }
      });
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          const text = await response.text();
          try {
            responseData = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse response text:', text);
            responseData = { status: 'error', message: 'Invalid JSON response' };
          }
        }
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Failed to parse server response');
      }
      
      if (response.ok && responseData?.status === 'success') {
        console.log('Vehicle updated successfully via form submission');
        return responseData.vehicle || preparedVehicle;
      }
      
      console.warn('Direct form submission failed:', responseData);
      
      // If the error is "MySQL server has gone away", try the fix-vehicle-tables.php endpoint
      if (responseData?.message && responseData.message.includes('MySQL server has gone away')) {
        console.log('Detected "MySQL server has gone away" error, trying to fix database...');
        
        try {
          const fixResponse = await fetch(`${apiBaseUrl}/api/admin/fix-vehicle-tables.php?_t=${Date.now()}`, {
            method: 'GET',
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          const fixData = await fixResponse.json();
          console.log('Database fix response:', fixData);
          
          // Try the update again after fixing
          if (fixData.status === 'success') {
            console.log('Database fixed, retrying update...');
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const retryResponse = await fetch(url, {
              method: 'POST',
              body: formData,
              headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-Force-Refresh': 'true',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Admin-Mode': 'true'
              }
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              if (retryData.status === 'success') {
                console.log('Vehicle updated successfully after database fix');
                return retryData.vehicle || preparedVehicle;
              }
            }
          }
        } catch (fixError) {
          console.error('Failed to fix database:', fixError);
        }
      }
    } catch (err) {
      console.error('Direct form submission error:', err);
    }
    
    // If form submission failed, try with different endpoints
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
        
        const response = await directVehicleOperation(timestampedEndpoint, 'POST', preparedVehicle);
        
        if (response && response.status === 'success') {
          return response.vehicle || preparedVehicle;
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
      
      // Use the direct-vehicle-modify.php endpoint which has better error handling
      const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-modify.php?_t=${Date.now()}`, {
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
        body: JSON.stringify(preparedVehicle)
      });
      
      // Only try to parse JSON if the response is OK
      if (response.ok) {
        const responseText = await response.text();
        try {
          const result = JSON.parse(responseText);
          if (result && result.status === 'success') {
            return result.vehicle || preparedVehicle;
          }
        } catch (e) {
          console.error('Failed to parse JSON:', e, responseText);
        }
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
          body: JSON.stringify(preparedVehicle)
        });
        
        // Only try to parse JSON if the response is OK
        if (response.ok) {
          const responseText = await response.text();
          try {
            const result = JSON.parse(responseText);
            if (result && result.status === 'success') {
              return result.vehicle || preparedVehicle;
            }
          } catch (e) {
            console.error('Failed to parse JSON from backup domain:', e, responseText);
          }
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
