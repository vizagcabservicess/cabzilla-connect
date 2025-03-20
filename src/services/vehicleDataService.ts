
import axios from 'axios';
import { toast } from 'sonner';
import { CabType } from '@/types/cab';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_VERSION = import.meta.env.VITE_API_VERSION || '1.0.0';

// Default vehicles as fallback
const defaultVehicles = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    price: 4200,
    pricePerKm: 14
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    price: 5400,
    pricePerKm: 18
  },
  {
    id: 'innova_crysta',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    price: 6000,
    pricePerKm: 20
  }
];

/**
 * Get all vehicle types for dropdown selection
 */
export const getVehicleTypes = async (includeInactive = false): Promise<{id: string, name: string}[]> => {
  try {
    // Force fresh load
    localStorage.removeItem('cabTypes');
    localStorage.removeItem('vehicleTypes');
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Try to get vehicle types directly from the pricing endpoint which should have all vehicles
    try {
      // First try the vehicle-pricing.php endpoint
      const endpoint = `${API_BASE_URL}/api/admin/vehicle-pricing.php?_t=${timestamp}`;
      console.log(`Attempting to load vehicles from pricing endpoint: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': API_VERSION,
          'X-Force-Refresh': 'true'
        },
        timeout: 8000
      });
      
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`Loaded ${response.data.length} vehicles from pricing endpoint`);
        
        const vehiclesList = response.data.map((vehicle: any) => ({
          id: vehicle.id || vehicle.vehicleId,
          name: vehicle.name || vehicle.vehicleType || vehicle.id || 'Unknown'
        }));
        
        return vehiclesList;
      }
    } catch (error) {
      console.error("Error loading from pricing endpoint:", error);
    }
    
    // If direct request failed, use the general vehicle data endpoint
    const vehicles = await getVehicleData(includeInactive);
    
    const vehiclesList = vehicles.map(vehicle => ({
      id: vehicle.id || vehicle.vehicleId || '', 
      name: vehicle.name || vehicle.id || 'Unknown'
    }));
    
    console.log('Available vehicle types for selection:', vehiclesList);
    
    return vehiclesList;
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    
    // Return default vehicles as last resort
    return defaultVehicles.map(vehicle => ({
      id: vehicle.id,
      name: vehicle.name || vehicle.id
    }));
  }
};

/**
 * Get all vehicle data including pricing and details
 */
export const getVehicleData = async (includeInactive = false): Promise<any[]> => {
  try {
    const timestamp = Date.now();
    const endpoint = `${API_BASE_URL}/api/admin/vehicle-pricing.php?_t=${timestamp}`;
    
    console.log(`Fetching vehicle data from: ${endpoint}`);
    
    const response = await axios.get(endpoint, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-API-Version': API_VERSION,
        'X-Force-Refresh': 'true'
      },
      timeout: 8000
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      console.log(`Retrieved ${response.data.length} vehicles`);
      
      // Filter out inactive vehicles if needed
      let vehicles = response.data;
      if (!includeInactive) {
        vehicles = vehicles.filter((v: any) => v.isActive !== false);
      }
      
      return vehicles;
    } else {
      console.warn('Received invalid vehicle data format:', response.data);
      return defaultVehicles;
    }
  } catch (error) {
    console.error('Error fetching vehicle data:', error);
    toast.error('Failed to load vehicle data');
    return defaultVehicles;
  }
};

/**
 * Update vehicle information
 */
export const updateVehicle = async (vehicleData: any): Promise<boolean> => {
  try {
    const timestamp = Date.now();
    const endpoint = `${API_BASE_URL}/api/admin/vehicle-pricing.php?_t=${timestamp}`;
    
    console.log(`Updating vehicle at: ${endpoint}`, vehicleData);
    
    const response = await axios.post(endpoint, vehicleData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-API-Version': API_VERSION,
        'X-Force-Refresh': 'true'
      }
    });
    
    if (response.status === 200) {
      console.log('Vehicle updated successfully:', response.data);
      return true;
    } else {
      console.warn('Vehicle update returned unexpected status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error updating vehicle:', error);
    toast.error('Failed to update vehicle');
    return false;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  try {
    const timestamp = Date.now();
    const endpoint = `${API_BASE_URL}/api/admin/vehicle-pricing.php?action=delete&id=${vehicleId}&_t=${timestamp}`;
    
    console.log(`Deleting vehicle at: ${endpoint}`);
    
    const response = await axios.delete(endpoint, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-API-Version': API_VERSION,
        'X-Force-Refresh': 'true'
      }
    });
    
    if (response.status === 200) {
      console.log('Vehicle deleted successfully:', response.data);
      return true;
    } else {
      console.warn('Vehicle deletion returned unexpected status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    toast.error('Failed to delete vehicle');
    return false;
  }
};
