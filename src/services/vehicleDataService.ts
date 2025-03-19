
import axios from 'axios';
import { CabType } from '@/types/cab';
import { toast } from 'sonner';

// Default fallback values in case of API failure
const defaultVehicles: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    price: 4200,
    pricePerKm: 14,
    image: '/cars/sedan.png',
    amenities: ['AC', 'Bottle Water', 'Music System'],
    description: 'Comfortable sedan suitable for 4 passengers.',
    ac: true,
    nightHaltCharge: 700,
    driverAllowance: 250,
    isActive: true
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    price: 5400,
    pricePerKm: 18,
    image: '/cars/ertiga.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
    description: 'Spacious SUV suitable for 6 passengers.',
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  },
  {
    id: 'innova_crysta',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    price: 6000,
    pricePerKm: 20,
    image: '/cars/innova.png',
    amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
    description: 'Premium SUV with ample space for 7 passengers.',
    ac: true,
    nightHaltCharge: 1000,
    driverAllowance: 250,
    isActive: true
  }
];

// Base API URL and version
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';

/**
 * Clean vehicle ID by removing prefixes if present
 */
const cleanVehicleId = (id: string | undefined): string => {
  if (!id) return '';
  
  // Remove 'item-' prefix if it exists
  if (id.startsWith('item-')) {
    return id.substring(5);
  }
  
  return id;
};

/**
 * Normalize API response to handle different formats
 */
const normalizeVehiclesData = (data: any): CabType[] => {
  if (!data) return [];
  
  let vehicles = [];
  
  // Check if the data is already an array
  if (Array.isArray(data)) {
    vehicles = data;
  }
  // Check if data.vehicles is an array
  else if (data.vehicles && Array.isArray(data.vehicles)) {
    vehicles = data.vehicles;
  }
  // Check if data.data is an array
  else if (data.data && Array.isArray(data.data)) {
    vehicles = data.data;
  }
  
  if (vehicles.length === 0) {
    console.warn('No valid vehicle data found in API response');
    return defaultVehicles;
  }
  
  // Map and normalize the vehicle data
  return vehicles.map((vehicle: any) => {
    // Extract and clean ID from various possible sources
    const vehicleId = cleanVehicleId(String(vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || vehicle.vehicleType || ''));
    
    return {
      id: vehicleId,
      name: String(vehicle.name || vehicleId || ''),
      capacity: Number(vehicle.capacity) || 4,
      luggageCapacity: Number(vehicle.luggageCapacity || vehicle.luggage_capacity) || 2,
      price: Number(vehicle.basePrice || vehicle.price || vehicle.base_price) || 0,
      pricePerKm: Number(vehicle.pricePerKm || vehicle.price_per_km) || 0,
      image: String(vehicle.image || '/cars/sedan.png'),
      amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : 
               (typeof vehicle.amenities === 'string' ? vehicle.amenities.split(',').map((a: string) => a.trim()) : ['AC']),
      description: String(vehicle.description || ''),
      ac: vehicle.ac !== undefined ? Boolean(vehicle.ac) : true,
      nightHaltCharge: Number(vehicle.nightHaltCharge || vehicle.night_halt_charge) || 0,
      driverAllowance: Number(vehicle.driverAllowance || vehicle.driver_allowance) || 0,
      isActive: vehicle.isActive !== undefined ? Boolean(vehicle.isActive) : 
              (vehicle.is_active !== undefined ? Boolean(vehicle.is_active) : true),
      basePrice: Number(vehicle.basePrice || vehicle.price || vehicle.base_price) || 0,
      vehicleId: vehicleId
    };
  });
};

/**
 * Get all vehicle data from API with multiple fallbacks
 */
export const getVehicleData = async (includeInactive: boolean = false): Promise<CabType[]> => {
  console.log('Loading vehicle data from API...');
  
  // Add cache busting timestamp
  const timestamp = Date.now();
  const cacheParam = `_t=${timestamp}`;
  
  // Try multiple API endpoints in sequence
  const endpoints = [
    // Primary endpoint
    `${apiBaseUrl}/api/fares/vehicles-data.php?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Alternate path
    `${apiBaseUrl}/api/fares/vehicles-data?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Local fallback
    `/api/fares/vehicles-data.php?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Alternate local
    `/api/fares/vehicles-data?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Direct vehicles endpoint
    `${apiBaseUrl}/api/fares/vehicles.php?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Local vehicles endpoint
    `/api/fares/vehicles.php?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Admin endpoint with debug bypass for development
    `${apiBaseUrl}/api/admin/vehicles-update.php?action=getAll&debug=true&${cacheParam}`,
    // Local admin endpoint with debug bypass for development
    `/api/admin/vehicles-update.php?action=getAll&debug=true&${cacheParam}`
  ];
  
  // Try each endpoint until one works
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to load vehicles from: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-Version': apiVersion,
          'X-Force-Refresh': 'true'
        },
        timeout: 8000 // 8 second timeout
      });
      
      if (response.status === 200 && response.data) {
        console.log('Successfully fetched vehicles from', endpoint);
        
        const normalizedVehicles = normalizeVehiclesData(response.data);
        
        // Filter active vehicles if needed
        const filteredVehicles = includeInactive ? 
          normalizedVehicles : 
          normalizedVehicles.filter(v => v.isActive !== false);
        
        if (filteredVehicles.length > 0) {
          console.log(`Successfully fetched ${filteredVehicles.length} vehicles from primary endpoint`);
          
          // Do additional logging to debug vehicle IDs
          console.log('Vehicle IDs fetched:', filteredVehicles.map(v => ({
            id: v.id,
            name: v.name,
            vehicleId: v.vehicleId
          })));
          
          return filteredVehicles;
        }
      }
      console.log('Invalid response format or empty result, trying next endpoint');
    } catch (error) {
      console.error(`Error fetching from endpoint ${endpoint}:`, error);
    }
  }
  
  // If all endpoints fail, use default vehicles
  console.warn('No vehicles found in any API response, using defaults');
  toast.warning("Using default vehicle data - API connections failed", {
    id: "vehicle-api-error",
    duration: 4000
  });
  
  return defaultVehicles;
};

