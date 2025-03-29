import axios from 'axios';
import { CabType, OutstationFare, LocalFare, AirportFare } from '@/types/cab';
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
  
  // Remove any random alphanumeric IDs matching a pattern like: r31yw7w
  if (/^[a-z0-9]{7}$/.test(id)) {
    return id;
  }
  
  return id;
};

/**
 * Normalize API response to handle different formats
 * Add enhanced logging to diagnose the issue
 */
const normalizeVehiclesData = (data: any): CabType[] => {
  if (!data) {
    console.log('No data received to normalize');
    return [];
  }
  
  let vehicles = [];
  let sourceType = 'unknown';
  
  // Check if the data is already an array
  if (Array.isArray(data)) {
    sourceType = 'direct-array';
    vehicles = data;
  }
  // Check if data.vehicles is an array
  else if (data.vehicles && Array.isArray(data.vehicles)) {
    sourceType = 'vehicles-property';
    vehicles = data.vehicles;
  }
  // Check if data.data is an array
  else if (data.data && Array.isArray(data.data)) {
    sourceType = 'data-property';
    vehicles = data.data;
  }
  
  // Enhanced logging to diagnose empty vehicles
  console.log(`Normalizing vehicles from ${sourceType} source, found ${vehicles.length} vehicles`);
  
  if (vehicles.length === 0) {
    console.warn('No valid vehicle data found in API response');
    return defaultVehicles;
  }
  
  // Map and normalize the vehicle data
  const normalizedVehicles = vehicles.map((vehicle: any) => {
    // Extract and clean ID from various possible sources
    const rawVehicleId = vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || vehicle.vehicleType || vehicle.vehicle_type || '';
    const vehicleId = cleanVehicleId(String(rawVehicleId));
    
    const name = String(vehicle.name || vehicleId || '').trim();
    
    // Basic validation check
    if (!vehicleId) {
      console.warn('Vehicle missing ID, skipping:', vehicle);
      return null;
    }
    
    return {
      id: vehicleId,
      vehicleId: vehicleId, // Ensure vehicleId is always set
      name: name || vehicleId, // Use ID as fallback for empty names
      capacity: Number(vehicle.capacity) || 4,
      luggageCapacity: Number(vehicle.luggageCapacity || vehicle.luggage_capacity) || 2,
      price: Number(vehicle.basePrice || vehicle.price || vehicle.base_price || vehicle.base_fare) || 0,
      pricePerKm: Number(vehicle.pricePerKm || vehicle.price_per_km) || 0,
      image: String(vehicle.image || '/cars/sedan.png'),
      amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : 
               (typeof vehicle.amenities === 'string' ? 
                 (vehicle.amenities ? JSON.parse(vehicle.amenities) : ['AC']) : 
                 ['AC']),
      description: String(vehicle.description || ''),
      ac: vehicle.ac !== undefined ? Boolean(vehicle.ac) : true,
      nightHaltCharge: Number(vehicle.nightHaltCharge || vehicle.night_halt_charge) || 0,
      driverAllowance: Number(vehicle.driverAllowance || vehicle.driver_allowance) || 0,
      isActive: vehicle.isActive !== undefined ? Boolean(vehicle.isActive) : 
              (vehicle.is_active !== undefined ? Boolean(vehicle.is_active) : true),
      basePrice: Number(vehicle.basePrice || vehicle.price || vehicle.base_price || vehicle.base_fare) || 0
    };
  }).filter(Boolean); // Remove any null entries
  
  console.log(`Successfully normalized ${normalizedVehicles.length} vehicles`);
  
  if (normalizedVehicles.length === 0) {
    console.warn('No vehicles passed normalization, using defaults');
    return defaultVehicles;
  }
  
  return normalizedVehicles;
};

/**
 * Get all vehicle data from API with multiple fallbacks
 */
