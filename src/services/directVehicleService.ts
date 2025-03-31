
import { CabType } from '@/types/cab';
import { apiBaseUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart } from '@/config/requestConfig';
import { directVehicleOperation } from '@/utils/apiHelper';

/**
 * Creates a new vehicle
 */
export const createVehicle = async (vehicleData: CabType): Promise<CabType> => {
  try {
    // Format data for multipart submission
    const formData = formatDataForMultipart(vehicleData);
    
    // Add vehicle ID with both naming conventions
    formData.append('vehicleId', vehicleData.id);
    formData.append('vehicle_id', vehicleData.id);
    
    // Add amenities with proper format if it's an array
    if (Array.isArray(vehicleData.amenities)) {
      formData.append('amenities', JSON.stringify(vehicleData.amenities));
    }
    
    // Force creation flag
    formData.append('forceCreate', 'true');
    
    // Call the API
    const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-create.php`, {
      method: 'POST',
      body: formData,
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create vehicle: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to create vehicle');
    }
    
    // Trigger event to notify components
    window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
      detail: { vehicleId: vehicleData.id, timestamp: Date.now() }
    }));

    // Also clear any cached data
    clearVehicleCache();
    
    return vehicleData;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

/**
 * Updates an existing vehicle
 */
export const updateVehicle = async (vehicleId: string, vehicleData: CabType): Promise<CabType> => {
  try {
    console.log('Updating vehicle with data:', vehicleData);
    
    // Delete any potential cache first
    clearVehicleCache();
    
    // Try multiple update methods for resilience
    const results = await Promise.allSettled([
      // Method 1: Use the directVehicleOperation helper
      directVehicleOperation<any>(
        'update',
        {
          ...vehicleData,
          id: vehicleId,
          vehicleId: vehicleId,
          vehicle_id: vehicleId,
          // Ensure booleans are handled correctly
          isActive: vehicleData.isActive === false ? false : vehicleData.isActive || true,
          is_active: vehicleData.isActive === false ? 0 : 1,
          // Ensure these fields are always strings for PHP backend
          name: vehicleData.name || '',
          // Add a force flag
          forceUpdate: true
        },
        {
          notification: true,
          localStorageFallback: true
        }
      ),
      
      // Method 2: Try using the direct update endpoint
      updateVehicleDirectly(vehicleId, vehicleData),
      
      // Method 3: Try using the vehicles-update.php alternative endpoint
      updateVehicleAlternative(vehicleId, vehicleData)
    ]);
    
    // Check if any method succeeded
    const successfulResult = results.find(r => r.status === 'fulfilled');
    
    if (!successfulResult) {
      // If all methods failed, throw the first error
      const firstRejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
      throw firstRejection.reason;
    }
    
    // Trigger multiple events to ensure all components are notified
    triggerVehicleUpdatedEvents(vehicleId);
    
    return vehicleData;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    // Try once more with a fallback approach
    try {
      console.log('Attempting fallback update method...');
      const result = await updateVehicleFallback(vehicleId, vehicleData);
      
      // Clear cache and trigger events
      clearVehicleCache();
      triggerVehicleUpdatedEvents(vehicleId);
      
      return vehicleData;
    } catch (fallbackError) {
      console.error('Fallback update also failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

/**
 * Alternative method to update vehicle using direct HTTP endpoint
 */
async function updateVehicleDirectly(vehicleId: string, vehicleData: CabType): Promise<any> {
  // Format data for multipart submission
  const formData = formatDataForMultipart(vehicleData);
  
  // Add vehicle ID with both naming conventions
  formData.append('vehicleId', vehicleId);
  formData.append('vehicle_id', vehicleId);
  formData.append('id', vehicleId);
  
  // Handle boolean isActive field properly
  if (typeof vehicleData.isActive === 'boolean') {
    formData.append('isActive', vehicleData.isActive ? '1' : '0');
    formData.append('is_active', vehicleData.isActive ? '1' : '0');
  } else {
    formData.append('isActive', vehicleData.isActive ? '1' : '0');
    formData.append('is_active', vehicleData.isActive ? '1' : '0');
  }
  
  // Add pricing data
  if (vehicleData.price || vehicleData.basePrice) {
    formData.append('price', (vehicleData.price || vehicleData.basePrice || 0).toString());
    formData.append('basePrice', (vehicleData.basePrice || vehicleData.price || 0).toString());
  }
  
  if (vehicleData.pricePerKm) {
    formData.append('pricePerKm', vehicleData.pricePerKm.toString());
  }
  
  if (vehicleData.nightHaltCharge) {
    formData.append('nightHaltCharge', vehicleData.nightHaltCharge.toString());
  }
  
  if (vehicleData.driverAllowance) {
    formData.append('driverAllowance', vehicleData.driverAllowance.toString());
  }
  
  // Add amenities with proper format
  if (Array.isArray(vehicleData.amenities)) {
    formData.append('amenities', JSON.stringify(vehicleData.amenities));
  }
  
  // Force update flag
  formData.append('forceUpdate', 'true');
  
  // Add additional headers for admin access
  const headers = {
    ...getBypassHeaders(),
    'X-Admin-Mode': 'true',
    'X-Force-Refresh': 'true'
  };
  
  // Call the API
  const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-update.php`, {
    method: 'POST',
    body: formData,
    headers
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update vehicle directly: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.status === 'error') {
    throw new Error(result.message || 'Failed to update vehicle directly');
  }
  
  return result;
}

/**
 * Alternative method to update vehicle using vehicles-update endpoint
 */
async function updateVehicleAlternative(vehicleId: string, vehicleData: CabType): Promise<any> {
  // Try using the vehicles-update.php endpoint as another alternative
  const formData = formatDataForMultipart(vehicleData);
  
  // Add vehicle ID with both naming conventions
  formData.append('vehicleId', vehicleId);
  formData.append('vehicle_id', vehicleId);
  formData.append('id', vehicleId);
  
  // Force update flag
  formData.append('forceUpdate', 'true');
  
  // Call the API
  const response = await fetch(`${apiBaseUrl}/api/admin/vehicles-update.php`, {
    method: 'POST',
    body: formData,
    headers: getBypassHeaders()
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update vehicle via alternative endpoint: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.status === 'error') {
    throw new Error(result.message || 'Failed to update vehicle via alternative endpoint');
  }
  
  return result;
}

/**
 * Last resort fallback method using JSON format
 */
async function updateVehicleFallback(vehicleId: string, vehicleData: CabType): Promise<any> {
  // Try a JSON-based update as a last resort
  const postData = {
    ...vehicleData,
    id: vehicleId,
    vehicleId: vehicleId,
    vehicle_id: vehicleId,
    isActive: vehicleData.isActive === false ? 0 : 1,
    is_active: vehicleData.isActive === false ? 0 : 1,
    forceUpdate: true
  };
  
  // Call the API with JSON data
  const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-update.php`, {
    method: 'POST',
    body: JSON.stringify(postData),
    headers: {
      ...getBypassHeaders(),
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Fallback update failed: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.status === 'error') {
    throw new Error(result.message || 'Fallback update method failed');
  }
  
  return result;
}

/**
 * Utility function to clear any cached vehicle data
 */
function clearVehicleCache() {
  // Clear local storage cache
  try {
    localStorage.removeItem('vehicleData');
    localStorage.removeItem('vehicleDataTimestamp');
    localStorage.removeItem('vehicleDataActive');
    
    // Set an invalidation marker
    localStorage.setItem('vehicleCacheInvalidated', Date.now().toString());
    
    console.log('Vehicle cache cleared');
  } catch (error) {
    console.warn('Could not clear vehicle cache:', error);
  }
  
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('vehicle-data-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
}

/**
 * Utility function to trigger multiple events for notifying components
 */
function triggerVehicleUpdatedEvents(vehicleId: string) {
  const timestamp = Date.now();
  
  // Trigger various events to ensure all components are updated
  window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
    detail: { vehicleId, timestamp }
  }));
  
  window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
    detail: { vehicleId, timestamp }
  }));
  
  window.dispatchEvent(new CustomEvent('vehicle-updated', {
    detail: { vehicleId, timestamp }
  }));
  
  window.dispatchEvent(new CustomEvent('vehicle-cache-invalidated', {
    detail: { vehicleId, timestamp }
  }));
}

/**
 * Deletes a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('forceDelete', 'true');
    
    // Call the API
    const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-delete.php`, {
      method: 'POST',
      body: formData,
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete vehicle: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to delete vehicle');
    }
    
    // Clear cache and trigger events
    clearVehicleCache();
    triggerVehicleUpdatedEvents(vehicleId);
    
    return true;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

/**
 * Updates vehicle fares
 */
export const updateVehicleFares = async (vehicleId: string, tripType: string, fareData: any): Promise<boolean> => {
  try {
    // Create form data
    const formData = formatDataForMultipart(fareData);
    
    // Add vehicle ID and trip type
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', tripType);
    formData.append('trip_type', tripType);
    
    // Force update flag
    formData.append('forceUpdate', 'true');
    
    // Select API endpoint based on trip type
    let endpoint = `${apiBaseUrl}/api/admin/direct-fare-update.php`;
    switch(tripType.toLowerCase()) {
      case 'airport':
        endpoint = `${apiBaseUrl}/api/admin/direct-airport-fares.php`;
        break;
      case 'outstation':
        endpoint = `${apiBaseUrl}/api/admin/direct-outstation-fares.php`;
        break;
      case 'local':
        endpoint = `${apiBaseUrl}/api/admin/direct-local-fares.php`;
        break;
    }
    
    // Call the API
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update fares: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to update fares');
    }
    
    // Clear cache and trigger events
    clearVehicleCache();
    
    // Trigger event to notify components
    window.dispatchEvent(new CustomEvent('fare-data-updated', {
      detail: { vehicleId, tripType, timestamp: Date.now() }
    }));
    
    return true;
  } catch (error) {
    console.error('Error updating vehicle fares:', error);
    throw error;
  }
};

/**
 * Syncs vehicle data across all tables
 */
export const syncVehicleData = async (vehicleId?: string): Promise<boolean> => {
  try {
    // Build the URL
    let url = `${apiBaseUrl}/api/admin/force-sync-outstation-fares.php?_t=${Date.now()}`;
    
    if (vehicleId) {
      url += `&vehicle_id=${vehicleId}`;
    }
    
    // Call the API
    const response = await fetch(url, {
      headers: forceRefreshHeaders
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync vehicle data: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to sync vehicle data');
    }
    
    // Clear cache and trigger events
    clearVehicleCache();
    
    // Trigger event to notify components
    window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
      detail: { vehicleId, timestamp: Date.now() }
    }));
    
    return true;
  } catch (error) {
    console.error('Error syncing vehicle data:', error);
    throw error;
  }
};

/**
 * Gets a vehicle by ID
 */
export const getVehicleById = async (vehicleId: string): Promise<CabType | null> => {
  try {
    // Build the URL
    const url = `${apiBaseUrl}/api/fares/vehicles-data.php?vehicle_id=${vehicleId}&_t=${Date.now()}`;
    
    // Call the API
    const response = await fetch(url, {
      headers: defaultHeaders
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get vehicle: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'error' || !result.vehicles || !Array.isArray(result.vehicles) || result.vehicles.length === 0) {
      return null;
    }
    
    return result.vehicles[0];
  } catch (error) {
    console.error('Error getting vehicle by ID:', error);
    return null;
  }
};
