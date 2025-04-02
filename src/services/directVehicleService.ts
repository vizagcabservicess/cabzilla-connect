
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { CabType } from '@/types/cab';
import { directVehicleOperation } from '@/utils/apiHelper';

const defaultHeaders = {
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

const pendingRequests: Record<string, Promise<any>> = {};

/**
 * Get all vehicles from the API with optional caching
 */
export const getVehicles = async (
  forceRefresh = false,
  includeInactive = false,
  isAdminMode = false
): Promise<CabType[]> => {
  const requestKey = `getVehicles-${forceRefresh}-${includeInactive}-${isAdminMode}`;
  
  if (pendingRequests[requestKey]) {
    console.log('Returning existing pending request for', requestKey);
    try {
      return await pendingRequests[requestKey];
    } catch (error) {
      console.error('Pending request failed:', error);
    }
  }
  
  const request = new Promise<CabType[]>(async (resolve, reject) => {
    try {
      console.log(`getVehicleData called with forceRefresh=${forceRefresh}, includeInactive=${includeInactive}`);
      
      const timestamp = Date.now();
      const url = `${apiBaseUrl}/api/admin/get-vehicles.php?_t=${timestamp}&includeInactive=${includeInactive ? 'true' : 'false'}`;
      
      console.log('API request to:', url);
      console.log('Fetching vehicle data from API:', url);
      
      const headers: Record<string, string> = {
        ...defaultHeaders,
        'X-Admin-Mode': isAdminMode ? 'true' : 'false'
      };
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to load vehicle data');
      }
      
      if (!data.vehicles || !Array.isArray(data.vehicles)) {
        console.warn('No vehicles array in response:', data);
        resolve([]);
        return;
      }
      
      console.log(`Received ${data.vehicles.length} vehicles from API`);
      
      const vehicles = data.vehicles.map((vehicle: any) => {
        console.log(`Processing vehicle ${vehicle.id || vehicle.vehicleId}: capacity=${vehicle.capacity}->${Number(vehicle.capacity) || 4}, luggage=${vehicle.luggage_capacity}->${Number(vehicle.luggage_capacity) || 2}`);
        
        return {
          id: vehicle.id || vehicle.vehicleId || vehicle.vehicle_id,
          vehicleId: vehicle.id || vehicle.vehicleId || vehicle.vehicle_id,
          name: vehicle.name || '',
          capacity: Number(vehicle.capacity) || 4,
          luggageCapacity: Number(vehicle.luggage_capacity) || 2,
          ac: vehicle.ac !== false && vehicle.ac !== 0,
          isActive: vehicle.is_active !== false && vehicle.is_active !== 0 && vehicle.isActive !== false,
          image: vehicle.image || '/cars/sedan.png',
          amenities: vehicle.amenities || [],
          description: vehicle.description || '',
          basePrice: Number(vehicle.base_price || vehicle.basePrice || vehicle.price || 0),
          price: Number(vehicle.price || vehicle.base_price || vehicle.basePrice || 0),
          pricePerKm: Number(vehicle.price_per_km || vehicle.pricePerKm || 0),
          nightHaltCharge: Number(vehicle.night_halt_charge || vehicle.nightHaltCharge || 700),
          driverAllowance: Number(vehicle.driver_allowance || vehicle.driverAllowance || 250),
          outstation: vehicle.outstation || {},
          local: vehicle.local || {},
          airport: vehicle.airport || {}
        };
      });
      
      console.log(`Successfully loaded ${vehicles.length} vehicles from primary API`);
      console.log('Refreshed and cached', vehicles.length, 'vehicles');
      resolve(vehicles);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      reject(error);
    } finally {
      setTimeout(() => {
        delete pendingRequests[requestKey];
      }, 1000);
    }
  });
  
  pendingRequests[requestKey] = request;
  
  return request;
};

/**
 * Get a vehicle by ID
 */
export const getVehicle = async (id: string): Promise<CabType | null> => {
  try {
    const vehicles = await getVehicles(false, true, true);
    const vehicle = vehicles.find(v => v.id === id || v.vehicleId === id);
    
    if (vehicle) {
      return vehicle;
    }
    
    const response = await directVehicleOperation('/api/admin/get-vehicle.php', 'GET', { id });
    
    if (response && response.status === 'success' && response.vehicle) {
      return response.vehicle;
    }
    
    return null;
  } catch (error: any) {
    console.error(`Error getting vehicle ${id}:`, error);
    return null;
  }
};

