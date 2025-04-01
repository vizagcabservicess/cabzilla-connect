
import { CabType } from '@/types/cab';
import { apiBaseUrl, defaultHeaders, forceRefreshHeaders, createDirectApiUrl } from '@/config/api';
import { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart } from '@/config/requestConfig';
import { directVehicleOperation } from '@/utils/apiHelper';

// Add a flag to prevent infinite recursion
const MAX_RECURSION_DEPTH = 2;
const recursionCounters = new Map<string, number>();

// Helper function to track and check recursion depth
const checkRecursionDepth = (operationType: string): boolean => {
  const counter = recursionCounters.get(operationType) || 0;
  
  if (counter >= MAX_RECURSION_DEPTH) {
    console.warn(`Maximum recursion depth reached for ${operationType}. Aborting to prevent stack overflow.`);
    return false;
  }
  
  recursionCounters.set(operationType, counter + 1);
  return true;
};

// Helper function to reset recursion counter
const resetRecursionCounter = (operationType: string): void => {
  recursionCounters.set(operationType, 0);
};

/**
 * Creates a new vehicle
 */
export const createVehicle = async (vehicleData: CabType): Promise<CabType> => {
  // Reset recursion counter for create operation
  resetRecursionCounter('create');
  
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
    
    // Add these fields explicitly to ensure we have default values
    formData.append('night_halt_charge', String(vehicleData.nightHaltCharge || 700));
    formData.append('nightHaltCharge', String(vehicleData.nightHaltCharge || 700));
    formData.append('driver_allowance', String(vehicleData.driverAllowance || 300));
    formData.append('driverAllowance', String(vehicleData.driverAllowance || 300));
    
    // Force creation flag
    formData.append('forceCreate', 'true');
    
    // Call the API
    try {
      const response = await fetch(createDirectApiUrl('/api/admin/direct-vehicle-create.php'), {
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
    } catch (apiError) {
      console.error('Error calling API:', apiError);
      // Update local cache as fallback
      try {
        const cachedVehiclesStr = localStorage.getItem('cachedVehicles');
        if (cachedVehiclesStr) {
          const cachedVehicles = JSON.parse(cachedVehiclesStr);
          cachedVehicles.push(vehicleData);
          localStorage.setItem('cachedVehicles', JSON.stringify(cachedVehicles));
        } else {
          localStorage.setItem('cachedVehicles', JSON.stringify([vehicleData]));
        }
      } catch (cacheError) {
        console.error('Failed to update cache:', cacheError);
      }
    }
    
    // Trigger event to notify components
    window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
      detail: { vehicleId: vehicleData.id, timestamp: Date.now() }
    }));
    
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
  // Check recursion depth
  if (!checkRecursionDepth('update')) {
    // Update local cache as fallback when recursion limit reached
    try {
      const cachedVehiclesStr = localStorage.getItem('cachedVehicles');
      if (cachedVehiclesStr) {
        const cachedVehicles = JSON.parse(cachedVehiclesStr);
        const updatedVehicles = cachedVehicles.map((v: CabType) => 
          v.id === vehicleId ? {...v, ...vehicleData} : v
        );
        localStorage.setItem('cachedVehicles', JSON.stringify(updatedVehicles));
      }
      
      // Trigger event to update UI
      window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
        detail: { vehicleId, timestamp: Date.now() }
      }));
      
      return {...vehicleData, id: vehicleId, vehicleId};
    } catch (cacheError) {
      console.error('Failed to update local cache:', cacheError);
      throw new Error('Failed to update vehicle due to recursion limit');
    }
  }
  
  try {
    console.log('Updating vehicle with data:', vehicleData);
    
    // Create FormData object for multipart submission 
    const formData = new FormData();
    
    // Add all vehicle data fields with proper naming conventions
    formData.append('id', vehicleId);
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('name', vehicleData.name || '');
    formData.append('capacity', String(vehicleData.capacity || 4));
    formData.append('luggageCapacity', String(vehicleData.luggageCapacity || 2));
    formData.append('luggage_capacity', String(vehicleData.luggageCapacity || 2));
    
    // Handle boolean isActive correctly
    const isActive = vehicleData.isActive === false ? '0' : '1';
    formData.append('isActive', isActive);
    formData.append('is_active', isActive);
    
    // Add image path
    formData.append('image', vehicleData.image || '/cars/sedan.png');
    
    // Handle amenities
    if (Array.isArray(vehicleData.amenities)) {
      formData.append('amenities', JSON.stringify(vehicleData.amenities));
    } else if (vehicleData.amenities) {
      formData.append('amenities', JSON.stringify([vehicleData.amenities]));
    } else {
      formData.append('amenities', JSON.stringify(['AC', 'Bottle Water', 'Music System']));
    }
    
    // Add ac flag
    formData.append('ac', vehicleData.ac === false ? '0' : '1');
    
    // Explicitly add description - ensure it's not undefined
    const description = vehicleData.description !== undefined ? vehicleData.description : '';
    formData.append('description', description);
    
    // Fix naming convention for pricing fields to resolve "Unknown column 'base_price'" errors
    // Add both camelCase and snake_case versions to ensure compatibility
    const basePrice = String(vehicleData.price || vehicleData.basePrice || 0);
    formData.append('base_price', basePrice);
    formData.append('basePrice', basePrice);
    formData.append('price', basePrice);
    
    const pricePerKm = String(vehicleData.pricePerKm || 0);
    formData.append('price_per_km', pricePerKm);
    formData.append('pricePerKm', pricePerKm);
    
    // Add these fields explicitly to ensure database doesn't error with missing columns
    const nightHaltCharge = String(vehicleData.nightHaltCharge || 700);
    formData.append('night_halt_charge', nightHaltCharge);
    formData.append('nightHaltCharge', nightHaltCharge);
    
    const driverAllowance = String(vehicleData.driverAllowance || 300);
    formData.append('driver_allowance', driverAllowance);
    formData.append('driverAllowance', driverAllowance);
    
    // Force update flag
    formData.append('forceUpdate', 'true');
    formData.append('addColumnsIfMissing', 'true');
    
    console.log('Submitting vehicle update with data: ', Object.fromEntries(formData));
    
    // Try direct update with our PHP script with improved error handling
    let response: Response | null = null;
    let result: any = null;
    let fallbackUsed = false;
    
    try {
      console.log(`Vehicle update attempt using direct-vehicle-update.php`);
      
      response = await fetch(createDirectApiUrl('/api/admin/direct-vehicle-update.php'), {
        method: 'POST',
        body: formData,
        headers: getBypassHeaders(),
        signal: AbortSignal.timeout(15000) // 15 seconds timeout
      });
      
      if (response.ok) {
        try {
          const text = await response.text();
          result = text ? JSON.parse(text) : { status: 'success' };
          console.log('Vehicle update API response:', result);
          
          if (result.status === 'error') {
            throw new Error(result.message || 'API returned error status');
          }
          console.log('Direct vehicle update succeeded');
          
        } catch (jsonError) {
          console.warn('Error parsing JSON response:', jsonError);
          // If we can't parse but the HTTP status was OK, assume success
          if (response.ok) {
            result = { status: 'success' };
            console.log('Assuming success despite JSON parse error');
          } else {
            throw new Error('Failed to parse API response');
          }
        }
      } else {
        throw new Error(`Update failed with status ${response.status}`);
      }
    } catch (directUpdateError) {
      console.error('Direct update failed:', directUpdateError);
      fallbackUsed = true;
      
      // Update local storage as fallback
      try {
        const cachedVehiclesStr = localStorage.getItem('cachedVehicles');
        if (cachedVehiclesStr) {
          const cachedVehicles = JSON.parse(cachedVehiclesStr);
          const updatedVehicles = cachedVehicles.map((v: CabType) => 
            v.id === vehicleId ? {...v, ...vehicleData, description} : v
          );
          localStorage.setItem('cachedVehicles', JSON.stringify(updatedVehicles));
          console.log('Updated vehicle in local storage cache');
        }
      } catch (localStorageError) {
        console.error('Failed to update local storage:', localStorageError);
      }
    }
    
    // Delay to ensure backend has time to process the update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger multiple events to ensure all UI components update
    const events = [
      new CustomEvent('vehicle-data-updated', {
        detail: { vehicleId, timestamp: Date.now() }
      }),
      new CustomEvent('vehicle-data-cache-cleared', {
        detail: { timestamp: Date.now() }
      }),
      new CustomEvent('vehicle-data-refreshed', {
        detail: { vehicleId, timestamp: Date.now() }
      })
    ];
    
    // Dispatch all events with slight delays between them
    for (const event of events) {
      window.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Reset recursion counter after successful operation
    resetRecursionCounter('update');
    
    // Return the updated vehicle data with confirmed description
    return {
      ...vehicleData,
      id: vehicleId,
      vehicleId: vehicleId,
      description: description, // Ensure description is properly set
      // Make sure these fields have values
      nightHaltCharge: vehicleData.nightHaltCharge || 700,
      driverAllowance: vehicleData.driverAllowance || 300
    };
  } catch (error) {
    console.error('Error updating vehicle:', error);
    // Reset counter even on error
    resetRecursionCounter('update');
    throw error;
  }
};

