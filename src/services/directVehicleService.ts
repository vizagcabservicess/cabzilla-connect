
import axios from 'axios';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';
import { CabType } from '@/types/cab';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Creates a new vehicle
 */
export const createVehicle = async (vehicleData: any) => {
  try {
    // Normalize vehicle ID (lowercase, replace spaces with underscores)
    const vehicleId = typeof vehicleData.vehicleId === 'string' 
      ? vehicleData.vehicleId.toLowerCase().replace(/\s+/g, '_')
      : vehicleData.vehicleId;
    
    const normalizedData = {
      ...vehicleData,
      vehicleId: vehicleId,
      vehicle_id: vehicleId, // Add both formats for PHP,
      is_active: 1,
    };
    
    console.log('Creating vehicle with data:', normalizedData);
    
    // Try multiple approaches
    let success = false;
    let responseData: any = null;
    
    // Approach 1: Try direct endpoint with JSON
    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/admin/direct-vehicle-create.php`, 
        normalizedData,
        { headers: { ...getBypassHeaders(), 'Content-Type': 'application/json' } }
      );
      
      responseData = response.data;
      console.log('Vehicle creation response from direct endpoint:', responseData);
      
      if (responseData.status === 'success' || responseData.status === 'ok') {
        success = true;
        await syncVehicleData(false); // Use false to avoid infinite refresh cycles
      }
    } catch (error) {
      console.error('Error using direct endpoint for vehicle creation:', error);
    }
    
    // Approach 2: Try standard vehicles-update endpoint
    if (!success) {
      try {
        const response = await axios.post(
          `${apiBaseUrl}/api/admin/vehicles-update.php`, 
          normalizedData,
          { headers: { ...getBypassHeaders(), 'Content-Type': 'application/json' } }
        );
        
        responseData = response.data;
        console.log('Vehicle creation response from standard endpoint:', responseData);
        
        if (responseData.status === 'success' || responseData.status === 'ok') {
          success = true;
          await syncVehicleData(false); // Use false to avoid infinite refresh cycles
        }
      } catch (error) {
        console.error('Error using standard endpoint for vehicle creation:', error);
      }
    }
    
    // Approach 3: Try using PHP vehicles.php endpoint
    if (!success) {
      try {
        const response = await axios.post(
          `${apiBaseUrl}/api/fares/vehicles.php`, 
          normalizedData,
          { headers: { ...getBypassHeaders(), 'Content-Type': 'application/json' } }
        );
        
        responseData = response.data;
        console.log('Vehicle creation response from PHP vehicles endpoint:', responseData);
        
        if (responseData.status === 'success' || responseData.status === 'ok') {
          success = true;
          await syncVehicleData(false); // Use false to avoid infinite refresh cycles
        }
      } catch (error) {
        console.error('Error using PHP vehicles endpoint for vehicle creation:', error);
      }
    }
    
    // Approach 4: Try FormData as last resort
    if (!success) {
      try {
        const formData = new FormData();
        Object.entries(normalizedData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        const response = await axios.post(
          `${apiBaseUrl}/api/admin/vehicles-update.php`, 
          formData,
          { headers: getBypassHeaders() }
        );
        
        responseData = response.data;
        console.log('Vehicle creation response using FormData:', responseData);
        
        if (responseData.status === 'success' || responseData.status === 'ok') {
          success = true;
          await syncVehicleData(false); // Use false to avoid infinite refresh cycles
        }
      } catch (error) {
        console.error('Error using FormData for vehicle creation:', error);
      }
    }
    
    // If vehicle was created successfully, update local cache
    if (success) {
      try {
        // Save to localStorage as fallback
        const existingVehicles = localStorage.getItem('cachedVehicles');
        let vehicles: CabType[] = [];
        
        if (existingVehicles) {
          vehicles = JSON.parse(existingVehicles);
        }
        
        // Check if vehicle already exists by ID
        const existingIndex = vehicles.findIndex(v => 
          v.id === vehicleId || 
          v.id === normalizedData.vehicleId
        );
        
        // Create a proper CabType object
        const newVehicle: CabType = {
          id: vehicleId,
          vehicleId: vehicleId,
          name: normalizedData.name || vehicleId,
          capacity: parseInt(normalizedData.capacity) || 4,
          luggageCapacity: parseInt(normalizedData.luggageCapacity) || 2,
          ac: true,
          isActive: true, // Using isActive property that matches CabType interface
          description: normalizedData.description || '',
          image: normalizedData.image || '',
          amenities: normalizedData.amenities || []
        };
        
        if (existingIndex >= 0) {
          // Update existing vehicle
          vehicles[existingIndex] = { ...vehicles[existingIndex], ...newVehicle };
        } else {
          // Add new vehicle
          vehicles.push(newVehicle);
        }
        
        // Save updated vehicles
        localStorage.setItem('cachedVehicles', JSON.stringify(vehicles));
        localStorage.setItem('localVehicles', JSON.stringify(vehicles));
        console.log('Updated vehicle cache in localStorage');
        
        // Clear session storage to force refresh
        sessionStorage.removeItem('cabTypes');
        sessionStorage.removeItem('cachedVehicles');
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('vehicles-updated'));
      } catch (cacheError) {
        console.error('Error updating local vehicle cache:', cacheError);
      }
    }
    
    // Return result
    if (success) {
      return { status: 'success', data: responseData };
    } else {
      throw new Error('All vehicle creation attempts failed');
    }
    
  } catch (error) {
    console.error('Vehicle creation failed:', error);
    throw error;
  }
};

/**
 * Updates an existing vehicle
 */
export const updateVehicle = async (vehicleData: any) => {
  try {
    const vehicleId = vehicleData.vehicleId || vehicleData.id;
    console.log('Updating vehicle:', vehicleId, vehicleData);
    
    // Try multiple approaches
    let success = false;
    let responseData: any = null;
    
    // Approach 1: Try direct endpoint with JSON
    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/admin/direct-vehicle-update.php`, 
        { ...vehicleData, id: vehicleId, vehicleId, vehicle_id: vehicleId },
        { headers: { ...getBypassHeaders(), 'Content-Type': 'application/json' } }
      );
      
      responseData = response.data;
      console.log('Vehicle update response from direct endpoint:', responseData);
      
      if (responseData.status === 'success' || responseData.status === 'ok') {
        success = true;
        
        // Don't trigger automatic sync to avoid refresh loops
        // Let the component decide when to refresh
      }
    } catch (error) {
      console.error('Error using direct endpoint for vehicle update:', error);
    }
    
    // Approach 2: Try standard vehicles-update endpoint
    if (!success) {
      try {
        const response = await axios.post(
          `${apiBaseUrl}/api/admin/vehicles-update.php`, 
          { ...vehicleData, id: vehicleId, vehicleId, vehicle_id: vehicleId },
          { headers: { ...getBypassHeaders(), 'Content-Type': 'application/json' } }
        );
        
        responseData = response.data;
        console.log('Vehicle update response from standard endpoint:', responseData);
        
        if (responseData.status === 'success' || responseData.status === 'ok') {
          success = true;
          
          // Don't trigger automatic sync to avoid refresh loops
          // Let the component decide when to refresh
        }
      } catch (error) {
        console.error('Error using standard endpoint for vehicle update:', error);
      }
    }
    
    // Update local cache if successful
    if (success) {
      try {
        // Update localStorage cache
        const existingVehicles = localStorage.getItem('cachedVehicles');
        
        if (existingVehicles) {
          const vehicles: CabType[] = JSON.parse(existingVehicles);
          const index = vehicles.findIndex(v => v.id === vehicleId);
          
          if (index >= 0) {
            // Update existing vehicle
            vehicles[index] = { 
              ...vehicles[index], 
              ...vehicleData,
              id: vehicleId,
              vehicleId: vehicleId 
            };
            
            localStorage.setItem('cachedVehicles', JSON.stringify(vehicles));
            console.log('Updated vehicle cache in localStorage');
          }
        }
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('vehicle-updated', {
          detail: {
            vehicleId,
            timestamp: Date.now()
          }
        }));
      } catch (cacheError) {
        console.error('Error updating local vehicle cache:', cacheError);
      }
    }
    
    // Return result
    if (success) {
      return { status: 'success', data: responseData };
    } else {
      throw new Error('All vehicle update attempts failed');
    }
    
  } catch (error) {
    console.error('Vehicle update failed:', error);
    throw error;
  }
};