/**
 * Update a vehicle
 */
export const updateVehicle = async (vehicleData: CabType): Promise<any> => {
  try {
    console.log('Updating vehicle:', vehicleData);
    
    const normalizedData = {
      id: vehicleData.id,
      vehicleId: vehicleData.id,
      vehicle_id: vehicleData.id,
      name: vehicleData.name,
      capacity: Number(vehicleData.capacity),
      luggage_capacity: Number(vehicleData.luggageCapacity),
      luggageCapacity: Number(vehicleData.luggageCapacity),
      ac: vehicleData.ac,
      isActive: vehicleData.isActive,
      is_active: vehicleData.isActive,
      image: vehicleData.image,
      amenities: vehicleData.amenities,
      description: vehicleData.description,
      basePrice: Number(vehicleData.basePrice),
      base_price: Number(vehicleData.basePrice),
      price: Number(vehicleData.basePrice),
      pricePerKm: Number(vehicleData.pricePerKm),
      price_per_km: Number(vehicleData.pricePerKm),
      nightHaltCharge: Number(vehicleData.nightHaltCharge),
      night_halt_charge: Number(vehicleData.nightHaltCharge),
      driverAllowance: Number(vehicleData.driverAllowance),
      driver_allowance: Number(vehicleData.driverAllowance),
    };
    
    console.log('Normalized vehicle data for update:', normalizedData);
    
    let result;
    let error;
    
    // UPDATED: Try different endpoint patterns to maximize compatibility
    const possibleEndpoints = [
      '/api/admin/update-vehicle.php',
      '/api/admin/direct-vehicle-update.php',
      '/api/admin/vehicle-update.php',
      '/api/admin/vehicles-update.php'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Attempting to update vehicle using endpoint: ${endpoint}`);
        result = await directVehicleOperation(endpoint, 'POST', normalizedData);
        
        if (result && result.status === 'success') {
          console.log(`Successfully updated vehicle using endpoint: ${endpoint}`);
          break;
        }
      } catch (err) {
        console.log(`Failed to update using ${endpoint}:`, err);
        error = err;
      }
    }
    
    if (!result || result.status !== 'success') {
      try {
        console.log('Trying fallback direct update method...');
        // Try absolute URL as a last resort
        const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-update.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify(normalizedData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        result = await response.json();
        
        if (result && result.status === 'success') {
          console.log('Fallback update method succeeded');
        } else {
          throw new Error(result?.message || 'Failed to update vehicle');
        }
      } catch (fallbackErr) {
        console.error('Fallback update also failed:', fallbackErr);
        throw error || fallbackErr;
      }
    }
    
    // Clear all pending vehicle requests to force a refresh
    Object.keys(pendingRequests).forEach(key => {
      if (key.startsWith('getVehicles-')) {
        delete pendingRequests[key];
      }
    });
    
    return result;
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    
    // Enhance error message for 404s
    if (error.message && error.message.includes('404')) {
      throw new Error(`API endpoint not found (404): The update-vehicle.php endpoint could not be found on the server. Please check your server configuration.`);
    }
    
    throw error;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (id: string): Promise<any> => {
  try {
    console.log(`Deleting vehicle ${id}`);
    
    const result = await directVehicleOperation('/api/admin/delete-vehicle.php', 'POST', { id });
    
    if (result && result.status === 'success') {
      Object.keys(pendingRequests).forEach(key => {
        if (key.startsWith('getVehicles-')) {
          delete pendingRequests[key];
        }
      });
      
      return result;
    }
    
    throw new Error(result?.message || 'Failed to delete vehicle');
  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

/**
 * Add a new vehicle with improved error handling and multiple endpoint fallback
 */
export const addVehicle = async (vehicleData: CabType): Promise<any> => {
  try {
    console.log('Adding new vehicle:', vehicleData);
    
    const normalizedData = {
      id: vehicleData.id,
      vehicleId: vehicleData.id,
      vehicle_id: vehicleData.id,
      name: vehicleData.name,
      capacity: Number(vehicleData.capacity),
      luggage_capacity: Number(vehicleData.luggageCapacity),
      luggageCapacity: Number(vehicleData.luggageCapacity),
      ac: vehicleData.ac,
      isActive: vehicleData.isActive,
      is_active: vehicleData.isActive,
      image: vehicleData.image,
      amenities: vehicleData.amenities,
      description: vehicleData.description,
      basePrice: Number(vehicleData.basePrice),
      base_price: Number(vehicleData.basePrice),
      price: Number(vehicleData.basePrice),
      pricePerKm: Number(vehicleData.pricePerKm),
      price_per_km: Number(vehicleData.pricePerKm),
      nightHaltCharge: Number(vehicleData.nightHaltCharge),
      night_halt_charge: Number(vehicleData.nightHaltCharge),
      driverAllowance: Number(vehicleData.driverAllowance),
      driver_allowance: Number(vehicleData.driverAllowance),
    };
    
    console.log('Normalized vehicle data for add:', normalizedData);
    
    // Try multiple endpoints for maximum compatibility
    const possibleEndpoints = [
      '/api/admin/add-vehicle.php',
      '/api/admin/direct-vehicle-create.php',
      '/api/admin/vehicle-create.php'
    ];
    
    let result;
    let error;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Attempting to add vehicle using endpoint: ${endpoint}`);
        result = await directVehicleOperation(endpoint, 'POST', normalizedData);
        
        if (result && result.status === 'success') {
          console.log(`Successfully added vehicle using endpoint: ${endpoint}`);
          break;
        }
      } catch (err) {
        console.log(`Failed to add using ${endpoint}:`, err);
        error = err;
      }
    }
    
    if (!result || result.status !== 'success') {
      try {
        console.log('Trying fallback direct create method...');
        // Try absolute URL as a last resort
        const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-create.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify(normalizedData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        result = await response.json();
        
        if (result && result.status === 'success') {
          console.log('Fallback create method succeeded');
        } else {
          throw new Error(result?.message || 'Failed to add vehicle');
        }
      } catch (fallbackErr) {
        console.error('Fallback create also failed:', fallbackErr);
        throw error || fallbackErr;
      }
    }
    
    // Clear all pending vehicle requests to force a refresh
    Object.keys(pendingRequests).forEach(key => {
      if (key.startsWith('getVehicles-')) {
        delete pendingRequests[key];
      }
    });
    
    return result;
  } catch (error: any) {
    console.error('Error adding vehicle:', error);
    
    // Enhance error message for 404s
    if (error.message && error.message.includes('404')) {
      throw new Error(`API endpoint not found (404): The add-vehicle.php endpoint could not be found on the server. Please check your server configuration.`);
    }
    
    throw error;
  }
};

