import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { CabType } from '@/types/cab';
import { directVehicleOperation } from '@/utils/apiHelper';

// Add headers for the requests
const defaultHeaders = {
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Keep track of ongoing API calls to prevent duplicates
const pendingRequests: Record<string, Promise<any>> = {};

/**
 * Get all vehicles from the API with optional caching
 */
export const getVehicles = async (
  forceRefresh = false,
  includeInactive = false,
  isAdminMode = false
): Promise<CabType[]> => {
  // Create a request key to track duplicate calls
  const requestKey = `getVehicles-${forceRefresh}-${includeInactive}-${isAdminMode}`;
  
  // If there's already a pending request with the same parameters, return it
  if (pendingRequests[requestKey]) {
    console.log('Returning existing pending request for', requestKey);
    try {
      return await pendingRequests[requestKey];
    } catch (error) {
      // If the pending request fails, we'll try again below
      console.error('Pending request failed:', error);
    }
  }
  
  // Create a new request and store its promise
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
      
      // Use directly fetch API rather than helper function for more control
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
      
      // Process and normalize vehicle data
      const vehicles = data.vehicles.map((vehicle: any) => {
        // Add debug logging for each vehicle
        console.log(`Processing vehicle ${vehicle.id || vehicle.vehicleId}: capacity=${vehicle.capacity}->${Number(vehicle.capacity) || 4}, luggage=${vehicle.luggage_capacity}->${Number(vehicle.luggage_capacity) || 2}`);
        
        // Normalize vehicle data to ensure consistent types
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
      // Remove the pending request after it completes (success or failure)
      setTimeout(() => {
        delete pendingRequests[requestKey];
      }, 1000); // Small delay to prevent immediate duplicate calls
    }
  });
  
  // Store the promise
  pendingRequests[requestKey] = request;
  
  return request;
};

/**
 * Get a vehicle by ID
 */
export const getVehicle = async (id: string): Promise<CabType | null> => {
  try {
    // Try to get the vehicle from the cache first
    const vehicles = await getVehicles(false, true, true);
    const vehicle = vehicles.find(v => v.id === id || v.vehicleId === id);
    
    if (vehicle) {
      return vehicle;
    }
    
    // If not found, try a direct API call
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
    
    // Normalize the data before sending
    const normalizedData = {
      id: vehicleData.id,
      vehicleId: vehicleData.id, // Ensure vehicleId is same as id
      vehicle_id: vehicleData.id, // Also include for PHP backend compatibility
      name: vehicleData.name,
      capacity: Number(vehicleData.capacity),
      luggage_capacity: Number(vehicleData.luggageCapacity),
      luggageCapacity: Number(vehicleData.luggageCapacity),
      ac: vehicleData.ac,
      isActive: vehicleData.isActive,
      is_active: vehicleData.isActive, // Include both formats
      image: vehicleData.image,
      amenities: vehicleData.amenities,
      description: vehicleData.description,
      basePrice: Number(vehicleData.basePrice),
      base_price: Number(vehicleData.basePrice),
      price: Number(vehicleData.basePrice), // Keep price and basePrice in sync
      pricePerKm: Number(vehicleData.pricePerKm),
      price_per_km: Number(vehicleData.pricePerKm),
      nightHaltCharge: Number(vehicleData.nightHaltCharge),
      night_halt_charge: Number(vehicleData.nightHaltCharge),
      driverAllowance: Number(vehicleData.driverAllowance),
      driver_allowance: Number(vehicleData.driverAllowance),
    };
    
    console.log('Normalized vehicle data for update:', normalizedData);
    
    // Try the new direct update endpoint first
    const result = await directVehicleOperation('/api/admin/update-vehicle.php', 'POST', normalizedData);
    console.log('Update vehicle response:', result);
    
    // Clear any pending requests for getVehicles to force a refresh on next call
    Object.keys(pendingRequests).forEach(key => {
      if (key.startsWith('getVehicles-')) {
        delete pendingRequests[key];
      }
    });
    
    if (result && result.status === 'success') {
      console.log('Vehicle updated successfully:', result);
      return result;
    }
    
    throw new Error(result?.message || 'Failed to update vehicle');
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
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
      // Clear any pending requests for getVehicles to force a refresh on next call
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
 * Add a new vehicle
 */
export const addVehicle = async (vehicleData: CabType): Promise<any> => {
  try {
    console.log('Adding new vehicle:', vehicleData);
    
    // Normalize the data before sending
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
      price: Number(vehicleData.basePrice), // Keep price and basePrice in sync
      pricePerKm: Number(vehicleData.pricePerKm),
      price_per_km: Number(vehicleData.pricePerKm),
      nightHaltCharge: Number(vehicleData.nightHaltCharge),
      night_halt_charge: Number(vehicleData.nightHaltCharge),
      driverAllowance: Number(vehicleData.driverAllowance),
      driver_allowance: Number(vehicleData.driverAllowance),
    };
    
    console.log('Normalized vehicle data for add:', normalizedData);
    
    const result = await directVehicleOperation('/api/admin/add-vehicle.php', 'POST', normalizedData);
    
    if (result && result.status === 'success') {
      // Clear any pending requests for getVehicles to force a refresh on next call
      Object.keys(pendingRequests).forEach(key => {
        if (key.startsWith('getVehicles-')) {
          delete pendingRequests[key];
        }
      });
      
      return result;
    }
    
    throw new Error(result?.message || 'Failed to add vehicle');
  } catch (error: any) {
    console.error('Error adding vehicle:', error);
    throw error;
  }
};
