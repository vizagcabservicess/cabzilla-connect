
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
        // Don't call syncVehicleData immediately to prevent loops
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
          // Don't call syncVehicleData immediately to prevent loops
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
          // Don't call syncVehicleData immediately to prevent loops
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
          // Don't call syncVehicleData immediately to prevent loops
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
        // Don't call syncVehicleData immediately to prevent loops
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
          // Don't call syncVehicleData immediately to prevent loops
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

// Add a debounce mechanism to prevent multiple syncs
let syncTimeout: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Synchronizes vehicle data between database and JSON file
 */
export const syncVehicleData = async (forceRefresh = false) => {
  try {
    // Check if sync is already in progress
    if (isSyncing) {
      console.log('Vehicle sync already in progress, skipping duplicate request');
      return { success: false, alreadyInProgress: true };
    }
    
    // If a sync is scheduled but not yet executed, clear it
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    
    // Set debounce timeout to prevent rapid consecutive syncs
    return new Promise<{success: boolean, responseData?: any, vehicleCount: number, alreadyInProgress?: boolean}>((resolve) => {
      syncTimeout = setTimeout(async () => {
        try {
          // Set sync flag
          isSyncing = true;
          window.isSyncingVehicleData = true;
          
          console.log('Syncing vehicle data between database and JSON file with forceRefresh =', forceRefresh);
          
          // Force cache refresh
          if (forceRefresh) {
            localStorage.removeItem('cachedVehicles');
            localStorage.removeItem('fareCache');
            sessionStorage.removeItem('cabTypes');
            localStorage.setItem('forceCacheRefresh', 'true');
            console.log('Cleared all vehicle and fare caches for forced refresh');
          }
          
          // Try multiple approaches to ensure sync
          let success = false;
          let responseData = null;
          let vehicles: CabType[] = [];

          // NEW APPROACH: Try using vehicle-pricing.php endpoint first
          try {
            console.log('Attempting sync with vehicle-pricing.php endpoint (primary)');
            const response = await axios.get(
              `${apiBaseUrl}/api/admin/vehicle-pricing.php?t=${Date.now()}`,
              { 
                headers: getBypassHeaders(),
                timeout: 8000 // Add timeout to prevent hanging requests
              }
            );
            
            // Check for valid response with data array
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
              const fetchedVehiclesData = response.data.data;
              console.log('Vehicle pricing API response:', response.data);
              
              if (fetchedVehiclesData.length > 0) {
                // Transform data from pricing format to CabType format
                const transformedVehicles = fetchedVehiclesData.map((v: any) => ({
                  id: v.vehicleId || v.id,
                  vehicleId: v.vehicleId || v.id,
                  name: v.name || v.vehicle_name || v.vehicleId || v.id,
                  capacity: parseInt(v.capacity) || 4,
                  luggageCapacity: parseInt(v.luggageCapacity) || 2,
                  ac: true,
                  isActive: true,
                  description: v.description || `${v.name || v.vehicleId} vehicle`,
                  image: v.image || `/cars/${v.vehicleId || 'sedan'}.png`,
                  amenities: ['AC', 'Bottle Water', 'Music System']
                }));
                
                console.log(`Transformed ${transformedVehicles.length} vehicles from pricing API:`, 
                  transformedVehicles.map(v => ({id: v.id, name: v.name})));
                
                vehicles = transformedVehicles;
                responseData = response.data;
                success = true;
              }
            }
          } catch (error) {
            console.error('Error syncing via vehicle-pricing.php:', error);
          }

          // Approach 1: Try using the direct PHP vehicles.php endpoint if pricing API failed
          if (!success || vehicles.length === 0) {
            try {
              console.log('Attempting sync with PHP vehicles.php endpoint');
              const response = await axios.get(
                `${apiBaseUrl}/api/fares/vehicles.php?force=true&includeInactive=true&_t=${Date.now()}`,
                { 
                  headers: getBypassHeaders(),
                  params: {
                    force: 'true',
                    includeInactive: 'true'
                  },
                  timeout: 8000 // Add timeout to prevent hanging requests
                }
              );
              
              if (response.data && response.data.vehicles) {
                const fetchedVehicles = response.data.vehicles;
                console.log('Vehicle data sync response from PHP endpoint:', 
                  {count: fetchedVehicles.length, vehicles: fetchedVehicles.map((v: any) => ({id: v.id, name: v.name}))});
                
                vehicles = fetchedVehicles;
                responseData = response.data;
                success = true;
              }
            } catch (error) {
              console.error('Error syncing via PHP vehicles.php:', error);
            }
          }

          // Approach 2: Try using the vehicles-data.php endpoint if still no success
          if (!success || vehicles.length === 0) {
            try {
              console.log('Attempting sync with vehicles-data.php endpoint');
              const response = await axios.get(
                `${apiBaseUrl}/api/fares/vehicles-data.php?force_sync=true&_t=${Date.now()}`,
                { 
                  headers: getBypassHeaders(),
                  params: {
                    sync: 'true',
                    force_sync: 'true'
                  },
                  timeout: 8000 // Add timeout to prevent hanging requests
                }
              );
              
              if (response.data && response.data.vehicles) {
                const fetchedVehicles = response.data.vehicles;
                console.log('Vehicle data sync response:', 
                  {count: fetchedVehicles.length, vehicles: fetchedVehicles.map((v: any) => ({id: v.id, name: v.name}))});
                
                vehicles = fetchedVehicles;
                responseData = response.data;
                success = true;
              }
            } catch (error) {
              console.error('Error syncing via vehicles-data.php:', error);
            }
          }
          
          // Fall back to local data if all API calls fail
          if (!success || vehicles.length === 0) {
            console.log('API sync attempts failed or returned empty vehicle list, using cached data as fallback');
            
            // Check if we have cached vehicles in localStorage
            const cachedVehicles = localStorage.getItem('cachedVehicles');
            
            if (cachedVehicles) {
              try {
                const parsedVehicles = JSON.parse(cachedVehicles);
                
                if (Array.isArray(parsedVehicles) && parsedVehicles.length > 0) {
                  console.log(`Using ${parsedVehicles.length} vehicles from cache as fallback`);
                  vehicles = parsedVehicles;
                  success = true;
                }
              } catch (e) {
                console.error('Error parsing cached vehicles:', e);
              }
            }
            
            // If no cached vehicles, check local vehicles
            if (vehicles.length === 0) {
              const localVehicles = localStorage.getItem('localVehicles');
              if (localVehicles) {
                try {
                  const parsedVehicles = JSON.parse(localVehicles);
                  
                  if (Array.isArray(parsedVehicles) && parsedVehicles.length > 0) {
                    console.log(`Using ${parsedVehicles.length} vehicles from local storage as fallback`);
                    vehicles = parsedVehicles;
                    success = true;
                  }
                } catch (e) {
                  console.error('Error parsing local vehicles:', e);
                }
              }
            }
          }
          
          // Update local storage cache with the vehicles
          if (vehicles.length > 0) {
            // Clean up vehicle data to ensure it matches CabType
            const normalizedVehicles = vehicles.map(vehicle => ({
              id: vehicle.id,
              vehicleId: vehicle.vehicleId || vehicle.id,
              name: vehicle.name || vehicle.id,
              capacity: typeof vehicle.capacity === 'number' ? vehicle.capacity : parseInt(vehicle.capacity as any) || 4,
              luggageCapacity: typeof vehicle.luggageCapacity === 'number' ? vehicle.luggageCapacity : parseInt(vehicle.luggageCapacity as any) || 2,
              ac: vehicle.ac !== false,
              isActive: vehicle.isActive !== false,
              description: vehicle.description || '',
              image: vehicle.image || `/cars/sedan.png`,
              amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC']
            }));
            
            console.log('Saving normalized vehicles to localStorage:', normalizedVehicles.length);
            localStorage.setItem('cachedVehicles', JSON.stringify(normalizedVehicles));
            localStorage.setItem('localVehicles', JSON.stringify(normalizedVehicles));
            
            // NEW: Set session storage too to ensure immediate UI updates
            sessionStorage.setItem('cabTypes', JSON.stringify(normalizedVehicles));
          }
          
          // Event handling and cleanup
          if (success) {
            console.log(`Vehicle sync completed successfully with ${vehicles.length} vehicles`);
            
            // Force a refresh of vehicle fare data in other components
            window.dispatchEvent(new CustomEvent('trip-fares-updated', {
              detail: { 
                timestamp: Date.now(),
                forceRefresh: true
              }
            }));
            
            // Force a refresh of all vehicle data in components
            window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
              detail: { 
                timestamp: Date.now(),
                forceRefresh: true
              }
            }));
            
            if (forceRefresh) {
              toast.success(`Successfully synchronized ${vehicles.length} vehicles`);
            }
          } else {
            console.warn('Vehicle sync did not complete successfully');
            toast.error('Failed to sync vehicles with the server');
          }
          
          resolve({ success, responseData, vehicleCount: vehicles.length });
        } catch (error) {
          console.error('Vehicle data synchronization failed:', error);
          resolve({ success: false, vehicleCount: 0 });
        } finally {
          // Release sync flags after a short delay
          setTimeout(() => {
            isSyncing = false;
            window.isSyncingVehicleData = false;
          }, 5000);
        }
      }, 300); // 300ms debounce
    });
  } catch (error) {
    console.error('Vehicle data synchronization failed:', error);
    
    // Make sure to release sync lock even if there's an error
    setTimeout(() => {
      isSyncing = false;
      window.isSyncingVehicleData = false;
    }, 5000);
    
    throw error;
  }
};

// Add TypeScript declaration for window property
declare global {
  interface Window {
    isSyncingVehicleData?: boolean;
  }
}