/**
 * Create a new vehicle (alias for addVehicle for better API naming)
 */
export const createVehicle = async (vehicleData: CabType): Promise<any> => {
  try {
    console.log('Creating new vehicle:', vehicleData);
    return await addVehicle(vehicleData);
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

/**
 * Get vehicle by ID (alias for getVehicle for better API naming)
 */
export const getVehicleById = async (id: string): Promise<CabType | null> => {
  return getVehicle(id);
};

/**
 * Update vehicle fares
 */
export const updateVehicleFares = async (vehicleId: string, fareData: any): Promise<any> => {
  try {
    console.log(`Updating fares for vehicle ${vehicleId}`, fareData);
    
    const requestData = {
      vehicleId,
      ...fareData
    };
    
    const result = await directVehicleOperation('/api/admin/direct-vehicle-pricing.php', 'POST', requestData);
    
    if (result && result.status === 'success') {
      return result;
    }
    
    throw new Error(result?.message || 'Failed to update vehicle fares');
  } catch (error: any) {
    console.error('Error updating vehicle fares:', error);
    throw error;
  }
};

/**
 * Sync vehicle data with backend
 */
export const syncVehicleData = async (forceRefresh = false): Promise<CabType[]> => {
  try {
    const pendingKeys = Object.keys(pendingRequests).filter(key => key.startsWith('getVehicles-'));
    pendingKeys.forEach(key => delete pendingRequests[key]);
    
    const vehicles = await getVehicles(forceRefresh, true, true);
    
    console.log(`Synced ${vehicles.length} vehicles with backend`);
    return vehicles;
  } catch (error: any) {
    console.error('Error syncing vehicle data:', error);
    toast.error('Failed to sync vehicle data. Please try again.');
    throw error;
  }
};
