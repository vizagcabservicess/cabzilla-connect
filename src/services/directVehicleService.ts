
import { CabType } from '@/types/cab';
import { clearCabTypesCache } from '@/lib/cabData';

// Track in-progress requests
let isSyncingVehicleData = false;

/**
 * Create a new vehicle
 * @param vehicleData Vehicle data to create
 * @returns Result of the operation
 */
export async function createVehicle(vehicleData: CabType) {
  try {
    // Make sure we have required fields
    if (!vehicleData.name || !vehicleData.id) {
      throw new Error('Vehicle name and ID are required');
    }
    
    // Prepare data for API
    const apiData = {
      ...vehicleData,
      vehicleId: vehicleData.id,
      isActive: vehicleData.isActive !== false ? 1 : 0,
      ac: vehicleData.ac !== false ? 1 : 0,
      amenities: JSON.stringify(vehicleData.amenities || ['AC']),
    };
    
    // Use FormData for better compatibility with PHP backend
    const formData = new FormData();
    Object.entries(apiData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    
    // Send to API
    const response = await fetch('/api/admin/direct-vehicle-update.php', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: {
        vehicleId: vehicleData.id,
        timestamp: Date.now(),
      },
    }));
    
    // Clear cache
    clearCabTypesCache();
    
    return result;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error creating vehicle',
    };
  }
}

/**
 * Update an existing vehicle
 * @param vehicleData Vehicle data to update
 * @returns Result of the operation
 */
export async function updateVehicle(vehicleData: CabType) {
  try {
    // Make sure we have an ID
    if (!vehicleData.id) {
      throw new Error('Vehicle ID is required');
    }
    
    // Prepare data for API
    const apiData = {
      ...vehicleData,
      vehicleId: vehicleData.id,
      id: vehicleData.id,
      isActive: vehicleData.isActive !== false ? 1 : 0,
      ac: vehicleData.ac !== false ? 1 : 0,
      amenities: JSON.stringify(vehicleData.amenities || ['AC']),
    };
    
    // Use FormData for better compatibility with PHP backend
    const formData = new FormData();
    Object.entries(apiData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    
    // Send to API
    const response = await fetch('/api/admin/direct-vehicle-update.php', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: {
        vehicleId: vehicleData.id,
        timestamp: Date.now(),
      },
    }));
    
    // Clear cache
    clearCabTypesCache();
    
    return result;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error updating vehicle',
    };
  }
}

/**
 * Delete a vehicle
 * @param vehicleId ID of the vehicle to delete
 * @returns Result of the operation
 */
export async function deleteVehicle(vehicleId: string) {
  try {
    // API endpoint with query parameter
    const url = `/api/fares/vehicles.php?vehicleId=${encodeURIComponent(vehicleId)}`;
    
    // Send DELETE request
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: {
        vehicleId,
        timestamp: Date.now(),
      },
    }));
    
    // Clear cache
    clearCabTypesCache();
    
    return result;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error deleting vehicle',
    };
  }
}

/**
 * Update pricing data for a vehicle
 * @param vehicleData Vehicle data with pricing to update
 * @returns Result of the operation
 */
export async function updateVehicleFares(vehicleData: CabType) {
  try {
    // Prepare data for API
    const apiData = {
      vehicleId: vehicleData.id,
      basePrice: vehicleData.basePrice || 0,
      pricePerKm: vehicleData.pricePerKm || 0,
      nightHaltCharge: vehicleData.nightHaltCharge || 0,
      driverAllowance: vehicleData.driverAllowance || 0,
    };
    
    // Send to pricing update API
    const response = await fetch('/api/fares/vehicles.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: {
        vehicleId: vehicleData.id,
        timestamp: Date.now(),
      },
    }));
    
    // Clear cache
    clearCabTypesCache();
    
    return result;
  } catch (error) {
    console.error('Error updating vehicle fares:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error updating vehicle fares',
    };
  }
}

/**
 * Sync vehicle data from the server
 * @param forceRefresh Force a refresh of the data
 * @returns Result with status and vehicle count
 */
export async function syncVehicleData(forceRefresh = false) {
  // Prevent concurrent syncs
  if (isSyncingVehicleData) {
    return {
      success: false,
      alreadyInProgress: true,
      message: 'Vehicle data sync already in progress',
    };
  }
  
  isSyncingVehicleData = true;
  
  try {
    // Build cache busting parameter
    const cacheBuster = `_t=${Date.now()}`;
    const forceParam = forceRefresh ? '&force=true' : '';
    
    // Try both endpoints
    const endpoints = [
      `/api/fares/vehicles-data.php?${cacheBuster}${forceParam}&includeInactive=true`,
      `/api/fares/vehicles.php?${cacheBuster}${forceParam}&includeInactive=true`,
    ];
    
    let vehicles: CabType[] = [];
    
    // Try each endpoint until we get a valid response
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          console.warn(`Endpoint ${endpoint} responded with status ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data && data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          vehicles = data.vehicles;
          console.log(`Successfully fetched ${vehicles.length} vehicles from ${endpoint}`);
          break;
        } else {
          console.warn(`No valid vehicles in response from ${endpoint}`);
        }
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
      }
    }
    
    if (vehicles.length === 0) {
      return {
        success: false,
        message: 'No vehicles returned from any endpoint',
        vehicleCount: 0,
      };
    }
    
    // Cache the vehicles
    localStorage.setItem('cachedVehicles', JSON.stringify(vehicles));
    localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
    
    // Clear the main cache to force reload
    clearCabTypesCache();
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('vehicles-updated', {
      detail: {
        timestamp: Date.now(),
      },
    }));
    
    return {
      success: true,
      message: `Successfully synced ${vehicles.length} vehicles`,
      vehicleCount: vehicles.length,
    };
  } catch (error) {
    console.error('Error syncing vehicle data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error syncing vehicle data',
      vehicleCount: 0,
    };
  } finally {
    isSyncingVehicleData = false;
  }
}
