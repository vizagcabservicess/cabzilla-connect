
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
  expiresIn: 2 * 60 * 1000, // 2 minutes cache validity (reduced for more frequent refreshes)
};

// Default vehicles as fallback
const defaultVehicles = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    price: 4200,
    pricePerKm: 14,
    nightHaltCharge: 700,
    driverAllowance: 250,
    hr8km80Price: 1800,
    hr10km100Price: 2500,
    extraKmRate: 16,
    extraHourRate: 150,
    airportFee: 200
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    price: 5400,
    pricePerKm: 18,
    nightHaltCharge: 800, 
    driverAllowance: 250,
    hr8km80Price: 2300,
    hr10km100Price: 2800,
    extraKmRate: 20,
    extraHourRate: 200,
    airportFee: 250
  },
  {
    id: 'innova_crysta',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    price: 6000,
    pricePerKm: 20,
    nightHaltCharge: 1000,
    driverAllowance: 300,
    hr8km80Price: 2600,
    hr10km100Price: 3200,
    extraKmRate: 22,
    extraHourRate: 250,
    airportFee: 300
  }
];

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Array of potential API endpoints to try
const vehicleEndpoints = [
  // Primary endpoints
  (timestamp: number) => `${API_BASE_URL}/api/admin/vehicle-pricing.php?_t=${timestamp}`,
  (timestamp: number) => `/api/admin/vehicle-pricing?_t=${timestamp}`,
  // Fallback endpoints
  (timestamp: number) => `${API_BASE_URL}/api/admin/vehicles-update.php?action=getAll&_t=${timestamp}`,
  (timestamp: number) => `/api/admin/vehicles-update?action=getAll&_t=${timestamp}`,
  (timestamp: number) => `${API_BASE_URL}/api/fares/vehicles.php?_t=${timestamp}`,
  (timestamp: number) => `/api/fares/vehicles.php?_t=${timestamp}`
];

// Helper function to attempt multiple API endpoints in sequence
const tryMultipleEndpoints = async (endpointFunctions: ((timestamp: number) => string)[]): Promise<any> => {
  const timestamp = Date.now();
  const errors: any[] = [];
  
  for (let i = 0; i < endpointFunctions.length; i++) {
    const endpoint = endpointFunctions[i](timestamp);
    console.log(`Attempting to fetch vehicles from endpoint ${i+1}/${endpointFunctions.length}: ${endpoint}`);
    
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': API_VERSION,
          'X-Force-Refresh': 'true'
        },
        timeout: 15000 // 15 seconds
      });
      
      // Check if response is valid
      if (response.status === 200) {
        // Different APIs might return data in different formats
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data?.vehicles && Array.isArray(response.data.vehicles)) {
          return response.data.vehicles;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
      }
    } catch (error) {
      console.warn(`Error fetching from endpoint ${i+1}: ${endpoint}`, error);
      errors.push(error);
      
      // Add delay before trying next endpoint
      await delay(500);
    }
  }
  
  // If we reached here, all endpoints failed
  throw new Error(`All endpoints failed. Last error: ${errors[errors.length - 1]?.message || 'Unknown error'}`);
};

/**
 * Get all vehicle types for dropdown selection
 */
