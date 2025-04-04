
import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation, formatDataForMultipart, forceRefreshVehicles } from '@/utils/apiHelper';
import { toast } from 'sonner';

/**
 * Add a new vehicle with simplified approach
 */
export const addVehicle = async (vehicle: CabType): Promise<CabType> => {
  try {
    console.log('Attempting to add vehicle:', vehicle);
    
    // Generate unique timestamp to bypass caching
    const timestamp = Date.now();
    
    // Prepare the vehicle data - ensure id and vehicleId are consistent
    const preparedVehicle = {
      ...vehicle,
      id: vehicle.id || vehicle.vehicleId || `v_${Date.now()}`,
      vehicleId: vehicle.vehicleId || vehicle.id || `v_${Date.now()}`,
      isActive: vehicle.isActive !== false // default to active if not specified
    };
    
    // First approach: direct JSON POST
    try {
      console.log(`Trying direct JSON POST to create vehicle`);
      
      const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-create.php?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(preparedVehicle)
      });
      
      const data = await response.json();
      
      if (data && data.status === 'success') {
        console.log('Vehicle created successfully:', data);
        
        // Force a refresh of vehicle data to ensure it's loaded in the cache
        await forceRefreshVehicles();
        
        return data.vehicle || preparedVehicle;
      } 
      
      throw new Error(data.message || 'Failed to create vehicle');
    } catch (jsonError) {
      console.error('JSON POST method failed:', jsonError);
      
      // Try with FormData approach
      console.log('Falling back to FormData submission');
      const formData = formatDataForMultipart(preparedVehicle);
      
      const formResponse = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-create.php?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: formData
      });
      
      if (!formResponse.ok) {
        throw new Error(`Server returned ${formResponse.status}: ${formResponse.statusText}`);
      }
      
      const formData2 = await formResponse.json();
      
      if (formData2 && formData2.status === 'success') {
        console.log('Vehicle created successfully via form data:', formData2);
        
        // Force refresh to ensure new vehicle appears in list
        await forceRefreshVehicles();
        
        return formData2.vehicle || preparedVehicle;
      }
      
      throw new Error(formData2?.message || 'Failed to create vehicle via form data');
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
    
    // Make sure numeric fields are actually numbers and set default values
    const preparedVehicle = {
      ...vehicle,
      id: vehicle.id || vehicle.vehicleId,
      vehicleId: vehicle.vehicleId || vehicle.id,
      capacity: Number(vehicle.capacity || 4),
      luggageCapacity: Number(vehicle.luggageCapacity || 2),
      basePrice: Number(vehicle.basePrice || vehicle.price || 0),
      price: Number(vehicle.price || vehicle.basePrice || 0),
      pricePerKm: Number(vehicle.pricePerKm || 14),
      nightHaltCharge: Number(vehicle.nightHaltCharge || 700), 
      driverAllowance: Number(vehicle.driverAllowance || 250),
      isActive: vehicle.isActive !== false // default to active if not specified
    };
    
    console.log('Prepared vehicle data for update:', preparedVehicle);
    
    // Try multiple methods to ensure the update goes through
    
    // 1. Direct JSON approach
    try {
      const timestamp = Date.now();
      const url = `${apiBaseUrl}/api/admin/vehicle-update.php?_t=${timestamp}`;
      
      console.log('Trying direct JSON update to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(preparedVehicle)
      });
      
      const data = await response.json();
      
      if (data && data.status === 'success') {
        console.log('Vehicle updated successfully via JSON:', data);
        
        // Force refresh to ensure changes are reflected
        await forceRefreshVehicles();
        
        return data.vehicle || preparedVehicle;
      }
    } catch (jsonError) {
      console.error('JSON update failed:', jsonError);
    }
    
    // 2. FormData approach
    try {
      const timestamp = Date.now();
      const formData = formatDataForMultipart(preparedVehicle);
      
      const formResponse = await fetch(`${apiBaseUrl}/api/admin/vehicle-update.php?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: formData
      });
      
      const formResult = await formResponse.json();
      
      if (formResult && formResult.status === 'success') {
        console.log('Vehicle updated successfully via FormData:', formResult);
        
        // Force refresh to ensure changes are reflected
        await forceRefreshVehicles();
        
        return formResult.vehicle || preparedVehicle;
      }
    } catch (formError) {
      console.error('FormData update failed:', formError);
    }
    
    // If we reach here, both approaches failed
    // Try through our helper function
    try {
      const result = await directVehicleOperation('api/admin/update-vehicle.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: preparedVehicle
      });
      
      if (result && result.status === 'success') {
        console.log('Vehicle updated successfully via helper:', result);
        
        // Force refresh to ensure changes are reflected
        await forceRefreshVehicles();
        
        return result.vehicle || preparedVehicle;
      }
    } catch (helperError) {
      console.error('Helper update failed:', helperError);
    }
    
    // If we're still here, try one more endpoint
    try {
      const result = await directVehicleOperation('api/admin/direct-vehicle-modify.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: preparedVehicle
      });
      
      if (result && result.status === 'success') {
        console.log('Vehicle updated successfully via modify endpoint:', result);
        
        // Force refresh to ensure changes are reflected
        await forceRefreshVehicles();
        
        return result.vehicle || preparedVehicle;
      }
    } catch (modifyError) {
      console.error('Modify endpoint failed:', modifyError);
    }
    
    throw new Error('All update attempts failed');
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
    console.log(`Attempting to delete vehicle with ID: ${vehicleId}`);
    
    // First approach: direct DELETE request
    try {
      const timestamp = Date.now();
      
      const response = await fetch(`${apiBaseUrl}/api/admin/vehicle-delete.php?id=${vehicleId}&_t=${timestamp}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      const data = await response.json();
      
      if (data && data.status === 'success') {
        console.log('Vehicle deleted successfully:', data);
        
        // Force refresh to ensure deletion is reflected
        await forceRefreshVehicles();
        
        return { status: 'success', message: data.message };
      }
    } catch (deleteError) {
      console.error('DELETE method failed:', deleteError);
    }
    
    // Second approach: POST request with delete action
    try {
      const result = await directVehicleOperation('api/admin/vehicle-delete.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: { vehicleId, id: vehicleId }
      });
      
      if (result && result.status === 'success') {
        console.log('Vehicle deleted successfully via POST:', result);
        
        // Force refresh to ensure deletion is reflected
        await forceRefreshVehicles();
        
        return { status: 'success', message: result.message };
      }
    } catch (postError) {
      console.error('POST delete method failed:', postError);
    }
    
    // If both approaches fail, try a more direct endpoint
    try {
      const directResult = await directVehicleOperation('api/admin/direct-vehicle-delete.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: { vehicleId, id: vehicleId }
      });
      
      if (directResult && directResult.status === 'success') {
        console.log('Vehicle deleted successfully via direct endpoint:', directResult);
        
        // Force refresh to ensure deletion is reflected
        await forceRefreshVehicles();
        
        return { status: 'success', message: directResult.message };
      }
    } catch (directError) {
      console.error('Direct delete method failed:', directError);
    }
    
    throw new Error('All delete attempts failed');
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
    const timestamp = Date.now();
    const response = await directVehicleOperation(
      `api/admin/vehicles-data.php?id=${vehicleId}&_t=${timestamp}`, 
      'GET',
      {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
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
    const timestamp = Date.now();
    const response = await directVehicleOperation(
      `api/admin/vehicles-data.php`, 
      'GET',
      {
        data: {
          includeInactive: includeInactive ? 'true' : 'false',
          _t: timestamp
        },
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
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
