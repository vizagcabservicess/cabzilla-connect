
import { CabType } from '@/types/cab';
import { apiBaseUrl, getApiUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { OutstationFare, LocalFare, AirportFare } from '@/types/cab';
import { toast } from 'sonner';

// Reduced cache durations to ensure fresher data
const JSON_CACHE_DURATION = 30 * 1000; // 30 seconds in milliseconds (reduced significantly)
const API_CACHE_DURATION = 15 * 1000; // 15 seconds in milliseconds (reduced significantly)

// Store fetched vehicle data in memory to reduce API calls
let cachedVehicles: {
  json?: { data: CabType[], timestamp: number },
  api?: { data: CabType[], timestamp: number },
  fallback?: { data: CabType[], timestamp: number }
} = {};

const DEFAULT_VEHICLES: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    price: 2500,
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
    price: 3200,
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
    price: 3800,
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

/**
 * Fetches vehicle data from local JSON file or API
 * @param forceRefresh Force data refresh (bypass cache)
 * @param includeInactive Include inactive vehicles in the result
 */
export const getVehicleData = async (forceRefresh = false, includeInactive = false): Promise<CabType[]> => {
  console.log(`getVehicleData called with forceRefresh=${forceRefresh}, includeInactive=${includeInactive}`);
  
  const now = Date.now();
  const cacheBuster = `_t=${now}`;
  
  // Always force refresh for admin views when includeInactive is true
  if (includeInactive) {
    forceRefresh = true;
    console.log("Admin view detected (includeInactive=true), forcing refresh");
  }
  
  // If not forcing refresh, try to use cached data
  if (!forceRefresh) {
    // First try API cache if it's recent
    if (cachedVehicles.api && now - cachedVehicles.api.timestamp < API_CACHE_DURATION) {
      console.log('Using cached API vehicle data');
      return filterVehicles(cachedVehicles.api.data, includeInactive);
    }
    
    // Then try JSON cache if it's recent
    if (cachedVehicles.json && now - cachedVehicles.json.timestamp < JSON_CACHE_DURATION) {
      console.log('Using cached JSON vehicle data');
      return filterVehicles(cachedVehicles.json.data, includeInactive);
    }
    
    // Try to load from localStorage as another cache layer
    try {
      const cachedVehiclesString = localStorage.getItem('cachedVehicles');
      const cachedVehiclesTimestamp = localStorage.getItem('cachedVehiclesTimestamp');
      
      if (cachedVehiclesString && cachedVehiclesTimestamp) {
        const timestamp = parseInt(cachedVehiclesTimestamp, 10);
        
        // Use localStorage cache if it's less than 60 seconds old
        if (now - timestamp < 60000) {
          console.log('Using localStorage cached vehicle data');
          const vehicles = JSON.parse(cachedVehiclesString);
          
          // Cache the parsed data in memory too
          cachedVehicles.fallback = {
            data: vehicles,
            timestamp: timestamp
          };
          
          return filterVehicles(vehicles, includeInactive);
        }
      }
    } catch (error) {
      console.error('Error loading cached vehicles from localStorage:', error);
    }
  } else {
    console.log('Force refresh requested, skipping cache');
  }
  
  // Try to fetch from direct DB API first (with error handling)
  try {
    // Build the URL with includeInactive parameter
    const includeInactiveParam = includeInactive ? 'true' : 'false';
    let endpoint = `/api/admin/get-vehicles.php?${cacheBuster}&includeInactive=${includeInactiveParam}`;
    let url = getApiUrl(endpoint);
    
    console.log(`Fetching vehicle data from direct API: ${url}`);
    
    const fetchPromise = fetch(url, {
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': includeInactive ? 'true' : 'false' // Add admin mode header
      },
      mode: 'cors',
      cache: 'no-store'
    });
    
    // Add timeout to the fetch
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Direct API request timeout')), 8000); // Increased timeout
    });
    
    // Race the fetch against the timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    if (!response.ok) {
      throw new Error(`Direct API response not OK: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.status === 'success' && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
      console.log(`Received ${data.vehicles.length} vehicles from direct API`);
      
      // Process vehicle data to ensure correct format
      const processedVehicles = processVehicles(data.vehicles);
      
      // Cache the processed data
      cachedVehicles.api = {
        data: processedVehicles,
        timestamp: now
      };
      
      // Cache to localStorage for persistence
      try {
        localStorage.setItem('cachedVehicles', JSON.stringify(processedVehicles));
        localStorage.setItem('cachedVehiclesTimestamp', now.toString());
      } catch (e) {
        console.error('Error caching vehicles to localStorage:', e);
      }
      
      // Dispatch event to notify components about the refresh
      window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
        detail: { 
          count: processedVehicles.length,
          timestamp: now,
          isAdminView: includeInactive
        }
      }));
      
      return filterVehicles(processedVehicles, includeInactive);
    } else {
      console.warn('Direct API returned empty or invalid vehicles array:', data);
      
      // Try the fix-vehicle-tables endpoint to repair database
      try {
        toast.info("Attempting to fix vehicle database tables");
        const fixResponse = await fetch(`${apiBaseUrl}/api/admin/fix-vehicle-tables.php?${cacheBuster}`, {
          headers: forceRefreshHeaders,
          mode: 'cors',
          cache: 'no-store'
        });
        
        if (fixResponse.ok) {
          // Try fetching vehicles again
          const retryResponse = await fetch(url, {
            headers: forceRefreshHeaders,
            mode: 'cors',
            cache: 'no-store'
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            
            if (retryData && retryData.status === 'success' && Array.isArray(retryData.vehicles) && retryData.vehicles.length > 0) {
              console.log(`Received ${retryData.vehicles.length} vehicles after fixing database`);
              
              // Process vehicle data to ensure correct format
              const processedVehicles = processVehicles(retryData.vehicles);
              
              // Cache the processed data
              cachedVehicles.api = {
                data: processedVehicles,
                timestamp: now
              };
              
              // Cache to localStorage for persistence
              localStorage.setItem('cachedVehicles', JSON.stringify(processedVehicles));
              localStorage.setItem('cachedVehiclesTimestamp', now.toString());
              
              toast.success(`Successfully retrieved ${processedVehicles.length} vehicles after database fix`);
              
              return filterVehicles(processedVehicles, includeInactive);
            }
          }
        }
      } catch (fixError) {
        console.error('Error fixing database:', fixError);
      }
      
      throw new Error('Direct API returned empty or invalid vehicles array');
    }
  } catch (directApiError) {
    console.error('Error fetching vehicles from direct API:', directApiError);
    
    // Now try the vehicles-data.php endpoint (with error handling)
    try {
      const includeInactiveParam = includeInactive ? 'true' : 'false';
      let endpoint = `/api/fares/vehicles-data.php?${cacheBuster}&includeInactive=${includeInactiveParam}`;
      if (forceRefresh) {
        endpoint += '&force=true';
      }
      
      let url = getApiUrl(endpoint);
      console.log(`Fetching vehicle data from API: ${url}`);
      
      const fetchPromise = fetch(url, {
        headers: forceRefresh ? {
          ...forceRefreshHeaders,
          'X-Admin-Mode': includeInactive ? 'true' : 'false' // Add admin mode header
        } : defaultHeaders,
        mode: 'cors',
        cache: 'no-store'
      });
      
      // Add timeout to the fetch
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timeout')), 8000); // Increased timeout
      });
      
      // Race the fetch against the timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        console.error(`API response not OK: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch vehicles: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
        console.log(`Received ${data.vehicles.length} vehicles from API`);
        
        // Process vehicle data to ensure correct format
        const processedVehicles = processVehicles(data.vehicles);
        
        // Cache the processed data
        cachedVehicles.api = {
          data: processedVehicles,
          timestamp: now
        };
        
        // Cache to localStorage for persistence
        try {
          localStorage.setItem('cachedVehicles', JSON.stringify(processedVehicles));
          localStorage.setItem('cachedVehiclesTimestamp', now.toString());
        } catch (e) {
          console.error('Error caching vehicles to localStorage:', e);
        }
        
        // Dispatch event to notify components about the refresh
        window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
          detail: { 
            count: processedVehicles.length,
            timestamp: now,
            isAdminView: includeInactive
          }
        }));
        
        return filterVehicles(processedVehicles, includeInactive);
      } else {
        console.warn('API returned empty or invalid vehicles array');
        throw new Error('API returned empty or invalid vehicles array');
      }
    } catch (apiError) {
      console.error('Error fetching vehicles from API:', apiError);
      
      // Try local JSON file with better error handling
      try {
        console.log('Fetching from vehicles.json fallback');
        const jsonResponse = await fetch(`/data/vehicles.json?${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!jsonResponse.ok) {
          throw new Error(`Failed to fetch JSON data: ${jsonResponse.status}`);
        }
        
        // Check content type to avoid parsing HTML as JSON
        const contentType = jsonResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Response is not JSON, skipping JSON parsing');
          throw new Error('Response is not JSON');
        }
        
        const jsonData = await jsonResponse.json();
        
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          console.log(`Loaded ${jsonData.length} vehicles from JSON file`);
          
          // Process and cache
          const processedVehicles = processVehicles(jsonData);
          cachedVehicles.json = {
            data: processedVehicles,
            timestamp: now
          };
          
          // Cache to localStorage
          try {
            localStorage.setItem('cachedVehicles', JSON.stringify(processedVehicles));
            localStorage.setItem('cachedVehiclesTimestamp', now.toString());
          } catch (e) {
            console.error('Error caching JSON vehicles to localStorage:', e);
          }
          
          return filterVehicles(processedVehicles, includeInactive);
        } else {
          throw new Error('JSON data is empty or invalid');
        }
      } catch (jsonError) {
        console.error('Error loading from local JSON, using default vehicles:', jsonError);
      }
    }
  }
  
  // Check for fallback data from previous requests
  if (cachedVehicles.fallback && cachedVehicles.fallback.data.length > 0) {
    console.log('Using fallback cached vehicles data');
    return filterVehicles(cachedVehicles.fallback.data, includeInactive);
  }
  
  // Last resort: use default vehicles
  console.log('Using default vehicles as last resort');
  
  // Cache the defaults so they can be reused
  try {
    localStorage.setItem('cachedVehicles', JSON.stringify(DEFAULT_VEHICLES));
    localStorage.setItem('cachedVehiclesTimestamp', now.toString());
  } catch (e) {
    console.error('Error caching default vehicles to localStorage:', e);
  }
  
  cachedVehicles.fallback = {
    data: [...DEFAULT_VEHICLES],
    timestamp: now
  };
  
  // Dispatch event to notify components that we're using default vehicles
  window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
    detail: { 
      count: DEFAULT_VEHICLES.length,
      timestamp: now,
      isAdminView: includeInactive,
      isDefault: true
    }
  }));
  
  return filterVehicles(DEFAULT_VEHICLES, includeInactive);
};

// Helper function to filter vehicles by active status
function filterVehicles(vehicles: CabType[], includeInactive: boolean): CabType[] {
  if (includeInactive) {
    return vehicles;
  }
  return vehicles.filter(v => v.isActive !== false);
}

// Helper function to process vehicle data to ensure consistent format
function processVehicles(vehicles: any[]): CabType[] {
  return vehicles.map(vehicle => {
    // Ensure all properties have appropriate defaults
    return {
      id: String(vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || ''),
      vehicleId: String(vehicle.vehicleId || vehicle.id || vehicle.vehicle_id || ''),
      name: vehicle.name || 'Unknown',
      capacity: parseInt(vehicle.capacity || vehicle.seats || '4', 10),
      luggageCapacity: parseInt(vehicle.luggageCapacity || vehicle.luggage_capacity || '2', 10),
      basePrice: parseFloat(vehicle.basePrice || vehicle.base_price || vehicle.price || '0'),
      price: parseFloat(vehicle.price || vehicle.basePrice || vehicle.base_price || '0'),
      pricePerKm: parseFloat(vehicle.pricePerKm || vehicle.price_per_km || '0'),
      image: vehicle.image || '/cars/sedan.png',
      amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
      description: vehicle.description || `${vehicle.name || 'Unknown'} vehicle`,
      ac: vehicle.ac === undefined ? true : Boolean(vehicle.ac),
      nightHaltCharge: parseFloat(vehicle.nightHaltCharge || vehicle.night_halt_charge || '0'),
      driverAllowance: parseFloat(vehicle.driverAllowance || vehicle.driver_allowance || '0'),
      isActive: vehicle.is_active === undefined ? (vehicle.isActive === undefined ? true : Boolean(vehicle.isActive)) : Boolean(vehicle.is_active),
      local: vehicle.local || {},
      airport: vehicle.airport || {},
      outstation: vehicle.outstation || {}
    };
  });
}

// Function to directly clear vehicle data cache
export const clearVehicleDataCache = () => {
  console.log('Clearing vehicle data cache');
  cachedVehicles = {};
  
  // Clear localStorage cache too
  try {
    localStorage.removeItem('cachedVehicles');
    localStorage.removeItem('cachedVehiclesTimestamp');
  } catch (e) {
    console.error('Error clearing localStorage cache:', e);
  }
  
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('vehicle-data-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
};

/**
 * Get vehicle types for dropdowns
 */
export const getVehicleTypes = async (): Promise<{id: string, name: string}[]> => {
  try {
    // Always include inactive vehicles for admin dropdowns
    const vehicles = await getVehicleData(true, true);
    
    return vehicles.map(vehicle => ({
      id: vehicle.id,
      name: vehicle.name
    }));
  } catch (error) {
    console.error("Error fetching vehicle types:", error);
    return [];
  }
};

/**
 * Update outstation fares for a vehicle
 */
export const updateOutstationFares = async (vehicleId: string, fareData: OutstationFare): Promise<boolean> => {
  try {
    // Create FormData for better compatibility with server
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', 'outstation');
    formData.append('trip_type', 'outstation');
    
    // Add all fare data with all possible field names for compatibility
    Object.entries(fareData).forEach(([key, value]) => {
      formData.append(key, value.toString());
      
      // Add with alternative naming conventions
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (snakeCaseKey !== key) {
        formData.append(snakeCaseKey, value.toString());
      }
      
      const camelCaseKey = key.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase());
      if (camelCaseKey !== key) {
        formData.append(camelCaseKey, value.toString());
      }
    });
    
    // Add nightHalt for backward compatibility
    if (fareData.nightHaltCharge) {
      formData.append('nightHalt', fareData.nightHaltCharge.toString());
      formData.append('night_halt', fareData.nightHaltCharge.toString());
    }
    
    // Force create/update the vehicle in all tables
    formData.append('forceSync', 'true');
    formData.append('force_sync', 'true');
    
    // Try direct outstation fares endpoint
    const directResponse = await fetch(getApiUrl('/api/admin/direct-outstation-fares.php'), {
      method: 'POST',
      body: formData,
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (directResponse.ok) {
      const result = await directResponse.json();
      console.log('Direct API response for outstation fares:', result);
      
      // Clear cache to ensure fresh data on next fetch
      clearVehicleDataCache();
      
      // Trigger event to update UI
      window.dispatchEvent(new CustomEvent('fare-data-updated', { 
        detail: { vehicleId, tripType: 'outstation' }
      }));
      
      return true;
    }
    
    // Try the fallback endpoint
    const fallbackResponse = await fetch(getApiUrl('/api/admin/outstation-fares-update.php'), {
      method: 'POST',
      body: formData
    });
    
    if (fallbackResponse.ok) {
      const result = await fallbackResponse.json();
      console.log('Fallback API response for outstation fares:', result);
      
      // Clear cache to ensure fresh data on next fetch
      clearVehicleDataCache();
      
      // Trigger event to update UI
      window.dispatchEvent(new CustomEvent('fare-data-updated', { 
        detail: { vehicleId, tripType: 'outstation' }
      }));
      
      return true;
    }
    
    throw new Error('Failed to update outstation fares');
  } catch (error) {
    console.error('Error updating outstation fares:', error);
    throw error;
  }
};

/**
 * Update local fares for a vehicle
 */
export const updateLocalFares = async (vehicleId: string, fareData: LocalFare): Promise<boolean> => {
  try {
    // Create FormData for better compatibility with server
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', 'local');
    formData.append('trip_type', 'local');
    
    // Add all naming conventions for local package fare fields
    if (fareData.price4hrs40km !== undefined) {
      formData.append('package4hr40km', fareData.price4hrs40km.toString());
      formData.append('price4hrs40km', fareData.price4hrs40km.toString());
      formData.append('hr4km40Price', fareData.price4hrs40km.toString());
      formData.append('local_package_4hr', fareData.price4hrs40km.toString());
    }
    
    if (fareData.price8hrs80km !== undefined) {
      formData.append('package8hr80km', fareData.price8hrs80km.toString());
      formData.append('price8hrs80km', fareData.price8hrs80km.toString());
      formData.append('hr8km80Price', fareData.price8hrs80km.toString());
      formData.append('local_package_8hr', fareData.price8hrs80km.toString());
    }
    
    if (fareData.price10hrs100km !== undefined) {
      formData.append('package10hr100km', fareData.price10hrs100km.toString());
      formData.append('price10hrs100km', fareData.price10hrs100km.toString());
      formData.append('hr10km100Price', fareData.price10hrs100km.toString());
      formData.append('local_package_10hr', fareData.price10hrs100km.toString());
    }
    
    if (fareData.priceExtraKm !== undefined) {
      formData.append('priceExtraKm', fareData.priceExtraKm.toString());
      formData.append('price_extra_km', fareData.priceExtraKm.toString());
      formData.append('extraKmPrice', fareData.priceExtraKm.toString());
      formData.append('extra_km_charge', fareData.priceExtraKm.toString());
    }
    
    if (fareData.priceExtraHour !== undefined) {
      formData.append('priceExtraHour', fareData.priceExtraHour.toString());
      formData.append('price_extra_hour', fareData.priceExtraHour.toString());
      formData.append('extraHourPrice', fareData.priceExtraHour.toString());
      formData.append('extra_hour_charge', fareData.priceExtraHour.toString());
    }
    
    // Try direct local fares endpoint
    const directResponse = await fetch(getApiUrl('/api/direct-local-fares.php'), {
      method: 'POST',
      body: formData,
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (directResponse.ok) {
      const result = await directResponse.json();
      console.log('Direct API response for local fares:', result);
      
      // Clear cache to ensure fresh data on next fetch
      clearVehicleDataCache();
      
      // Trigger event to update UI
      window.dispatchEvent(new CustomEvent('fare-data-updated', { 
        detail: { vehicleId, tripType: 'local' }
      }));
      
      return true;
    }
    
    // Try the fallback endpoint
    const fallbackResponse = await fetch(getApiUrl('/api/admin/local-fares-update.php'), {
      method: 'POST',
      body: formData
    });
    
    if (fallbackResponse.ok) {
      const result = await fallbackResponse.json();
      console.log('Fallback API response for local fares:', result);
      
      // Clear cache to ensure fresh data on next fetch
      clearVehicleDataCache();
      
      // Trigger event to update UI
      window.dispatchEvent(new CustomEvent('fare-data-updated', { 
        detail: { vehicleId, tripType: 'local' }
      }));
      
      return true;
    }
    
    throw new Error('Failed to update local fares');
  } catch (error) {
    console.error('Error updating local fares:', error);
    throw error;
  }
};

/**
 * Update airport fares for a vehicle
 */
export const updateAirportFares = async (vehicleId: string, fareData: AirportFare): Promise<boolean> => {
  try {
    // Create FormData for better compatibility with server
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', 'airport');
    formData.append('trip_type', 'airport');
    
    // Add all fare data with all possible field names for compatibility
    Object.entries(fareData).forEach(([key, value]) => {
      formData.append(key, value.toString());
      
      // Add with alternative naming conventions
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (snakeCaseKey !== key) {
        formData.append(snakeCaseKey, value.toString());
      }
      
      const camelCaseKey = key.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase());
      if (camelCaseKey !== key) {
        formData.append(camelCaseKey, value.toString());
      }
    });
    
    // Try direct airport fares endpoint
    const directResponse = await fetch(getApiUrl('/api/admin/direct-airport-fares.php'), {
      method: 'POST',
      body: formData,
      headers: {
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (directResponse.ok) {
      const result = await directResponse.json();
      console.log('Direct API response for airport fares:', result);
      
      // Clear cache to ensure fresh data on next fetch
      clearVehicleDataCache();
      
      // Trigger event to update UI
      window.dispatchEvent(new CustomEvent('fare-data-updated', { 
        detail: { vehicleId, tripType: 'airport' }
      }));
      
      return true;
    }
    
    // Try the fallback endpoint
    const fallbackResponse = await fetch(getApiUrl('/api/admin/airport-fares-update.php'), {
      method: 'POST',
      body: formData
    });
    
    if (fallbackResponse.ok) {
      const result = await fallbackResponse.json();
      console.log('Fallback API response for airport fares:', result);
      
      // Clear cache to ensure fresh data on next fetch
      clearVehicleDataCache();
      
      // Trigger event to update UI
      window.dispatchEvent(new CustomEvent('fare-data-updated', { 
        detail: { vehicleId, tripType: 'airport' }
      }));
      
      return true;
    }
    
    throw new Error('Failed to update airport fares');
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
};