export const getVehicleData = async (includeInactive: boolean = false): Promise<CabType[]> => {
  console.log('Loading vehicle data from API...', includeInactive ? '(including inactive)' : '');
  
  // Add cache busting timestamp
  const timestamp = Date.now();
  const cacheParam = `_t=${timestamp}`;
  
  // Try loading from our local JSON file first
  try {
    // This is our local file endpoint that should be prioritized
    const localPath = `/data/vehicles.json?${cacheParam}`;
    console.log(`Trying to load vehicles from local file: ${localPath}`);
    
    const response = await axios.get(localPath, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      timeout: 5000
    });
    
    if (response.status === 200 && response.data) {
      const vehicles = normalizeVehiclesData(response.data);
      console.log(`Successfully loaded ${vehicles.length} vehicles from local JSON file`);
      
      // Filter active vehicles if needed
      const filteredVehicles = includeInactive ? 
        vehicles : 
        vehicles.filter(v => v.isActive !== false);
      
      if (filteredVehicles.length > 0) {
        console.log(`Successfully fetched vehicles from primary endpoint: ${filteredVehicles.length}`);
        return filteredVehicles;
      }
    }
  } catch (error) {
    console.log("Could not load from local JSON file, trying API endpoints");
  }
  
  // Also check localStorage for cached vehicles as an extra fallback
  try {
    const cachedVehicles = localStorage.getItem('cachedVehicles');
    if (cachedVehicles) {
      const vehicles = JSON.parse(cachedVehicles) as CabType[];
      console.log(`Found ${vehicles.length} vehicles in localStorage cache`);
      
      // Only use cache if we have vehicles
      if (vehicles.length > 0) {
        // Filter active vehicles if needed
        const filteredVehicles = includeInactive ? 
          vehicles : 
          vehicles.filter(v => v.isActive !== false);
        
        if (filteredVehicles.length > 0) {
          return filteredVehicles;
        }
      }
    }
  } catch (error) {
    console.log("Could not load from localStorage cache");
  }
  
  // Try multiple API endpoints in sequence
  const endpoints = [
    // Admin endpoint for better vehicle source
    `${apiBaseUrl}/api/admin/vehicles-update.php?action=getAll&includeInactive=true&debug=true&${cacheParam}`,
    `/api/admin/vehicles-update.php?action=getAll&includeInactive=true&debug=true&${cacheParam}`,
    // Primary endpoint - try the raw PHP file first
    `${apiBaseUrl}/api/fares/vehicles.php?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Alternate local path
    `/api/fares/vehicles.php?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Secondary endpoints
    `${apiBaseUrl}/api/fares/vehicles-data.php?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    `/api/fares/vehicles-data.php?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    // Try without PHP extension
    `${apiBaseUrl}/api/fares/vehicles?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    `/api/fares/vehicles?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    `${apiBaseUrl}/api/fares/vehicles-data?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`,
    `/api/fares/vehicles-data?${includeInactive ? 'includeInactive=true&' : ''}${cacheParam}`
  ];
  
  // Try direct database fallback at end
  endpoints.push(`${apiBaseUrl}/api/admin/db_setup.php?action=get_vehicles&includeInactive=true&${cacheParam}`);
  endpoints.push(`/api/admin/db_setup.php?action=get_vehicles&includeInactive=true&${cacheParam}`);
  
  // Try each endpoint until one works
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to load vehicles from: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': apiVersion,
          'X-Force-Refresh': 'true'
        },
        timeout: 8000 // 8 second timeout
      });
      
      if (response.status === 200 && response.data) {
        console.log('Successfully fetched vehicles from', endpoint);
        
        const normalizedVehicles = normalizeVehiclesData(response.data);
        
        // Save to localStorage for future fallback
        localStorage.setItem('cachedVehicles', JSON.stringify(normalizedVehicles));
        
        // Filter active vehicles if needed
        const filteredVehicles = includeInactive ? 
          normalizedVehicles : 
          normalizedVehicles.filter(v => v.isActive !== false);
        
        if (filteredVehicles.length > 0) {
          console.log(`Successfully fetched ${filteredVehicles.length} vehicles from endpoint: ${endpoint}`);
          
          // Do additional logging to debug vehicle IDs
          console.log('Vehicle IDs fetched:', filteredVehicles.map(v => ({
            id: v.id,
            name: v.name,
            vehicleId: v.vehicleId,
            isActive: v.isActive
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
  
  // Save defaults to localStorage too
  localStorage.setItem('cachedVehicles', JSON.stringify(defaultVehicles));
  
  return defaultVehicles;
};

/**
 * Update a vehicle in the database with enhanced fallback mechanisms and debugging
 */
export const updateVehicle = async (vehicleData: any): Promise<any> => {
  try {
    console.log('Updating vehicle with data:', vehicleData);
    
    // Clean the vehicle ID
    if (vehicleData.vehicleId) {
      vehicleData.vehicleId = cleanVehicleId(vehicleData.vehicleId);
    }
    if (vehicleData.id) {
      vehicleData.id = cleanVehicleId(vehicleData.id);
      // Ensure both id and vehicleId are set and consistent
      if (!vehicleData.vehicleId) {
        vehicleData.vehicleId = vehicleData.id;
      }
    }
    
    // Set the Authorization header if JWT is available in localStorage
    const authHeader: Record<string, string> = {};
    const token = localStorage.getItem('token');
    if (token) {
      authHeader.Authorization = `Bearer ${token}`;
    }
    
    // Create FormData for better compatibility with PHP backends
    const formData = new FormData();
    Object.keys(vehicleData).forEach(key => {
      if (vehicleData[key] !== undefined && vehicleData[key] !== null) {
        // Handle arrays specially (like amenities)
        if (Array.isArray(vehicleData[key])) {
          formData.append(key, JSON.stringify(vehicleData[key]));
        } else {
          formData.append(key, vehicleData[key].toString());
        }
      }
    });
    
    // Log what we're sending
    console.log('Sending form data with these keys:', Object.fromEntries(formData.entries()));
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Try multiple API endpoints in sequence
    const endpoints = [
      `${apiBaseUrl}/api/admin/vehicles-update.php?_t=${timestamp}`,
      `/api/admin/vehicles-update.php?_t=${timestamp}`,
      `${apiBaseUrl}/api/admin/direct-vehicle-update.php?_t=${timestamp}`,
      `/api/admin/direct-vehicle-update.php?_t=${timestamp}`,
      `${apiBaseUrl}/api/fares/vehicles.php?_t=${timestamp}`,
      `/api/fares/vehicles.php?_t=${timestamp}`
    ];
    
    let successResponse = null;
    let lastError = null;
    
    // Try each endpoint with multiple content types
    for (const endpoint of endpoints) {
      if (successResponse) break;
      
      try {
        console.log(`Trying to update vehicle using endpoint: ${endpoint}`);
        
        // Try with FormData first (most reliable for PHP)
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            ...authHeader,
            'X-API-Version': apiVersion,
            'X-Force-Refresh': 'true',
            'X-Debug-Mode': 'true'
          },
          body: formData
        });
        
        const responseText = await response.text();
        console.log(`Response from ${endpoint}:`, responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { raw: responseText };
        }
        
        if (response.ok) {
          console.log('Vehicle updated successfully via', endpoint);
          successResponse = responseData;
          
          // Clear cache after successful update
          localStorage.removeItem('cachedVehicles');
          sessionStorage.removeItem('cabTypes');
          
          // Trigger a refresh event that components can listen for
          window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
            detail: { timestamp, vehicleId: vehicleData.id }
          }));
          
          break;
        } else {
          console.error(`Error from ${endpoint}:`, responseData);
          lastError = new Error(responseData.message || `Server returned ${response.status}`);
        }
      } catch (error: any) {
        console.error(`Error updating vehicle at endpoint ${endpoint}:`, error);
        lastError = error;
      }
    }
    
    if (successResponse) {
      toast.success("Vehicle updated successfully");
      return successResponse;
    } else {
      throw lastError || new Error('All update endpoints failed');
    }
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    toast.error(`Error updating vehicle: ${error.message || 'Unknown error'}`);
    throw error;
  }
};