/**
 * Deletes a vehicle by ID
 */
export const deleteVehicle = async (vehicleId: string) => {
  try {
    console.log('Deleting vehicle:', vehicleId);
    
    // Try multiple approaches
    let success = false;
    let responseData: any = null;
    
    // Approach 1: Try direct endpoint
    try {
      const response = await axios.delete(
        `${apiBaseUrl}/api/admin/direct-vehicle-delete.php?id=${vehicleId}`,
        { headers: getBypassHeaders() }
      );
      
      responseData = response.data;
      console.log('Vehicle deletion response from direct endpoint:', responseData);
      
      if (responseData.status === 'success') {
        success = true;
      }
    } catch (error) {
      console.error('Error using direct endpoint for vehicle deletion:', error);
    }
    
    // Approach 2: Try deletion with POST request to direct endpoint
    if (!success) {
      try {
        const response = await axios.post(
          `${apiBaseUrl}/api/admin/direct-vehicle-delete.php`,
          { id: vehicleId, vehicleId, vehicle_id: vehicleId },
          { headers: getBypassHeaders() }
        );
        
        responseData = response.data;
        console.log('Vehicle deletion response using POST to direct endpoint:', responseData);
        
        if (responseData.status === 'success') {
          success = true;
        }
      } catch (error) {
        console.error('Error using POST for vehicle deletion:', error);
      }
    }
    
    // Update local cache if successful
    if (success) {
      try {
        // Update localStorage cache
        const existingVehicles = localStorage.getItem('cachedVehicles');
        
        if (existingVehicles) {
          const vehicles: CabType[] = JSON.parse(existingVehicles);
          const filteredVehicles = vehicles.filter(v => v.id !== vehicleId);
          
          localStorage.setItem('cachedVehicles', JSON.stringify(filteredVehicles));
          console.log('Updated vehicle cache in localStorage after deletion');
        }
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('vehicle-deleted', {
          detail: {
            vehicleId,
            timestamp: Date.now()
          }
        }));
      } catch (cacheError) {
        console.error('Error updating local vehicle cache after deletion:', cacheError);
      }
    }
    
    // Return result
    if (success) {
      return { status: 'success', data: responseData };
    } else {
      throw new Error('All vehicle deletion attempts failed');
    }
    
  } catch (error) {
    console.error('Vehicle deletion failed:', error);
    throw error;
  }
};