/**
 * Update a vehicle in the database
 */
export const updateVehicle = async (vehicleData: any): Promise<any> => {
  try {
    console.log('Updating vehicle with data:', vehicleData);
    
    // Set the Authorization header if JWT is available in localStorage
    const authHeader: Record<string, string> = {};
    const token = localStorage.getItem('token');
    if (token) {
      authHeader.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Try multiple API endpoints in sequence
    const endpoints = [
      `${apiBaseUrl}/api/admin/vehicles-update.php?_t=${timestamp}`,
      `/api/admin/vehicles-update.php?_t=${timestamp}`
    ];
    
    let successResponse = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to update vehicle using endpoint: ${endpoint}`);
        
        const response = await axios.post(endpoint, vehicleData, {
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
            'X-API-Version': apiVersion,
            'X-Force-Refresh': 'true'
          },
          timeout: 10000 // 10 second timeout for updates
        });
        
        if (response.status === 200) {
          console.log('Vehicle updated successfully via', endpoint);
          successResponse = response.data;
          break;
        }
      } catch (error: any) {
        console.error(`Error updating vehicle at endpoint ${endpoint}:`, error.response || error);
        
        // If this is the last endpoint, rethrow the error
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw error;
        }
      }
    }
    
    if (successResponse) {
      return successResponse;
    } else {
      throw new Error('All update endpoints failed');
    }
  } catch (error: any) {
    console.error('Error updating vehicle:', error.response?.data || error);
    throw error;
  }
};

/**
 * Add a new vehicle to the database
 */
export const addVehicle = async (vehicleData: any): Promise<any> => {
  try {
    console.log('Adding new vehicle with data:', vehicleData);
    
    // Set the Authorization header if JWT is available in localStorage
    const authHeader: Record<string, string> = {};
    const token = localStorage.getItem('token');
    if (token) {
      authHeader.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Try multiple API endpoints in sequence
    const endpoints = [
      `${apiBaseUrl}/api/admin/vehicles-update.php?_t=${timestamp}`,
      `/api/admin/vehicles-update.php?_t=${timestamp}`
    ];
    
    let successResponse = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to add vehicle using endpoint: ${endpoint}`);
        
        const response = await axios.put(endpoint, vehicleData, {
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
            'X-API-Version': apiVersion,
            'X-Force-Refresh': 'true'
          },
          timeout: 10000 // 10 second timeout for adds
        });
        
        if (response.status === 200) {
          console.log('Vehicle added successfully via', endpoint);
          successResponse = response.data;
          break;
        }
      } catch (error: any) {
        console.error(`Error adding vehicle at endpoint ${endpoint}:`, error.response || error);
        
        // If this is the last endpoint, rethrow the error
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw error;
        }
      }
    }
    
    if (successResponse) {
      return successResponse;
    } else {
      throw new Error('All add endpoints failed');
    }
  } catch (error: any) {
    console.error('Error adding vehicle:', error.response?.data || error);
    throw error;
  }
};

/**
 * Delete a vehicle from the database
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  try {
    console.log('Deleting vehicle with ID:', vehicleId);
    
    // Set the Authorization header if JWT is available in localStorage
    const authHeader: Record<string, string> = {};
    const token = localStorage.getItem('token');
    if (token) {
      authHeader.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Try multiple API endpoints in sequence
    const endpoints = [
      `${apiBaseUrl}/api/admin/vehicles-update.php?vehicleId=${vehicleId}&_t=${timestamp}`,
      `/api/admin/vehicles-update.php?vehicleId=${vehicleId}&_t=${timestamp}`
    ];
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to delete vehicle using endpoint: ${endpoint}`);
        
        const response = await axios.delete(endpoint, {
          headers: {
            ...authHeader,
            'X-API-Version': apiVersion,
            'X-Force-Refresh': 'true'
          },
          timeout: 8000
        });
        
        if (response.status === 200) {
          console.log('Vehicle deleted successfully via', endpoint);
          return true;
        }
      } catch (error: any) {
        console.error(`Error deleting vehicle at endpoint ${endpoint}:`, error.response || error);
        
        // If this is the last endpoint, rethrow the error
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw error;
        }
      }
    }
    
    return false;
  } catch (error: any) {
    console.error('Error deleting vehicle:', error.response?.data || error);
    return false;
  }
};

/**
 * Get all vehicle types for dropdown selection
 */
export const getVehicleTypes = async (): Promise<{id: string, name: string}[]> => {
  try {
    const vehicles = await getVehicleData(true); // Get all vehicles including inactive
    
    const vehiclesList = vehicles.map(vehicle => ({
      id: cleanVehicleId(vehicle.id), // Clean ID to remove any prefixes
      name: vehicle.name || vehicle.id
    }));
    
    console.log('Available vehicle types for selection:', vehiclesList);
    
    return vehiclesList;
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    return defaultVehicles.map(vehicle => ({
      id: vehicle.id,
      name: vehicle.name || vehicle.id
    }));
  }
};
