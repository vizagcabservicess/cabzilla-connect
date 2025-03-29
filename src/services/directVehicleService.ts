
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
      vehicle_id: vehicleId, // Add both formats for PHP
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
        await syncVehicleData(); // Sync data after successful creation
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
          await syncVehicleData(); // Sync data after successful creation
        }
      } catch (error) {
        console.error('Error using standard endpoint for vehicle creation:', error);
      }
    }
    
    // Approach 3: Try FormData as last resort
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
          await syncVehicleData(); // Sync data after successful creation
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
          is_active: true,
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
        console.log('Updated vehicle cache in localStorage');
        
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
        await syncVehicleData(); // Sync after successful update
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
          await syncVehicleData(); // Sync after successful update
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
        window.dispatchEvent(new CustomEvent('vehicles-updated'));
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
        window.dispatchEvent(new CustomEvent('vehicles-updated'));
        
        // Force sync to make sure deletion is reflected everywhere
        await syncVehicleData();
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
 * Updates fares for a specific vehicle
 */
export const updateVehicleFares = async (vehicleId: string, fareData: any, tripType: string) => {
  try {
    console.log(`Updating ${tripType} fares for vehicle ${vehicleId}:`, fareData);
    
    // Prepare data with all possible field names for PHP
    const requestData = {
      ...fareData,
      vehicleId,
      vehicle_id: vehicleId,
      tripType,
      trip_type: tripType
    };
    
    let success = false;
    let responseData: any = null;
    
    // Approach 1: Try fare-update.php endpoint
    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/admin/fare-update.php?tripType=${tripType}`,
        requestData,
        { headers: getBypassHeaders() }
      );
      
      responseData = response.data;
      console.log('Fare update response:', responseData);
      
      if (responseData.status === 'success') {
        success = true;
      }
    } catch (error) {
      console.error('Error updating fares via fare-update.php:', error);
    }
    
    // Approach 2: Try direct-fare-update endpoint
    if (!success) {
      try {
        const response = await axios.post(
          `${apiBaseUrl}/api/admin/direct-fare-update.php`,
          requestData,
          { headers: getBypassHeaders() }
        );
        
        responseData = response.data;
        console.log('Fare update response from direct endpoint:', responseData);
        
        if (responseData.status === 'success') {
          success = true;
        }
      } catch (error) {
        console.error('Error updating fares via direct-fare-update.php:', error);
      }
    }
    
    // Approach 3: Try trip-specific endpoint
    if (!success) {
      try {
        const endpoint = `${apiBaseUrl}/api/admin/${tripType}-fares-update.php`;
        
        const response = await axios.post(
          endpoint,
          requestData,
          { headers: getBypassHeaders() }
        );
        
        responseData = response.data;
        console.log(`Fare update response from ${tripType} endpoint:`, responseData);
        
        if (responseData.status === 'success') {
          success = true;
        }
      } catch (error) {
        console.error(`Error updating fares via ${tripType}-fares-update.php:`, error);
      }
    }
    
    // Update UI events
    if (success) {
      // Notify components about updated fares
      window.dispatchEvent(new CustomEvent('trip-fares-updated', {
        detail: { 
          timestamp: Date.now(), 
          vehicleId,
          tripType
        }
      }));
      
      // Clear localStorage cache to force refresh
      localStorage.removeItem('fareCache');
      localStorage.setItem('forceCacheRefresh', 'true');
    }
    
    // Return result
    if (success) {
      return { status: 'success', data: responseData };
    } else {
      throw new Error(`Failed to update ${tripType} fares for ${vehicleId}`);
    }
    
  } catch (error) {
    console.error('Fare update failed:', error);
    throw error;
  }
};

/**
 * Synchronizes vehicle data between database and JSON file
 */
export const syncVehicleData = async () => {
  try {
    console.log('Syncing vehicle data between database and JSON file...');
    
    // Try multiple approaches to ensure sync
    let success = false;

    // Approach 1: Try using the vehicles-data.php endpoint
    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/fares/vehicles-data.php?force_sync=true&_t=${Date.now()}`,
        { 
          headers: getBypassHeaders(),
          params: {
            sync: 'true',
            force_sync: 'true'
          }
        }
      );
      
      if (response.data) {
        console.log('Vehicle data sync response:', response.data);
        success = true;
      }
    } catch (error) {
      console.error('Error syncing via vehicles-data.php:', error);
    }
    
    // Approach 2: Try the direct vehicle creation endpoint with sync flag
    if (!success) {
      try {
        const response = await axios.get(
          `${apiBaseUrl}/api/admin/direct-vehicle-create.php?sync=true&_t=${Date.now()}`,
          { 
            headers: getBypassHeaders(),
            params: {
              sync: 'true'
            }
          }
        );
        
        if (response.data) {
          console.log('Vehicle data sync response from direct endpoint:', response.data);
          success = true;
        }
      } catch (error) {
        console.error('Error syncing via direct-vehicle-create.php:', error);
      }
    }
    
    // Approach 3: Try the vehicle admin endpoint
    if (!success) {
      try {
        const response = await axios.get(
          `${apiBaseUrl}/api/admin/vehicles-update.php?sync=true&_t=${Date.now()}`,
          { 
            headers: getBypassHeaders(),
            params: {
              sync: 'true'
            }
          }
        );
        
        if (response.data) {
          console.log('Vehicle data sync response from admin endpoint:', response.data);
          success = true;
        }
      } catch (error) {
        console.error('Error syncing via vehicles-update.php:', error);
      }
    }
    
    // Dispatch event to notify components about potentially new data
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: { 
        timestamp: Date.now(),
        syncSuccessful: success
      }
    }));
    
    // Clear localStorage cache to force refresh
    localStorage.removeItem('cachedVehicles');
    localStorage.setItem('forceCacheRefresh', 'true');
    
    return { success };
  } catch (error) {
    console.error('Vehicle data synchronization failed:', error);
    throw error;
  }
};
