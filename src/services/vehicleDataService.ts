
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
  return vehicles.map((vehicle: any) => ({
    id: String(vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || vehicle.vehicleType || ''),
    name: String(vehicle.name || ''),
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
    basePrice: Number(vehicle.basePrice || vehicle.price || vehicle.base_price) || 0
  }));
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
    `${apiBaseUrl}/api/fares/vehicles-data.php?${cacheParam}`,
    // Alternate path
    `${apiBaseUrl}/api/fares/vehicles-data?${cacheParam}`,
    // Local fallback
    `/api/fares/vehicles-data.php?${cacheParam}`,
    // Alternate local
    `/api/fares/vehicles-data?${cacheParam}`,
    // Direct vehicles endpoint
    `${apiBaseUrl}/api/fares/vehicles.php?${cacheParam}`,
    // Local vehicles endpoint
    `/api/fares/vehicles.php?${cacheParam}`,
    // Admin endpoint
    `${apiBaseUrl}/api/admin/vehicles-update.php?action=getAll&${cacheParam}`,
    // Local admin endpoint
    `/api/admin/vehicles-update.php?action=getAll&${cacheParam}`
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
        console.log('Successfully fetched vehicles from', endpoint, ':', response.data);
        
        const normalizedVehicles = normalizeVehiclesData(response.data);
        
        // Filter active vehicles if needed
        const filteredVehicles = includeInactive ? 
          normalizedVehicles : 
          normalizedVehicles.filter(v => v.isActive !== false);
        
        if (filteredVehicles.length > 0) {
          console.log(`Successfully fetched ${filteredVehicles.length} vehicles from primary endpoint`);
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
 * Get vehicle pricing data from the admin API
 */
export const getVehiclePricing = async (): Promise<any[]> => {
  console.log('Loading vehicle pricing data from API...');
  
  // Add cache busting timestamp
  const timestamp = Date.now();
  const cacheParam = `_t=${timestamp}`;
  
  // Try multiple endpoints
  const endpoints = [
    `${apiBaseUrl}/api/admin/vehicle-pricing.php?${cacheParam}`,
    `/api/admin/vehicle-pricing.php?${cacheParam}`,
    `${apiBaseUrl}/api/admin/vehicle-pricing?${cacheParam}`,
    `/api/admin/vehicle-pricing?${cacheParam}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to load vehicle pricing from: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-Version': apiVersion,
          'X-Force-Refresh': 'true'
        },
        timeout: 8000
      });
      
      if (response.status === 200 && response.data) {
        console.log('Successfully fetched vehicle pricing from', endpoint);
        
        // Check for data in various formats
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        } else if (Array.isArray(response.data)) {
          return response.data;
        }
      }
    } catch (error) {
      console.error(`Error fetching pricing from endpoint ${endpoint}:`, error);
    }
  }
  
  // Return empty array if all endpoints fail
  return [];
};

/**
 * Update vehicle pricing
 */
export const updateVehiclePricing = async (data: any): Promise<boolean> => {
  try {
    console.log('Updating vehicle pricing:', data);
    
    // Validate required fields
    if (!data.vehicleType || data.basePrice === undefined || data.pricePerKm === undefined) {
      toast.error('Missing required fields: vehicle type, base price, or price per km');
      return false;
    }
    
    const response = await axios.post(`${apiBaseUrl}/api/admin/vehicle-pricing.php`, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': apiVersion
      }
    });
    
    if (response.status === 200 && response.data && response.data.status === 'success') {
      console.log('Vehicle pricing updated successfully:', response.data);
      return true;
    }
    
    console.error('Failed to update vehicle pricing:', response.data);
    return false;
  } catch (error) {
    console.error('Error updating vehicle pricing:', error);
    return false;
  }
};

/**
 * Get all vehicle types for dropdown selection
 */
export const getVehicleTypes = async (): Promise<{id: string, name: string}[]> => {
  try {
    const vehicles = await getVehicleData(true); // Get all vehicles including inactive
    
    return vehicles.map(vehicle => ({
      id: vehicle.id,
      name: vehicle.name || vehicle.id
    }));
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    return defaultVehicles.map(vehicle => ({
      id: vehicle.id,
      name: vehicle.name || vehicle.id
    }));
  }
};
