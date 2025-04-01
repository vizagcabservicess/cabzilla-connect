import { CabType } from '@/types/cab';
import { apiBaseUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { getBypassHeaders, formatDataForMultipart } from '@/config/requestConfig';

/**
 * Creates a new vehicle
 */
export const createVehicle = async (vehicleData: CabType): Promise<CabType> => {
  try {
    console.log('Creating vehicle with data:', vehicleData);
    
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
    
    // Use expanded set of headers to help with CORS
    const headers = {
      ...getBypassHeaders(),
      'Origin': window.location.origin,
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    console.log('Submitting vehicle creation request...');
    
    // Call the API directly
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-create.php`;
    console.log(`Using create URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: headers,
      mode: 'cors',
      credentials: 'omit' // Important for CORS
    });
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.warn('Failed to parse JSON response:', e);
      if (response.ok) {
        result = { status: 'success', message: 'Vehicle created successfully but response was not valid JSON' };
      } else {
        throw new Error(`Failed to create vehicle: ${response.status} ${response.statusText}`);
      }
    }
    
    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to create vehicle');
    }
    
    // Trigger event to notify components
    window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
      detail: { vehicleId: vehicleData.id, timestamp: Date.now() }
    }));
    
    // Also write to local storage cache as fallback
    try {
      const cachedVehiclesString = localStorage.getItem('cachedVehicles');
      const cachedVehicles = cachedVehiclesString ? JSON.parse(cachedVehiclesString) : [];
      const updatedVehicles = [...cachedVehicles.filter((v: CabType) => v.id !== vehicleData.id), vehicleData];
      localStorage.setItem('cachedVehicles', JSON.stringify(updatedVehicles));
      localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
    } catch (cacheError) {
      console.warn("Could not update local cache:", cacheError);
    }
    
    return vehicleData;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    
    // Fallback - save to local storage at minimum
    try {
      const cachedVehiclesString = localStorage.getItem('cachedVehicles');
      const cachedVehicles = cachedVehiclesString ? JSON.parse(cachedVehiclesString) : [];
      const updatedVehicles = [...cachedVehicles.filter((v: CabType) => v.id !== vehicleData.id), vehicleData];
      localStorage.setItem('cachedVehicles', JSON.stringify(updatedVehicles));
      localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
      
      console.log('Added vehicle to local storage as fallback');
      
      // Still trigger the event so UI updates
      window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
        detail: { vehicleId: vehicleData.id, timestamp: Date.now(), offline: true }
      }));
      
      return vehicleData;
    } catch (localStorageError) {
      console.error('All vehicle creation methods failed:', localStorageError);
      throw error;
    }
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
    
    // Fix naming convention for pricing fields
    const basePrice = String(vehicleData.price || vehicleData.basePrice || 0);
    formData.append('base_price', basePrice);
    formData.append('basePrice', basePrice);
    formData.append('price', basePrice);
    
    const pricePerKm = String(vehicleData.pricePerKm || 0);
    formData.append('price_per_km', pricePerKm);
    formData.append('pricePerKm', pricePerKm);
    
    // Add these fields explicitly
    const nightHaltCharge = String(vehicleData.nightHaltCharge || 700);
    formData.append('night_halt_charge', nightHaltCharge);
    formData.append('nightHaltCharge', nightHaltCharge);
    
    const driverAllowance = String(vehicleData.driverAllowance || 300);
    formData.append('driver_allowance', driverAllowance);
    formData.append('driverAllowance', driverAllowance);
    
    // Force update flag
    formData.append('forceUpdate', 'true');
    formData.append('addColumnsIfMissing', 'true');
    
    console.log('Submitting vehicle update...');
    
    // Enhanced headers to help with CORS
    const headers = {
      ...getBypassHeaders(),
      'Origin': window.location.origin,
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Direct API URL without CORS proxy
    const updateUrl = `${apiBaseUrl}/api/admin/direct-vehicle-update.php`;
    console.log(`Using update URL: ${updateUrl}`);
    
    // Try the update with more debug info
    let response = null;
    let result = null;
    
    try {
      response = await fetch(updateUrl, {
        method: 'POST',
        body: formData,
        headers: headers,
        mode: 'cors',
        credentials: 'omit' // Important for CORS
      });
      
      console.log('Response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      try {
        result = JSON.parse(responseText);
        console.log('Parsed response:', result);
      } catch (e) {
        console.warn('Failed to parse JSON response:', e);
        if (response.ok) {
          result = { status: 'success', message: 'Vehicle updated successfully but response was not valid JSON' };
        } else {
          throw new Error(`Failed to update vehicle: ${response.status} ${response.statusText}`);
        }
      }
      
      if (result && result.status === 'error') {
        throw new Error(result.message || 'API returned error status');
      }
    } catch (updateError) {
      console.error('Vehicle update error:', updateError);
      
      // Update fallback - save to local storage
      try {
        const cachedVehiclesString = localStorage.getItem('cachedVehicles');
        if (cachedVehiclesString) {
          const cachedVehicles = JSON.parse(cachedVehiclesString);
          const updatedVehicles = cachedVehicles.map((vehicle: any) => 
            vehicle.id === vehicleId || vehicle.vehicleId === vehicleId ? 
              { ...vehicle, ...vehicleData, description } : 
              vehicle
          );
          
          localStorage.setItem('cachedVehicles', JSON.stringify(updatedVehicles));
          localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
          
          console.log('Updated vehicle in local storage cache as fallback');
          result = { 
            status: 'success', 
            message: 'Vehicle updated successfully (offline mode)',
            vehicleId: vehicleId,
            offline: true,
            timestamp: new Date().toISOString()
          };
        } else {
          // If no cached vehicles, create a new entry
          localStorage.setItem('cachedVehicles', JSON.stringify([{
            ...vehicleData,
            id: vehicleId,
            vehicleId: vehicleId,
            description: description
          }]));
          localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
          
          result = { 
            status: 'success', 
            message: 'Vehicle saved to local cache',
            vehicleId: vehicleId,
            offline: true,
            timestamp: new Date().toISOString()
          };
        }
      } catch (localStorageError) {
        console.error('All vehicle update methods failed:', localStorageError);
        throw new Error('All vehicle update methods failed');
      }
    }
    
    // Trigger events to ensure all UI components update
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
    
    // Dispatch all events
    for (const event of events) {
      window.dispatchEvent(event);
    }
    
    // Return the updated vehicle data
    return {
      ...vehicleData,
      id: vehicleId,
      vehicleId: vehicleId,
      description: description,
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
    
    const url = `${apiBaseUrl}/api/admin/direct-vehicle-delete.php`;
    console.log(`Using delete URL: ${url}`);
    
    // Call the API
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: getBypassHeaders(),
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      // Try alternative delete approach using GET
      const getDeleteUrl = `${apiBaseUrl}/api/admin/direct-vehicle-delete.php?vehicleId=${vehicleId}&forceDelete=true`;
      console.log(`Trying alternative delete URL: ${getDeleteUrl}`);
      
      const altResponse = await fetch(getDeleteUrl, {
        method: 'GET',
        headers: getBypassHeaders(),
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!altResponse.ok) {
        throw new Error(`Failed to delete vehicle: ${altResponse.status} ${altResponse.statusText}`);
      }
    }
    
    // Delete from local cache as fallback
    try {
      const cachedVehiclesString = localStorage.getItem('cachedVehicles');
      if (cachedVehiclesString) {
        const cachedVehicles = JSON.parse(cachedVehiclesString);
        const filteredVehicles = cachedVehicles.filter((v: CabType) => v.id !== vehicleId);
        localStorage.setItem('cachedVehicles', JSON.stringify(filteredVehicles));
        localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
      }
    } catch (e) {
      console.warn('Could not update local cache after deletion:', e);
    }
    
    // Trigger event to notify components
    window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
      detail: { vehicleId, action: 'delete', timestamp: Date.now() }
    }));
    
    return true;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    
    // Fallback: Remove from local storage at minimum
    try {
      const cachedVehiclesString = localStorage.getItem('cachedVehicles');
      if (cachedVehiclesString) {
        const cachedVehicles = JSON.parse(cachedVehiclesString);
        const filteredVehicles = cachedVehicles.filter((v: CabType) => v.id !== vehicleId);
        localStorage.setItem('cachedVehicles', JSON.stringify(filteredVehicles));
        localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
        
        // Notify UI of the change
        window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
          detail: { vehicleId, action: 'delete', timestamp: Date.now(), offline: true }
        }));
        
        return true;
      }
    } catch (localStorageError) {
      console.error('Failed to update local cache after deletion:', localStorageError);
    }
    
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