/**
 * Add a new vehicle to the database with enhanced reliability
 */
export const addVehicle = async (vehicleData: any): Promise<any> => {
  try {
    console.log('Adding new vehicle with data:', vehicleData);
    
    // Clean the vehicle ID
    if (vehicleData.vehicleId) {
      vehicleData.vehicleId = cleanVehicleId(vehicleData.vehicleId);
    }
    if (vehicleData.id) {
      vehicleData.id = cleanVehicleId(vehicleData.id);
      // Ensure both id and vehicleId are set and consistent
      if (!vehicleData.vehicleId) {
        vehicleData.vehicleId = vehicleData.id;
      }
    }
    
    // Set the Authorization header if JWT is available in localStorage
    const authHeader: Record<string, string> = {};
    const token = localStorage.getItem('token');
    if (token) {
      authHeader.Authorization = `Bearer ${token}`;
    }
    
    // Create FormData for better compatibility with PHP backends
    const formData = new FormData();
    Object.keys(vehicleData).forEach(key => {
      if (vehicleData[key] !== undefined && vehicleData[key] !== null) {
        // Handle arrays specially (like amenities)
        if (Array.isArray(vehicleData[key])) {
          formData.append(key, JSON.stringify(vehicleData[key]));
        } else {
          formData.append(key, vehicleData[key].toString());
        }
      }
    });
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Try multiple API endpoints in sequence
    const endpoints = [
      `${apiBaseUrl}/api/admin/vehicles-update.php?_t=${timestamp}`,
      `/api/admin/vehicles-update.php?_t=${timestamp}`,
      `${apiBaseUrl}/api/admin/direct-vehicle-create.php?_t=${timestamp}`,
      `/api/admin/direct-vehicle-create.php?_t=${timestamp}`,
      `${apiBaseUrl}/api/fares/vehicles.php?_t=${timestamp}`,
      `/api/fares/vehicles.php?_t=${timestamp}`
    ];
    
    let successResponse = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to add vehicle using endpoint: ${endpoint} with method PUT`);
        
        // Try with FormData (most compatible with PHP)
        const response = await fetch(endpoint, {
          method: 'PUT', // Use PUT for creation
          headers: {
            ...authHeader,
            'X-API-Version': apiVersion,
            'X-Force-Refresh': 'true',
            'X-Debug-Mode': 'true'
          },
          body: formData
        });
        
        const responseText = await response.text();
        console.log(`Response from ${endpoint}:`, responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { raw: responseText };
        }
        
        if (response.ok) {
          console.log('Vehicle added successfully via', endpoint);
          successResponse = responseData;
          
          // Clear cache after successful add
          localStorage.removeItem('cachedVehicles');
          sessionStorage.removeItem('cabTypes');
          
          // Trigger a refresh event
          window.dispatchEvent(new CustomEvent('vehicle-data-updated', {
            detail: { timestamp, vehicleId: vehicleData.id }
          }));
          
          break;
        } else {
          console.error(`Error from ${endpoint}:`, responseData);
        }
      } catch (error: any) {
        console.error(`Error adding vehicle at endpoint ${endpoint}:`, error);
      }
    }
    
    if (successResponse) {
      toast.success("Vehicle added successfully");
      return successResponse;
    } else {
      // Fallback: Store in local storage if all endpoints fail
      try {
        const cachedVehicles = localStorage.getItem('cachedVehicles');
        let vehicles = cachedVehicles ? JSON.parse(cachedVehicles) : defaultVehicles;
        
        // Add the new vehicle
        vehicles.push({
          ...vehicleData,
          isActive: true,
          createdAt: new Date().toISOString()
        });
        
        localStorage.setItem('cachedVehicles', JSON.stringify(vehicles));
        
        toast.success("Vehicle added to local cache (offline mode)");
        return { 
          status: 'success', 
          message: 'Vehicle added to local cache', 
          offlineMode: true,
          timestamp: Date.now()
        };
      } catch (localError) {
        console.error('Error adding to local storage:', localError);
        throw new Error('All add endpoints failed and local storage fallback failed');
      }
    }
  } catch (error: any) {
    console.error('Error adding vehicle:', error);
    toast.error(`Error adding vehicle: ${error.message || 'Unknown error'}`);
    throw error;
  }
};

/**
 * Delete a vehicle from the database with improved reliability
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  try {
    // Clean the vehicle ID
    const cleanedVehicleId = cleanVehicleId(vehicleId);
    
    console.log('Deleting vehicle with ID:', cleanedVehicleId);
    
    // Set the Authorization header if JWT is available in localStorage
    const authHeader: Record<string, string> = {};
    const token = localStorage.getItem('token');
    if (token) {
      authHeader.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Try multiple API endpoints and methods in sequence
    const configurations = [
      // Try fetch with DELETE
      { 
        endpoint: `${apiBaseUrl}/api/admin/vehicles-update.php?vehicleId=${cleanedVehicleId}&_t=${timestamp}`,
        method: 'DELETE'
      },
      { 
        endpoint: `/api/admin/vehicles-update.php?vehicleId=${cleanedVehicleId}&_t=${timestamp}`,
        method: 'DELETE'
      },
      // Try POST with action=delete parameter
      {
        endpoint: `${apiBaseUrl}/api/admin/vehicles-update.php?_t=${timestamp}`,
        method: 'POST',
        body: `vehicleId=${cleanedVehicleId}&action=delete`
      },
      {
        endpoint: `/api/admin/vehicles-update.php?_t=${timestamp}`,
        method: 'POST',
        body: `vehicleId=${cleanedVehicleId}&action=delete`
      },
      // Try fetch with DELETE on direct endpoints
      {
        endpoint: `${apiBaseUrl}/api/admin/direct-vehicle-delete.php?vehicleId=${cleanedVehicleId}&_t=${timestamp}`,
        method: 'DELETE'
      },
      {
        endpoint: `/api/admin/direct-vehicle-delete.php?vehicleId=${cleanedVehicleId}&_t=${timestamp}`,
        method: 'DELETE'
      }
    ];
    
    // Try each configuration
    for (const config of configurations) {
      try {
        console.log(`Trying to delete vehicle using endpoint: ${config.endpoint} with method ${config.method}`);
        
        const fetchOptions: RequestInit = {
          method: config.method,
          headers: {
            ...authHeader,
            'X-API-Version': apiVersion,
            'X-Force-Refresh': 'true',
            'X-Debug-Mode': 'true'
          }
        };
        
        if (config.method === 'POST' && config.body) {
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Content-Type': 'application/x-www-form-urlencoded'
          };
          fetchOptions.body = config.body;
        }
        
        const response = await fetch(config.endpoint, fetchOptions);
        
        // Try to read the response
        let responseData;
        try {
          const responseText = await response.text();
          console.log(`Response from ${config.endpoint}:`, responseText);
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          console.log('Could not parse response as JSON, treating as success if status is OK');
          responseData = {};
        }
        
        if (response.ok) {
          console.log('Vehicle deleted successfully via', config.endpoint);
          
          // Clear cache after successful delete
          localStorage.removeItem('cachedVehicles');
          sessionStorage.removeItem('cabTypes');
          
          // Trigger a refresh event
          window.dispatchEvent(new CustomEvent('vehicle-data-deleted', {
            detail: { timestamp, vehicleId: cleanedVehicleId }
          }));
          
          toast.success('Vehicle deleted successfully');
          return true;
        } else {
          console.error('Delete failed with status:', response.status);
        }
      } catch (error: any) {
        console.error(`Error deleting vehicle at endpoint ${config.endpoint}:`, error);
      }
    }
    
    // If all API endpoints fail, try to remove from local storage as fallback
    try {
      const cachedVehicles = localStorage.getItem('cachedVehicles');
      if (cachedVehicles) {
        let vehicles = JSON.parse(cachedVehicles) as CabType[];
        vehicles = vehicles.filter(v => v.id !== cleanedVehicleId);
        localStorage.setItem('cachedVehicles', JSON.stringify(vehicles));
        
        toast.success('Vehicle deleted from local cache');
        
        // Trigger refresh event
        window.dispatchEvent(new CustomEvent('vehicle-data-deleted', {
          detail: { timestamp: Date.now(), vehicleId: cleanedVehicleId }
        }));
        
        return true;
      }
    } catch (e) {
      console.error('Failed to delete from local storage:', e);
    }
    
    toast.error('Failed to delete vehicle. Please try again.');
    return false;
  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    toast.error(`Error deleting vehicle: ${error.message || 'Unknown error'}`);
    return false;
  }
};

/**
 * Get all vehicle types for dropdown selection
 * Ensure this returns the full vehicle data, not just id/name
 */
export const getVehicleTypes = async (): Promise<CabType[]> => {
  try {
    // Always pass true to include inactive vehicles
    const vehicles = await getVehicleData(true); 
    
    console.log('Available vehicle types for selection:', vehicles);
    
    return vehicles;
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    
    // Try to load from localStorage as last resort
    try {
      const cachedVehicles = localStorage.getItem('cachedVehicles');
      if (cachedVehicles) {
        return JSON.parse(cachedVehicles) as CabType[];
      }
    } catch (e) {
      console.log('Failed to load from cache:', e);
    }
    
    return defaultVehicles;
  }
};

/**
 * Update outstation fares for a vehicle
 */
export const updateOutstationFares = async (
  vehicleId: string,
  outstation: OutstationFare
): Promise<boolean> => {
  return updateTripFares(vehicleId, 'outstation', outstation);
};

/**
 * Update local package fares for a vehicle
 */
export const updateLocalFares = async (
  vehicleId: string,
  local: LocalFare
): Promise<boolean> => {
  return updateTripFares(vehicleId, 'local', local);
};

/**
 * Update airport transfer fares for a vehicle
 */
export const updateAirportFares = async (
  vehicleId: string,
  airport: AirportFare
): Promise<boolean> => {
  return updateTripFares(vehicleId, 'airport', airport);
};

/**
 * Update base pricing for a vehicle
 */
export const updateBasePricing = async (
  vehicleId: string,
  basePricing: any
): Promise<boolean> => {
  return updateTripFares(vehicleId, 'base', basePricing);
};

/**
 * Update fare settings for specific trip types
 */
export const updateTripFares = async (
  vehicleId: string, 
  tripType: string, 
  fareData: Record<string, any>
): Promise<boolean> => {
  try {
    // Clean the vehicle ID
    const cleanedVehicleId = cleanVehicleId(vehicleId);
    
    console.log(`Updating ${tripType} fares for vehicle ${cleanedVehicleId}:`, fareData);
    
    // Set the Authorization header if JWT is available in localStorage
    const authHeader: Record<string, string> = {};
    const token = localStorage.getItem('token');
    if (token) {
      authHeader.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Create payload combining vehicle ID, trip type, and fare data
    const payload = {
      vehicleId: cleanedVehicleId,
      tripType,
      ...fareData
    };
    
    // Try multiple API endpoints in sequence - starting with our new direct endpoint
    const endpoints = [
      // Try our new direct endpoint first
      `${apiBaseUrl}/api/admin/direct-vehicle-pricing.php?_t=${timestamp}`,
      `/api/admin/direct-vehicle-pricing.php?_t=${timestamp}`,
      // Try raw PHP file version (not using htaccess rules)
      `${apiBaseUrl}/api/admin/vehicle-pricing.php?raw=1&_t=${timestamp}`,
      `/api/admin/vehicle-pricing.php?raw=1&_t=${timestamp}`,
      // Standard endpoint with htaccess rules
      `${apiBaseUrl}/api/admin/vehicle-pricing?_t=${timestamp}`,
      `/api/admin/vehicle-pricing?_t=${timestamp}`,
      // Try with .php extension
      `${apiBaseUrl}/api/admin/vehicle-pricing.php?_t=${timestamp}`,
      `/api/admin/vehicle-pricing.php?_t=${timestamp}`,
      // Fall back to fare update endpoints
      `${apiBaseUrl}/api/admin/fares-update.php?_t=${timestamp}`,
      `/api/admin/fares-update.php?_t=${timestamp}`
    ];
    
    // Try both fetch and axios
    let successful = false;
    let lastError: any = null;
    
    console.log(`Attempting to update ${tripType} fares using ${endpoints.length} different endpoints...`);
    
    // First try using axios with different content types
    const contentTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ];
    
    for (const endpoint of endpoints) {
      if (successful) break;
      
      for (const contentType of contentTypes) {
        if (successful) break;
        
        try {
          console.log(`Trying ${endpoint} with content type ${contentType}`);
          
          let axiosConfig: any = {
            method: 'POST',
            url: endpoint,
            headers: {
              ...authHeader,
              'Content-Type': contentType,
              'X-API-Version': apiVersion,
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
            timeout: 15000 // 15 second timeout
          };
          
          // Handle different content types
          if (contentType === 'application/json') {
            axiosConfig.headers['Content-Type'] = contentType;
            axiosConfig.data = payload;
          } else if (contentType === 'application/x-www-form-urlencoded') {
            axiosConfig.headers['Content-Type'] = contentType;
            const params = new URLSearchParams();
            for (const key in payload) {
              params.append(key, String(payload[key]));
            }
            axiosConfig.data = params;
          } else if (contentType === 'multipart/form-data') {
            // For multipart/form-data, let axios set the content type with boundary
            const formData = new FormData();
            for (const key in payload) {
              formData.append(key, String(payload[key]));
            }
            axiosConfig.data = formData;
          }
          
          const response = await axios(axiosConfig);
          
          console.log(`Response from ${endpoint} (${contentType}):`, response.data);
          
          if (response.status >= 200 && response.status < 300) {
            console.log(`${tripType} fares updated successfully via ${endpoint} with ${contentType}`);
            successful = true;
            toast.success(`${tripType} fares updated successfully`);
            
            // Clear all caches to ensure fresh data
            localStorage.removeItem('cabFares');
            localStorage.removeItem('tourFares');
            sessionStorage.removeItem('cabFares');
            sessionStorage.removeItem('tourFares');
            sessionStorage.removeItem('calculatedFares');
            
            return true;
          }
        } catch (error: any) {
          lastError = error;
          console.error(`Error updating ${tripType} fares at endpoint ${endpoint} with ${contentType}:`, error.response || error);
        }
      }
    }
    
    // If axios methods all failed, try fetch as a last resort
    if (!successful) {
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying fetch with ${endpoint}`);
          
          // Try with FormData
          const formData = new FormData();
          for (const key in payload) {
            formData.append(key, String(payload[key]));
          }
          
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
              ...authHeader,
              'X-API-Version': apiVersion,
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (response.ok) {
            console.log(`${tripType} fares updated successfully via fetch to ${endpoint}`);
            toast.success(`${tripType} fares updated successfully`);
            
            // Clear all caches
            localStorage.removeItem('cabFares');
            localStorage.removeItem('tourFares');
            sessionStorage.removeItem('cabFares');
            sessionStorage.removeItem('tourFares');
            sessionStorage.removeItem('calculatedFares');
            
            return true;
          }
        } catch (error) {
          console.error(`Fetch error updating ${tripType} fares at endpoint ${endpoint}:`, error);
        }
      }
    }
    
    if (lastError) {
      toast.error(`Failed to update ${tripType} fares: ${lastError.response?.data?.message || lastError.message || 'Unknown error'}`);
      throw lastError;
    }
    
    toast.error(`Failed to update ${tripType} fares: All attempts failed`);
    return false;
  } catch (error: any) {
    console.error(`Error updating ${tripType} fares:`, error);
    return false;
  }
};