/**
 * Updates vehicle fares
 */
export const updateVehicleFares = async (vehicleId: string, fareData: any) => {
  try {
    console.log('Updating fares for vehicle:', vehicleId, fareData);
    
    const endpoint = `${apiBaseUrl}/api/admin/vehicle-fares-update.php`;
    
    const response = await axios.post(
      endpoint,
      { ...fareData, vehicleId, id: vehicleId },
      { headers: getBypassHeaders() }
    );
    
    console.log('Fare update response:', response.data);
    
    if (response.data.status === 'success' || response.data.status === 'ok') {
      // Dispatch appropriate event based on fare type
      if (fareData.tripType === 'local' || fareData.packagePrices) {
        window.dispatchEvent(new CustomEvent('local-fares-updated', {
          detail: {
            vehicleId,
            prices: fareData.packagePrices,
            timestamp: Date.now()
          }
        }));
      } 
      else if (fareData.tripType === 'airport' || fareData.baseFare !== undefined) {
        window.dispatchEvent(new CustomEvent('airport-fares-updated', {
          detail: {
            vehicleId,
            fares: fareData,
            timestamp: Date.now()
          }
        }));
      } 
      else {
        window.dispatchEvent(new CustomEvent('trip-fares-updated', {
          detail: {
            vehicleId,
            fares: fareData,
            timestamp: Date.now()
          }
        }));
      }
      
      return { status: 'success', data: response.data };
    } else {
      throw new Error(response.data.message || 'Failed to update fares');
    }
    
  } catch (error) {
    console.error('Error updating vehicle fares:', error);
    throw error;
  }
};