/**
 * Deletes a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  // Reset recursion counter for delete operation
  resetRecursionCounter('delete');
  
  try {
    // Create form data
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('forceDelete', 'true');
    
    // Call the API
    let apiCallSuccessful = false;
    
    try {
      const response = await fetch(createDirectApiUrl('/api/admin/direct-vehicle-delete.php'), {
        method: 'POST',
        body: formData,
        headers: getBypassHeaders(),
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.status !== 'error') {
          apiCallSuccessful = true;
        }
      }
    } catch (apiError) {
      console.error('API call failed:', apiError);
    }
    
    // Update local storage regardless of API success
    try {
      const cachedVehiclesStr = localStorage.getItem('cachedVehicles');
      if (cachedVehiclesStr) {
        const cachedVehicles = JSON.parse(cachedVehiclesStr);
        const filteredVehicles = cachedVehicles.filter((v: CabType) => v.id !== vehicleId);
        localStorage.setItem('cachedVehicles', JSON.stringify(filteredVehicles));
        console.log('Removed vehicle from local storage cache');
      }
    } catch (localStorageError) {
      console.error('Failed to update local storage:', localStorageError);
    }
    
    // Trigger event to notify components
    window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
      detail: { vehicleId, action: 'delete', timestamp: Date.now() }
    }));
    
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
  // Check recursion depth for fare updates
  if (!checkRecursionDepth('updateFares')) {
    console.warn('Recursion limit reached for fare updates, returning without API call');
    return true;
  }
  
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
    let endpoint = '/api/admin/direct-fare-update.php';
    switch(tripType.toLowerCase()) {
      case 'airport':
        endpoint = '/api/admin/direct-airport-fares.php';
        break;
      case 'outstation':
        endpoint = '/api/admin/direct-outstation-fares.php';
        break;
      case 'local':
        endpoint = '/api/admin/direct-local-fares.php';
        break;
    }
    
    // Call the API with timeout
    let apiSuccess = false;
    
    try {
      const response = await fetch(createDirectApiUrl(endpoint), {
        method: 'POST',
        body: formData,
        headers: getBypassHeaders(),
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const result = await response.json();
        apiSuccess = result.status !== 'error';
      }
    } catch (apiError) {
      console.error('API call failed for fare update:', apiError);
    }
    
    // Trigger event to notify components regardless of API success
    window.dispatchEvent(new CustomEvent('fare-data-updated', {
      detail: { vehicleId, tripType, timestamp: Date.now(), apiSuccess }
    }));
    
    // Reset recursion counter
    resetRecursionCounter('updateFares');
    
    return true;
  } catch (error) {
    console.error('Error updating vehicle fares:', error);
    // Reset counter on error too
    resetRecursionCounter('updateFares');
    throw error;
  }
};

/**
 * Syncs vehicle data across all tables
 */
