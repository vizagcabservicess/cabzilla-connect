
import axios from 'axios';
import { toast } from 'sonner';
import { CabType } from '@/types/cab';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_VERSION = import.meta.env.VITE_API_VERSION || '1.0.0';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Global cache to prevent excessive API calls
const vehicleCache = {
  timestamp: 0,
  data: [] as any[],
  expiresIn: 5 * 60 * 1000, // 5 minutes cache validity
};

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

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to perform API requests with retry logic
const fetchWithRetry = async (url: string, options: any = {}, retries = MAX_RETRIES): Promise<any> => {
  try {
    console.log(`Attempting to fetch: ${url} (Attempts left: ${retries})`);
    const response = await axios(url, options);
    return response.data;
  } catch (error: any) {
    if (retries > 0 && error.response?.status >= 500) {
      console.log(`Request failed, retrying in ${RETRY_DELAY}ms... (${retries} attempts left)`);
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

/**
 * Get all vehicle types for dropdown selection
 */
export const getVehicleTypes = async (includeInactive = false): Promise<{id: string, name: string}[]> => {
  try {
    // Check cache first
    const now = Date.now();
    if (vehicleCache.data.length > 0 && now - vehicleCache.timestamp < vehicleCache.expiresIn) {
      console.log('Using cached vehicle data');
      const cachedVehicles = vehicleCache.data;
      return cachedVehicles.map(vehicle => ({
        id: vehicle.id || vehicle.vehicleId || '', 
        name: vehicle.name || vehicle.id || 'Unknown'
      }));
    }
    
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
      
      const response = await fetchWithRetry(endpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': API_VERSION,
          'X-Force-Refresh': 'true'
        },
        timeout: 12000
      });
      
      if (Array.isArray(response) && response.length > 0) {
        console.log(`Loaded ${response.length} vehicles from pricing endpoint`);
        
        // Update the cache
        vehicleCache.data = response;
        vehicleCache.timestamp = now;
        
        const vehiclesList = response.map((vehicle: any) => ({
          id: vehicle.id || vehicle.vehicleId,
          name: vehicle.name || vehicle.vehicleType || vehicle.id || 'Unknown'
        }));
        
        return vehiclesList;
      }
    } catch (error) {
      console.warn("Error loading from pricing endpoint, trying fallback:", error);
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
    // Check cache first
    const now = Date.now();
    if (vehicleCache.data.length > 0 && now - vehicleCache.timestamp < vehicleCache.expiresIn) {
      console.log('Using cached vehicle data');
      return vehicleCache.data;
    }
    
    const timestamp = Date.now();
    const endpoint = `${API_BASE_URL}/api/admin/vehicle-pricing.php?_t=${timestamp}`;
    
    console.log(`Fetching vehicle data from: ${endpoint}`);
    
    try {
      const response = await fetchWithRetry(endpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': API_VERSION,
          'X-Force-Refresh': 'true'
        },
        timeout: 12000
      });
      
      if (Array.isArray(response) && response.length > 0) {
        console.log(`Retrieved ${response.length} vehicles`);
        
        // Update cache
        vehicleCache.data = response;
        vehicleCache.timestamp = now;
        
        // Filter out inactive vehicles if needed
        let vehicles = response;
        if (!includeInactive) {
          vehicles = vehicles.filter((v: any) => v.isActive !== false);
        }
        
        return vehicles;
      }
    } catch (error) {
      console.warn('Failed to fetch from primary endpoint, trying fallback:', error);
      
      // Try fallback endpoint
      const fallbackEndpoint = `${API_BASE_URL}/api/admin/vehicles-update.php?action=getAll&_t=${timestamp}`;
      try {
        const fallbackResponse = await fetchWithRetry(fallbackEndpoint, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-API-Version': API_VERSION,
            'X-Force-Refresh': 'true'
          },
          timeout: 12000
        });
        
        if (Array.isArray(fallbackResponse) && fallbackResponse.length > 0) {
          console.log(`Retrieved ${fallbackResponse.length} vehicles from fallback`);
          
          // Update cache
          vehicleCache.data = fallbackResponse;
          vehicleCache.timestamp = now;
          
          return fallbackResponse;
        }
      } catch (fallbackError) {
        console.error('Fallback endpoint also failed:', fallbackError);
      }
    }
    
    console.warn('Received invalid vehicle data format or empty data, using defaults');
    return defaultVehicles;
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
    
    const response = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-API-Version': API_VERSION,
        'X-Force-Refresh': 'true'
      },
      data: vehicleData
    });
    
    // Clear cache on successful update
    vehicleCache.data = [];
    vehicleCache.timestamp = 0;
    
    console.log('Vehicle updated successfully:', response);
    return true;
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
    
    const response = await fetchWithRetry(endpoint, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache',
        'X-API-Version': API_VERSION,
        'X-Force-Refresh': 'true'
      }
    });
    
    // Clear cache on successful delete
    vehicleCache.data = [];
    vehicleCache.timestamp = 0;
    
    console.log('Vehicle deleted successfully:', response);
    return true;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    toast.error('Failed to delete vehicle');
    return false;
  }
};

/**
 * Create a new vehicle
 */
export const createVehicle = async (vehicleData: any): Promise<boolean> => {
  try {
    const timestamp = Date.now();
    const endpoint = `${API_BASE_URL}/api/admin/vehicles-update.php?_t=${timestamp}`;
    
    console.log(`Creating vehicle at: ${endpoint}`, vehicleData);
    
    const response = await fetchWithRetry(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-API-Version': API_VERSION,
        'X-Force-Refresh': 'true'
      },
      data: vehicleData
    });
    
    // Clear cache on successful create
    vehicleCache.data = [];
    vehicleCache.timestamp = 0;
    
    console.log('Vehicle created successfully:', response);
    return true;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    toast.error('Failed to create vehicle');
    return false;
  }
};