/**
 * Syncs vehicle data with the server
 */
export const syncVehicleData = async (forceRefresh: boolean = false): Promise<{ success: boolean, vehicleCount: number, alreadyInProgress?: boolean }> => {
  // Use a localStorage flag to prevent multiple syncs
  const syncKey = 'vehicleSyncInProgress';
  
  if (localStorage.getItem(syncKey) === 'true' && !forceRefresh) {
    console.log('Vehicle sync already in progress, skipping');
    return { success: false, vehicleCount: 0, alreadyInProgress: true };
  }
  
  try {
    localStorage.setItem(syncKey, 'true');
    console.log('Starting vehicle data sync');
    
    // Dispatch event to notify sync has started
    window.dispatchEvent(new CustomEvent('vehicle-sync-started', {
      detail: { timestamp: Date.now() }
    }));
    
    // Use appropriate endpoint based on server config
    const endpoint = `${apiBaseUrl}/api/admin/sync-vehicles.php?t=${Date.now()}`;
    
    const response = await axios.get(endpoint, {
      headers: {
        ...getBypassHeaders(),
        'Cache-Control': 'no-cache',
        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
      }
    });
    
    console.log('Vehicle sync response:', response.data);
    
    // Sleep for a moment to allow server to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reload cab types without forcing refresh to avoid loops
    await new Promise<void>((resolve, reject) => {
      // Set a timeout to handle hanging requests
      const timeoutId = setTimeout(() => {
        console.warn('Timeout during reloadCabTypes, continuing anyway');
        resolve();
      }, 5000);
      
      // Try to reload cab types
      try {
        // Use import to get the fresh function
        import('@/lib/cabData').then(module => {
          module.reloadCabTypes(false)
            .then(() => {
              clearTimeout(timeoutId);
              resolve();
            })
            .catch(error => {
              console.error('Error in reloadCabTypes:', error);
              clearTimeout(timeoutId);
              resolve(); // Continue even if there's an error
            });
        }).catch(error => {
          console.error('Error importing cabData module:', error);
          clearTimeout(timeoutId);
          resolve(); // Continue even if there's an error
        });
      } catch (error) {
        console.error('Error during reloadCabTypes:', error);
        clearTimeout(timeoutId);
        resolve(); // Continue even if there's an error
      }
    });
    
    // Dispatch event to notify sync has completed
    window.dispatchEvent(new CustomEvent('vehicle-sync-completed', {
      detail: { 
        success: true,
        vehicleCount: response.data.count || 0,
        timestamp: Date.now()
      }
    }));
    
    // Remove the in-progress flag
    localStorage.removeItem(syncKey);
    
    return { 
      success: true, 
      vehicleCount: response.data.count || 0
    };
  } catch (error) {
    console.error('Error syncing vehicle data:', error);
    
    // Dispatch event to notify sync has failed
    window.dispatchEvent(new CustomEvent('vehicle-sync-failed', {
      detail: { 
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      }
    }));
    
    // Remove the in-progress flag
    localStorage.removeItem(syncKey);
    
    return { 
      success: false, 
      vehicleCount: 0 
    };
  }
};