export const syncVehicleData = async (vehicleId?: string): Promise<boolean> => {
  // Check recursion depth
  if (!checkRecursionDepth('syncData')) {
    console.warn('Recursion limit reached for syncData, returning without API call');
    return false;
  }
  
  try {
    // Build the URL
    const url = createDirectApiUrl('/api/admin/force-sync-outstation-fares.php' + 
      (vehicleId ? `&vehicle_id=${vehicleId}` : ''));
    
    // Call the API with timeout
    let apiSuccess = false;
    
    try {
      const response = await fetch(url, {
        headers: forceRefreshHeaders,
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          apiSuccess = true;
        }
      }
    } catch (apiError) {
      console.error('API call failed for sync data:', apiError);
    }
    
    // Trigger event regardless of API success to update UI
    window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
      detail: { vehicleId, timestamp: Date.now(), apiSuccess }
    }));
    
    // Reset counter
    resetRecursionCounter('syncData');
    
    return true;
  } catch (error) {
    console.error('Error syncing vehicle data:', error);
    // Reset counter on error
    resetRecursionCounter('syncData');
    return false;
  }
};

/**
 * Gets a vehicle by ID
 */
export const getVehicleById = async (vehicleId: string): Promise<CabType | null> => {
  try {
    // First try local cache
    try {
      const cachedVehiclesStr = localStorage.getItem('cachedVehicles');
      if (cachedVehiclesStr) {
        const cachedVehicles = JSON.parse(cachedVehiclesStr);
        const foundVehicle = cachedVehicles.find((v: CabType) => v.id === vehicleId || v.vehicleId === vehicleId);
        if (foundVehicle) {
          console.log('Found vehicle in local cache:', foundVehicle);
          return foundVehicle;
        }
      }
    } catch (cacheError) {
      console.error('Error checking local cache:', cacheError);
    }
    
    // Build the URL
    const url = createDirectApiUrl(`/api/fares/vehicles-data.php?vehicle_id=${vehicleId}`);
    
    try {
      // Call the API with timeout
      const response = await fetch(url, {
        headers: defaultHeaders,
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get vehicle: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'error' || !result.vehicles || !Array.isArray(result.vehicles) || result.vehicles.length === 0) {
        return null;
      }
      
      return result.vehicles[0];
    } catch (apiError) {
      console.error('API call failed for getVehicleById:', apiError);
      
      // Try local file as fallback
      try {
        const response = await fetch('/data/vehicles.json');
        if (response.ok) {
          const vehicles = await response.json();
          return vehicles.find((v: CabType) => v.id === vehicleId || v.vehicleId === vehicleId) || null;
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error getting vehicle by ID:', error);
    return null;
  }
};