export const getVehicleTypes = async (includeInactive = false): Promise<{id: string, name: string}[]> => {
  try {
    // Check cache first
    const now = Date.now();
    if (vehicleCache.data.length > 0 && now - vehicleCache.timestamp < vehicleCache.expiresIn) {
      console.log('Using cached vehicle data for types');
      const cachedVehicles = vehicleCache.data;
      return cachedVehicles.map(vehicle => ({
        id: vehicle.id || vehicle.vehicleId || '', 
        name: vehicle.name || vehicle.id || 'Unknown'
      }));
    }
    
    // Force fresh load
    localStorage.removeItem('cabTypes');
    localStorage.removeItem('vehicleTypes');
    
    // Try to get vehicle types from any endpoint that works
    try {
      const vehicles = await tryMultipleEndpoints(vehicleEndpoints);
      
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        console.log(`Retrieved ${vehicles.length} vehicles for types`);
        
        // Update cache
        vehicleCache.data = vehicles;
        vehicleCache.timestamp = now;
        
        return vehicles.map(vehicle => ({
          id: vehicle.id || vehicle.vehicleId || '', 
          name: vehicle.name || vehicle.id || 'Unknown'
        }));
      }
    } catch (error) {
      console.warn("All endpoints failed for vehicle types:", error);
    }
    
    console.warn('No data returned from any endpoint, using default vehicles');
    return defaultVehicles.map(vehicle => ({
      id: vehicle.id,
      name: vehicle.name || vehicle.id
    }));
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
      const cachedVehicles = vehicleCache.data;
      
      // Filter out inactive vehicles if needed
      if (!includeInactive) {
        return cachedVehicles.filter(v => v.isActive !== false);
      }
      
      return cachedVehicles;
    }
    
    try {
      const vehicles = await tryMultipleEndpoints(vehicleEndpoints);
      
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        console.log(`Successfully fetched ${vehicles.length} vehicles`);
        
        // Normalize all vehicles to have consistent property names
        const normalizedVehicles = vehicles.map(vehicle => ({
          id: vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || '',
          vehicleId: vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || '',
          name: vehicle.name || vehicle.vehicleName || vehicle.vehicle_name || 'Unknown',
          capacity: parseInt(vehicle.capacity || vehicle.passengerCapacity || '4'),
          luggageCapacity: parseInt(vehicle.luggageCapacity || vehicle.luggage_capacity || '2'),
          price: parseFloat(vehicle.price || vehicle.basePrice || vehicle.base_price || '0'),
          basePrice: parseFloat(vehicle.basePrice || vehicle.base_price || vehicle.price || '0'),
          pricePerKm: parseFloat(vehicle.pricePerKm || vehicle.price_per_km || '0'),
          nightHaltCharge: parseFloat(vehicle.nightHaltCharge || vehicle.night_halt_charge || '0'),
          driverAllowance: parseFloat(vehicle.driverAllowance || vehicle.driver_allowance || '0'),
          hr8km80Price: parseFloat(vehicle.hr8km80Price || vehicle.price_8hrs_80km || '0'),
          hr10km100Price: parseFloat(vehicle.hr10km100Price || vehicle.price_10hrs_100km || '0'),
          extraKmRate: parseFloat(vehicle.extraKmRate || vehicle.price_extra_km || '0'),
          extraHourRate: parseFloat(vehicle.extraHourRate || vehicle.price_extra_hour || '0'),
          airportFee: parseFloat(vehicle.airportFee || vehicle.airport_fee || '0'),
          image: vehicle.image || '',
          isActive: vehicle.isActive !== false && vehicle.is_active !== false,
          amenities: vehicle.amenities || ['AC']
        }));
        
        // Update cache
        vehicleCache.data = normalizedVehicles;
        vehicleCache.timestamp = now;
        
        // Filter out inactive vehicles if needed
        if (!includeInactive) {
          return normalizedVehicles.filter(v => v.isActive !== false);
        }
        
        return normalizedVehicles;
      }
    } catch (error) {
      console.error('All endpoints failed for vehicle data:', error);
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
    
    // Try multiple endpoints in sequence
    const endpoints = [
      `${API_BASE_URL}/api/admin/vehicle-pricing.php?_t=${timestamp}`,
      `/api/admin/vehicle-pricing?_t=${timestamp}`,
      `${API_BASE_URL}/api/fares/vehicles.php?_t=${timestamp}`,
      `/api/fares/vehicles.php?_t=${timestamp}`
    ];
    
    console.log(`Attempting to update vehicle:`, vehicleData);
    
    let success = false;
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying update at endpoint: ${endpoint}`);
        
        const response = await axios({
          method: 'POST',
          url: endpoint,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-API-Version': API_VERSION,
            'X-Force-Refresh': 'true'
          },
          data: vehicleData,
          timeout: 15000
        });
        
        if (response.status === 200) {
          console.log('Vehicle updated successfully at', endpoint);
          success = true;
          break;
        }
      } catch (error: any) {
        console.warn(`Update failed at ${endpoint}:`, error.message);
        lastError = error;
        await delay(500);
      }
    }
    
    if (success) {
      // Clear cache on successful update
      vehicleCache.data = [];
      vehicleCache.timestamp = 0;
      
      return true;
    } else {
      throw lastError || new Error('All update attempts failed');
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
    
    // Try multiple endpoints in sequence
    const endpoints = [
      `${API_BASE_URL}/api/admin/vehicle-pricing.php?action=delete&id=${vehicleId}&_t=${timestamp}`,
      `/api/admin/vehicle-pricing?action=delete&id=${vehicleId}&_t=${timestamp}`,
      `${API_BASE_URL}/api/fares/vehicles.php?vehicleId=${vehicleId}&_t=${timestamp}`,
      `/api/fares/vehicles.php?vehicleId=${vehicleId}&_t=${timestamp}`
    ];
    
    console.log(`Attempting to delete vehicle: ${vehicleId}`);
    
    let success = false;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying delete at endpoint: ${endpoint}`);
        
        const response = await axios({
          method: 'DELETE',
          url: endpoint,
          headers: {
            'Cache-Control': 'no-cache',
            'X-API-Version': API_VERSION,
            'X-Force-Refresh': 'true'
          },
          timeout: 10000
        });
        
        if (response.status === 200) {
          console.log('Vehicle deleted successfully at', endpoint);
          success = true;
          break;
        }
      } catch (error) {
        console.warn(`Delete failed at ${endpoint}:`, error);
        await delay(500);
      }
    }
    
    if (success) {
      // Clear cache on successful delete
      vehicleCache.data = [];
      vehicleCache.timestamp = 0;
      
      return true;
    } else {
      throw new Error('All delete attempts failed');
    }
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
    
    // Try multiple endpoints in sequence
    const endpoints = [
      `${API_BASE_URL}/api/admin/vehicles-update.php?_t=${timestamp}`,
      `/api/admin/vehicles-update?_t=${timestamp}`,
      `${API_BASE_URL}/api/fares/vehicles.php?_t=${timestamp}`,
      `/api/fares/vehicles.php?_t=${timestamp}`
    ];
    
    console.log(`Attempting to create vehicle:`, vehicleData);
    
    let success = false;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying create at endpoint: ${endpoint}`);
        
        const response = await axios({
          method: endpoint.includes('vehicles.php') ? 'PUT' : 'POST',
          url: endpoint,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-API-Version': API_VERSION,
            'X-Force-Refresh': 'true'
          },
          data: vehicleData,
          timeout: 15000
        });
        
        if (response.status === 200) {
          console.log('Vehicle created successfully at', endpoint);
          success = true;
          break;
        }
      } catch (error) {
        console.warn(`Create failed at ${endpoint}:`, error);
        await delay(500);
      }
    }
    
    if (success) {
      // Clear cache on successful create
      vehicleCache.data = [];
      vehicleCache.timestamp = 0;
      
      return true;
    } else {
      throw new Error('All create attempts failed');
    }
  } catch (error) {
    console.error('Error creating vehicle:', error);
    toast.error('Failed to create vehicle');
    return false;
  }
};
