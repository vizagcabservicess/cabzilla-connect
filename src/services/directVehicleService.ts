import { toast } from "sonner";
import type { CabType } from '@/types/cab';
import { reloadCabTypes } from '@/lib/cabData';
import { makeApiRequest, directVehicleOperation } from '@/utils/apiHelper';

// Define a type for the API response to fix the 'offline' property errors
interface VehicleOperationResponse {
  status: string;
  message: string;
  vehicleId?: string;
  offline?: boolean;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Create a new vehicle using all available API endpoints and local storage fallback
 */
export const createVehicle = async (vehicleData: any): Promise<boolean> => {
  try {
    console.log('Creating vehicle with data:', vehicleData);
    
    // Normalize vehicle ID
    const vehicleId = vehicleData.vehicleId || vehicleData.id || 
                      vehicleData.name?.toLowerCase().replace(/\s+/g, '_') || 
                      `vehicle_${Date.now()}`;
    
    // Ensure all required fields are present
    const normalizedData = {
      vehicleId,
      id: vehicleId,
      name: vehicleData.name || 'New Vehicle',
      capacity: Number(vehicleData.capacity) || 4,
      luggageCapacity: Number(vehicleData.luggageCapacity) || 2,
      price: Number(vehicleData.price || vehicleData.basePrice) || 0,
      pricePerKm: Number(vehicleData.pricePerKm) || 0,
      basePrice: Number(vehicleData.price || vehicleData.basePrice) || 0,
      image: vehicleData.image || '/cars/sedan.png',
      isActive: vehicleData.isActive !== false,
      amenities: Array.isArray(vehicleData.amenities) ? vehicleData.amenities : ['AC'],
      description: vehicleData.description || `${vehicleData.name} vehicle`,
      nightHaltCharge: Number(vehicleData.nightHaltCharge) || 700,
      driverAllowance: Number(vehicleData.driverAllowance) || 250,
      ac: vehicleData.ac !== false,
      timestamp: Date.now()
    };
    
    // Use the enhanced directVehicleOperation function
    const response = await directVehicleOperation<VehicleOperationResponse>('create', normalizedData, {
      notification: true,
      localStorageFallback: true
    });
    
    console.log('Vehicle creation response:', response);
    
    // Clear any vehicle caches after creating
    localStorage.removeItem('cachedVehicles');
    sessionStorage.removeItem('cabTypes');
    
    // If this is marked as offline operation, show a custom toast
    if (response.offline) {
      toast.warning("Created vehicle in offline mode - data will be saved locally until connection is restored", {
        duration: 5000
      });
    } else {
      toast.success("Vehicle created successfully");
    }
    
    // Reload cab types to ensure new vehicle appears
    await reloadCabTypes();
    
    return true;
    
  } catch (error) {
    console.error('Error in createVehicle:', error);
    toast.error(`Failed to create vehicle: ${(error as Error).message || 'Unknown error'}`);
    return false;
  }
};

/**
 * Update an existing vehicle
 */
export const updateVehicle = async (vehicleData: any): Promise<boolean> => {
  try {
    console.log('Updating vehicle with data:', vehicleData);
    
    // Make sure we have a vehicle ID
    const vehicleId = vehicleData.vehicleId || vehicleData.id;
    if (!vehicleId) {
      throw new Error('Vehicle ID is required for updating');
    }
    
    // Add timestamp for cache busting
    const normalizedData = {
      ...vehicleData,
      timestamp: Date.now()
    };
    
    // First try the direct endpoint which is most likely to work
    try {
      const directEndpoints = [
        '/api/admin/direct-vehicle-update.php',
        '/api/direct-vehicle-update',
        '/api/admin/direct-vehicle-update'
      ];
      
      const directResponse = await makeApiRequest<VehicleOperationResponse>(directEndpoints, 'POST', normalizedData, {
        contentTypes: ['application/json', 'multipart/form-data'],
        retries: 2,
        notification: false
      });
      
      if (directResponse && directResponse.status === 'success') {
        console.log('Successfully updated vehicle using direct endpoint:', directResponse);
        
        // Clear vehicle caches
        localStorage.removeItem('cachedVehicles');
        sessionStorage.removeItem('cabTypes');
        
        toast.success("Vehicle updated successfully");
        
        // Reload cab types
        await reloadCabTypes();
        
        return true;
      }
    } catch (directError) {
      console.warn('Direct vehicle update failed, falling back to standard operation:', directError);
    }
    
    // Fall back to the standard operation if direct update failed
    const response = await directVehicleOperation<VehicleOperationResponse>('update', normalizedData, {
      notification: true,
      localStorageFallback: true
    });
    
    console.log('Vehicle update response:', response);
    
    // Clear any vehicle caches after updating
    localStorage.removeItem('cachedVehicles');
    sessionStorage.removeItem('cabTypes');
    
    // Show appropriate toast based on whether this was an offline operation
    if (response.offline) {
      toast.warning("Updated vehicle in offline mode - changes will be synced when connection is restored", {
        duration: 5000
      });
    } else {
      toast.success("Vehicle updated successfully");
    }
    
    // Reload cab types to ensure updated vehicle appears
    await reloadCabTypes();
    
    return true;
    
  } catch (error) {
    console.error('Error in updateVehicle:', error);
    toast.error(`Failed to update vehicle: ${(error as Error).message || 'Unknown error'}`);
    return false;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  try {
    console.log('Deleting vehicle with ID:', vehicleId);
    
    // Use the enhanced directVehicleOperation function
    const response = await directVehicleOperation<VehicleOperationResponse>('delete', { vehicleId }, {
      notification: true,
      localStorageFallback: true
    });
    
    console.log('Vehicle deletion response:', response);
    
    // Clear any vehicle caches after deleting
    localStorage.removeItem('cachedVehicles');
    sessionStorage.removeItem('cabTypes');
    
    // Show appropriate toast based on whether this was an offline operation
    if (response.offline) {
      toast.warning("Deleted vehicle in offline mode - changes will be synced when connection is restored", {
        duration: 5000
      });
    } else {
      toast.success("Vehicle deleted successfully");
    }
    
    // Reload cab types to ensure deleted vehicle disappears
    await reloadCabTypes();
    
    return true;
    
  } catch (error) {
    console.error('Error in deleteVehicle:', error);
    toast.error(`Failed to delete vehicle: ${(error as Error).message || 'Unknown error'}`);
    return false;
  }
};

/**
 * Update fares for a vehicle
 */
export const updateVehicleFares = async (vehicleId: string, fareData: any, tripType: string = 'outstation'): Promise<boolean> => {
  try {
    console.log(`Updating ${tripType} fares for vehicle ${vehicleId}:`, fareData);
    
    // Determine endpoint based on trip type
    const endpoints = [
      `/api/admin/direct-fare-update.php?tripType=${tripType}`,
      `/api/admin/vehicle-fares-update.php?tripType=${tripType}`,
      `/api/fares/vehicle-fares.php?tripType=${tripType}`
    ];
    
    // Add vehicle ID to data
    const dataWithId = {
      ...fareData,
      vehicleId,
      tripType,
      timestamp: Date.now()
    };
    
    // Make the API request
    await makeApiRequest(endpoints, 'POST', dataWithId, {
      contentTypes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
      retries: 2,
      notification: true
    });
    
    // Cache fares in localStorage as fallback
    try {
      const faresCacheKey = `vehicle_fares_${vehicleId}`;
      const existingFares = JSON.parse(localStorage.getItem(faresCacheKey) || '{}');
      
      localStorage.setItem(faresCacheKey, JSON.stringify({
        ...existingFares,
        [tripType]: {
          ...fareData,
          updatedAt: new Date().toISOString()
        }
      }));
      
      console.log(`Cached ${tripType} fares for vehicle ${vehicleId} in localStorage`);
    } catch (e) {
      console.error('Error caching fares in localStorage:', e);
    }
    
    // Clear fare caches
    localStorage.removeItem('cachedFares');
    sessionStorage.removeItem('fareCache');
    
    // Trigger refresh event
    window.dispatchEvent(new CustomEvent('fares-data-changed', {
      detail: { 
        vehicleId,
        tripType,
        timestamp: Date.now()
      }
    }));
    
    toast.success(`${tripType.charAt(0).toUpperCase() + tripType.slice(1)} fares updated successfully`);
    return true;
    
  } catch (error) {
    console.error(`Error updating ${tripType} fares:`, error);
    
    // Try to save to localStorage as fallback
    try {
      const faresCacheKey = `vehicle_fares_${vehicleId}`;
      const existingFares = JSON.parse(localStorage.getItem(faresCacheKey) || '{}');
      
      localStorage.setItem(faresCacheKey, JSON.stringify({
        ...existingFares,
        [tripType]: {
          ...fareData,
          updatedAt: new Date().toISOString(),
          offline: true
        }
      }));
      
      console.log(`Saved ${tripType} fares for vehicle ${vehicleId} in offline mode`);
      toast.warning(`Saved ${tripType} fares in offline mode - will be synced when connection is restored`, {
        duration: 5000
      });
      
      // Still trigger the refresh event
      window.dispatchEvent(new CustomEvent('fares-data-changed', {
        detail: { 
          vehicleId,
          tripType,
          timestamp: Date.now(),
          offline: true
        }
      }));
      
      return true;
    } catch (e) {
      console.error('Error saving fares in offline mode:', e);
    }
    
    toast.error(`Failed to update ${tripType} fares: ${(error as Error).message || 'Unknown error'}`);
    return false;
  }
};
