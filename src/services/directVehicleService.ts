
import { CabType } from '@/types/cab';
import { apiBaseUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart } from '@/config/requestConfig';

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
    
    // Create form data manually to ensure correct formatting for PHP backends
    const formData = new FormData();
    
    // Add vehicle ID with multiple naming conventions to ensure backend compatibility
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('id', vehicleId);
    
    // Add basic vehicle info
    formData.append('name', vehicleData.name || '');
    formData.append('capacity', String(vehicleData.capacity || 4));
    formData.append('luggageCapacity', String(vehicleData.luggageCapacity || 2));
    
    // Handle isActive properly - this was causing issues before
    // Convert boolean to string "0" or "1" for PHP compatibility
    const isActive = vehicleData.isActive === false ? '0' : '1';
    formData.append('isActive', isActive);
    formData.append('is_active', isActive);
    
    // Add price information
    formData.append('price', String(vehicleData.price || 0));
    formData.append('basePrice', String(vehicleData.price || 0));
    formData.append('pricePerKm', String(vehicleData.pricePerKm || 0));
    formData.append('nightHaltCharge', String(vehicleData.nightHaltCharge || 0));
    formData.append('driverAllowance', String(vehicleData.driverAllowance || 0));
    
    // Handle image path
    formData.append('image', vehicleData.image || '/cars/sedan.png');
    
    // Add description
    formData.append('description', vehicleData.description || '');
    
    // Handle amenities explicitly - stringify arrays for PHP
    if (Array.isArray(vehicleData.amenities)) {
      formData.append('amenities', JSON.stringify(vehicleData.amenities));
    } else if (vehicleData.amenities) {
      // Handle case where amenities might be a string
      formData.append('amenities', JSON.stringify([vehicleData.amenities]));
    } else {
      formData.append('amenities', JSON.stringify([]));
    }
    
    // Force update flag to bypass some backend validations
    formData.append('forceUpdate', 'true');
    
    // Debug logging for form data
    console.log('Form data prepared for update:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    // Try multiple endpoints with robust error handling
    // First try the direct-vehicle-update.php endpoint
    let response;
    let result;
    let errorMessages = [];
    let succeeded = false;
    
    try {
      console.log('Trying primary endpoint: direct-vehicle-update.php');
      response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-update.php`, {
        method: 'POST',
        body: formData,
        headers: getBypassHeaders(),
        // Add timeout for better responsiveness
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        result = await response.json();
        if (result.status !== 'error') {
          succeeded = true;
          console.log('Update succeeded with primary endpoint', result);
        } else {
          errorMessages.push(`Primary endpoint error: ${result.message}`);
        }
      } else {
        errorMessages.push(`Primary endpoint HTTP error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Primary update endpoint error:', error);
      errorMessages.push(`Primary endpoint exception: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // If first attempt failed, try the fallback endpoint
    if (!succeeded) {
      try {
        console.log('Trying fallback endpoint: vehicles-update.php');
        response = await fetch(`${apiBaseUrl}/api/admin/vehicles-update.php`, {
          method: 'POST',
          body: formData,
          headers: getBypassHeaders(),
          // Add timeout for better responsiveness
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          result = await response.json();
          if (result.status !== 'error') {
            succeeded = true;
            console.log('Update succeeded with fallback endpoint', result);
          } else {
            errorMessages.push(`Fallback endpoint error: ${result.message}`);
          }
        } else {
          errorMessages.push(`Fallback endpoint HTTP error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Fallback update endpoint error:', error);
        errorMessages.push(`Fallback endpoint exception: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // If both attempts failed, try one more direct approach with stripped-down data
    if (!succeeded) {
      try {
        console.log('Trying final simplified approach');
        // Create a simpler form with minimal data
        const simpleForm = new FormData();
        simpleForm.append('vehicleId', vehicleId);
        simpleForm.append('name', vehicleData.name || '');
        simpleForm.append('capacity', String(vehicleData.capacity || 4));
        simpleForm.append('isActive', isActive);
        
        response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-update.php`, {
          method: 'POST',
          body: simpleForm,
          headers: getBypassHeaders()
        });
        
        if (response.ok) {
          result = await response.json();
          if (result.status !== 'error') {
            succeeded = true;
            console.log('Update succeeded with simplified approach', result);
          } else {
            errorMessages.push(`Simplified approach error: ${result.message}`);
          }
        } else {
          errorMessages.push(`Simplified approach HTTP error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Simplified approach error:', error);
        errorMessages.push(`Simplified approach exception: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // If all attempts failed, throw an error with detailed information
    if (!succeeded) {
      const errorMessage = `Failed to update vehicle after multiple attempts. Errors: ${errorMessages.join('; ')}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Trigger event to notify components
    window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
      detail: { vehicleId, timestamp: Date.now() }
    }));
    
    // Always return the updated vehicle data on success
    return vehicleData;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

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
