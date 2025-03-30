
// Import necessary types and utilities
import { CabType } from '@/types/cab';

// Cache management
let cabTypes: CabType[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Track ongoing fetch operations
let isFetchingCabTypes = false;
let pendingForceRefresh = false;

/**
 * Get all cab types, with optional force refresh
 * @param forceRefresh Force a refresh of cab types from server
 * @returns Array of cab types
 */
export async function getCabTypes(forceRefresh = false): Promise<CabType[]> {
  // If we're in the middle of a fetch, don't start another one
  if (isFetchingCabTypes) {
    if (forceRefresh) {
      pendingForceRefresh = true;
    }
    
    // Return the cached data while fetching
    return [...cabTypes];
  }
  
  // Check if we need to refresh the cache
  const needsRefresh = forceRefresh || 
                       cabTypes.length === 0 || 
                       (Date.now() - lastCacheTime > CACHE_DURATION);
  
  if (needsRefresh) {
    return reloadCabTypes(forceRefresh);
  }
  
  // Return cached data
  return [...cabTypes];
}

/**
 * Clear the cache of cab types
 */
export function clearCabTypesCache() {
  cabTypes = [];
  lastCacheTime = 0;
  console.log('Cab types cache cleared');
}

/**
 * Force reload cab types from server
 * @param forceRefresh Force refresh from server (bypass API caching)
 * @returns Fresh array of cab types
 */
export async function reloadCabTypes(forceRefresh = false): Promise<CabType[]> {
  // Prevent concurrent fetches and infinite loops
  if (isFetchingCabTypes) {
    console.log('Already fetching cab types, not starting another fetch');
    return [...cabTypes];
  }
  
  isFetchingCabTypes = true;
  
  try {
    console.log(`Force refreshing cab types... ${forceRefresh ? '(force refresh)' : ''}`);
    
    // Set a flag to enable cache bypass
    if (forceRefresh) {
      console.log('Set forceCacheRefresh flag to true');
      sessionStorage.setItem('forceCacheRefresh', 'true');
    }
    
    // Try to load from both endpoints with a slight delay between them
    const freshVehicles = await fetchVehiclesFromAllSources(forceRefresh);
    
    if (freshVehicles && freshVehicles.length > 0) {
      cabTypes = freshVehicles;
      lastCacheTime = Date.now();
      
      // Store in session storage for quick access
      sessionStorage.setItem('cabTypes', JSON.stringify(cabTypes));
      console.log(`Refreshed and cached ${cabTypes.length} vehicles`);
      
      // Reset force refresh flag after successful fetch
      if (forceRefresh) {
        sessionStorage.removeItem('forceCacheRefresh');
      }
    } else {
      console.error('No cab types returned from server');
      
      // Try to load from session storage as a fallback
      const cachedTypes = sessionStorage.getItem('cabTypes');
      if (cachedTypes) {
        try {
          cabTypes = JSON.parse(cachedTypes);
          console.log(`Loaded ${cabTypes.length} vehicles from session storage`);
        } catch (e) {
          console.error('Error parsing cached cab types:', e);
        }
      }
    }
    
    return [...cabTypes];
  } catch (error) {
    console.error('Error loading cab types:', error);
    return [...cabTypes]; // Return what we have in cache
  } finally {
    isFetchingCabTypes = false;
    
    // If there was a pending force refresh, handle it now
    if (pendingForceRefresh) {
      pendingForceRefresh = false;
      
      // Use setTimeout to avoid immediate recursive call
      setTimeout(() => {
        reloadCabTypes(true);
      }, 2000);
    }
  }
}

/**
 * Try to load vehicles from all available sources
 */
async function fetchVehiclesFromAllSources(forceRefresh = false): Promise<CabType[]> {
  // Build cache busting parameter
  const cacheBuster = `_t=${Date.now()}`;
  const forceParam = forceRefresh ? '&force=true' : '';
  
  // Define endpoints to try
  const endpoints = [
    `/api/fares/vehicles-data.php?${cacheBuster}${forceParam}&includeInactive=true`,
    `/api/fares/vehicles.php?${cacheBuster}${forceParam}&includeInactive=true`,
    `/data/vehicles.json?${cacheBuster}`
  ];
  
  // Try to load from local storage first if available
  let vehicles: CabType[] = [];
  try {
    const localData = localStorage.getItem('cachedVehicles');
    if (localData) {
      const parsed = JSON.parse(localData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        vehicles = parsed;
        console.log(`Found ${vehicles.length} vehicles in localStorage cache`);
      }
    }
  } catch (e) {
    console.error('Could not parse local storage vehicles:', e);
  }
  
  // Try each endpoint until we get a valid response
  for (const endpoint of endpoints) {
    try {
      console.log(`Fetching fresh vehicle data from primary API...`);
      console.log(`Loading vehicle data from API... (including inactive)`);

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        console.warn(`API responded with status ${response.status} for ${endpoint}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data && data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
        // Fix any malformed image URLs
        const fixedVehicles = data.vehicles.map((vehicle: CabType) => {
          if (vehicle.image && !vehicle.image.startsWith('http') && !vehicle.image.startsWith('/')) {
            vehicle.image = `/${vehicle.image}`;
          }
          
          // Ensure required fields are present
          if (!vehicle.amenities) {
            vehicle.amenities = ['AC', 'Bottle Water', 'Music System'];
          }
          
          // Ensure ac is a boolean
          vehicle.ac = vehicle.ac === undefined ? true : !!vehicle.ac;
          
          // Ensure isActive is a boolean
          vehicle.isActive = vehicle.isActive === undefined ? true : !!vehicle.isActive;
          
          return vehicle;
        });
        
        console.log(`Successfully loaded ${fixedVehicles.length} vehicles from primary API`);
        
        // Cache in localStorage
        localStorage.setItem('cachedVehicles', JSON.stringify(fixedVehicles));
        localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
        
        return fixedVehicles;
      } else {
        console.warn('🔶 No valid vehicle data found in API response');
      }
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
    }
  }
  
  // Try to load from JSON file as a last resort
  try {
    const jsonFilePath = `/data/vehicles.json?${cacheBuster}`;
    console.log(`Trying to load vehicles from local file: ${jsonFilePath}`);
    
    const response = await fetch(jsonFilePath);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Successfully loaded ${data.length} vehicles from local JSON file`);
        
        // Cache in localStorage
        localStorage.setItem('cachedVehicles', JSON.stringify(data));
        localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
        
        return data;
      }
    }
  } catch (error) {
    console.error('Error loading from JSON file:', error);
  }
  
  // Return whatever we have, even if it's from local storage
  return vehicles;
}

/**
 * Get a specific cab type by ID
 * @param id The cab type ID to find
 * @returns The cab type or undefined if not found
 */
export async function getCabTypeById(id: string): Promise<CabType | undefined> {
  // Ensure we have cab types
  const types = await getCabTypes();
  
  // Find the cab with the matching ID
  return types.find(cab => cab.id === id || cab.vehicleId === id);
}
