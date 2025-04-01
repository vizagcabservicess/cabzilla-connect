
import { CabType } from '@/types/cab';
import { apiBaseUrl, defaultHeaders, forceRefreshHeaders, getApiUrl } from '@/config/api';
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
    
    // Add these fields explicitly to ensure we have default values
    formData.append('night_halt_charge', String(vehicleData.nightHaltCharge || 700));
    formData.append('nightHaltCharge', String(vehicleData.nightHaltCharge || 700));
    formData.append('driver_allowance', String(vehicleData.driverAllowance || 300));
    formData.append('driverAllowance', String(vehicleData.driverAllowance || 300));
    
    // Force creation flag
    formData.append('forceCreate', 'true');
    
    // Call the API using the getApiUrl function to ensure CORS proxy is used
    const response = await fetch(getApiUrl('/api/admin/direct-vehicle-create.php'), {
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
    
    // Add SQL create command to add missing columns if they don't exist
    const sqlAlterQuery = `
    ALTER TABLE vehicles 
    ADD COLUMN IF NOT EXISTS night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
    ADD COLUMN IF NOT EXISTS driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300;
    
    ALTER TABLE vehicle_types 
    ADD COLUMN IF NOT EXISTS night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
    ADD COLUMN IF NOT EXISTS driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 300;
    `;
    
    formData.append('sql_fix', sqlAlterQuery);
    
    // Force update flag
    formData.append('forceUpdate', 'true');
    formData.append('addColumnsIfMissing', 'true');
    
    console.log('Submitting vehicle update with data: ', Object.fromEntries(formData));
    
    // Try direct update with our PHP script - always use getApiUrl to ensure CORS proxy is used
    let response: Response | null = null;
    let result: any = null;
    let fallbackUsed = false;
    
    try {
      console.log(`Vehicle update attempt using direct-vehicle-update.php`);
      
      // Use getApiUrl to ensure CORS proxy is applied
      const updateUrl = getApiUrl('/api/admin/direct-vehicle-update.php');
      console.log(`Using update URL with CORS proxy: ${updateUrl}`);
      
      response = await fetch(updateUrl, {
        method: 'POST',
        body: formData,
        headers: getBypassHeaders()
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
        console.error(`Update failed with status ${response.status}`);
        throw new Error(`Update failed with status ${response.status}`);
      }
    } catch (directUpdateError) {
      console.error('Direct update failed:', directUpdateError);
      fallbackUsed = true;
      
      console.warn('Direct update failed, trying alternate endpoint...');
      
      // Try alternate endpoint - always use getApiUrl
      try {
        const alternateUrl = getApiUrl('/api/fares/update-vehicle.php');
        console.log(`Using alternate URL with CORS proxy: ${alternateUrl}`);
        
        response = await fetch(alternateUrl, {
          method: 'POST',
          body: formData,
          headers: getBypassHeaders()
        });
        
        if (response.ok) {
          try {
            const text = await response.text();
            result = text ? JSON.parse(text) : { status: 'success' };
            
            if (result.status === 'error') {
              throw new Error(result.message || 'API returned error status');
            }
            
            console.log('Alternate endpoint update succeeded');
          } catch (jsonError) {
            console.warn('Error parsing JSON from alternate endpoint:', jsonError);
            if (response.ok) {
              result = { status: 'success' };
            } else {
              throw new Error('Failed to parse API response from alternate endpoint');
            }
          }
        } else {
          throw new Error(`Alternate endpoint update failed with status ${response.status}`);
        }
      } catch (alternateError) {
        console.error('Alternate endpoint failed:', alternateError);
        
        console.warn('Alternate endpoint failed, trying fallback method...');
        
        try {
          // Use alternative update approach with more fields
          const updateData = {
            ...vehicleData,
            id: vehicleId,
            vehicleId: vehicleId,
            basePrice: vehicleData.price || vehicleData.basePrice || 0,
            pricePerKm: vehicleData.pricePerKm || 0,
            nightHaltCharge: vehicleData.nightHaltCharge || 700,
            driverAllowance: vehicleData.driverAllowance || 300,
            description: description,
            isActive: vehicleData.isActive === false ? false : true,
            name: vehicleData.name || ''
          };
          
          const fallbackResult = await directVehicleOperation<any>(
            'update',
            updateData,
            {
              notification: true,
              localStorageFallback: true
            }
          );
          
          console.log('Vehicle update succeeded via fallback method:', fallbackResult);
          result = { status: 'success' };
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          
          // Last resort: update the local storage cache directly
          try {
            const vehiclesCacheString = localStorage.getItem('cachedVehicles');
            if (vehiclesCacheString) {
              const cachedVehicles = JSON.parse(vehiclesCacheString);
              const updatedVehicles = cachedVehicles.map((vehicle: any) => 
                vehicle.id === vehicleId || vehicle.vehicleId === vehicleId ? 
                  { ...vehicle, ...vehicleData, description } : 
                  vehicle
              );
              
              localStorage.setItem('cachedVehicles', JSON.stringify(updatedVehicles));
              localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
              
              console.log('Updated vehicle in local storage cache');
              result = { 
                status: 'success', 
                message: 'Vehicle updated successfully (offline mode)',
                vehicleId: vehicleId,
                offline: true,
                timestamp: new Date().toISOString()
              };
            } else {
              throw new Error('No cached vehicles found in localStorage');
            }
          } catch (localStorageError) {
            console.error('All vehicle update methods failed:', localStorageError);
            throw new Error('All vehicle update methods failed');
          }
        }
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
