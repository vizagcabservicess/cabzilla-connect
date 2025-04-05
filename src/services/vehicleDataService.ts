
import { directVehicleOperation } from '@/utils/apiHelper';

// Local cache of vehicle data
let vehicleDataCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_EXPIRY = 60 * 1000; // 60 seconds

/**
 * Clear the vehicle data cache to force a fresh fetch next time
 */
export function clearVehicleDataCache() {
  console.log('Clearing vehicle data cache');
  vehicleDataCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if the cache is valid
 */
function isCacheValid(): boolean {
  return (
    vehicleDataCache !== null &&
    cacheTimestamp > 0 &&
    Date.now() - cacheTimestamp < CACHE_EXPIRY
  );
}

/**
 * Fetch vehicles from the API or from local storage if API fails
 * @param includeInactive Whether to include inactive vehicles
 * @param forceRefresh Force a refresh from the API
 * @returns Promise with an array of vehicle data
 */
export async function fetchVehicles(
  includeInactive: boolean = false,
  forceRefresh: boolean = false
): Promise<any[]> {
  // Return from cache if valid and not forcing refresh
  if (!forceRefresh && isCacheValid()) {
    console.log('Using cached vehicle data', { count: vehicleDataCache?.length });
    return vehicleDataCache || [];
  }

  console.log('Fetching vehicles from API', { includeInactive, forceRefresh });
  
  try {
    // Try API endpoint first with timestamp to prevent caching
    const apiEndpoint = `api/admin/direct-vehicle-modify.php?action=load&includeInactive=${includeInactive}&_t=${Date.now()}`;
    const apiResult = await directVehicleOperation(apiEndpoint, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (apiResult && apiResult.vehicles && Array.isArray(apiResult.vehicles)) {
      console.log('Successfully fetched vehicles from API endpoint 1', {
        count: apiResult.vehicles.length
      });
      vehicleDataCache = apiResult.vehicles;
      cacheTimestamp = Date.now();
      
      // Store in local storage as backup
      try {
        localStorage.setItem('vehicleData', JSON.stringify(apiResult.vehicles));
        localStorage.setItem('vehicleDataTimestamp', Date.now().toString());
      } catch (storageError) {
        console.warn('Failed to store vehicle data in local storage', storageError);
      }
      
      return apiResult.vehicles;
    }

    // Try alternate endpoint
    console.log('First endpoint failed, trying alternate endpoint');
    const altEndpoint = `api/admin/vehicles-data.php?_t=${Date.now()}&includeInactive=${includeInactive}&force=true`;
    const altResult = await directVehicleOperation(altEndpoint, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (altResult && altResult.vehicles && Array.isArray(altResult.vehicles)) {
      console.log('Successfully fetched vehicles from API endpoint 2', {
        count: altResult.vehicles.length
      });
      vehicleDataCache = altResult.vehicles;
      cacheTimestamp = Date.now();
      
      // Store in local storage as backup
      try {
        localStorage.setItem('vehicleData', JSON.stringify(altResult.vehicles));
        localStorage.setItem('vehicleDataTimestamp', Date.now().toString());
      } catch (storageError) {
        console.warn('Failed to store vehicle data in local storage', storageError);
      }
      
      return altResult.vehicles;
    }

    // Try third endpoint
    console.log('Second endpoint failed, trying third endpoint');
    const thirdEndpoint = `api/admin/get-vehicles.php?_t=${Date.now()}&includeInactive=${includeInactive}`;
    const thirdResult = await directVehicleOperation(thirdEndpoint, 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (thirdResult && Array.isArray(thirdResult)) {
      console.log('Successfully fetched vehicles from API endpoint 3', {
        count: thirdResult.length
      });
      vehicleDataCache = thirdResult;
      cacheTimestamp = Date.now();
      
      // Store in local storage as backup
      try {
        localStorage.setItem('vehicleData', JSON.stringify(thirdResult));
        localStorage.setItem('vehicleDataTimestamp', Date.now().toString());
      } catch (storageError) {
        console.warn('Failed to store vehicle data in local storage', storageError);
      }
      
      return thirdResult;
    }

    // If all API calls fail, try to load from local JSON file
    console.log('All API endpoints failed, trying local JSON file');
    const jsonResult = await fetch(`data/vehicles.json?_t=${Date.now()}`);
    
    if (jsonResult.ok) {
      const jsonData = await jsonResult.json();
      console.log('Successfully loaded vehicles from JSON file', {
        count: jsonData.length
      });
      vehicleDataCache = jsonData;
      cacheTimestamp = Date.now();
      
      // Store in local storage as backup
      try {
        localStorage.setItem('vehicleData', JSON.stringify(jsonData));
        localStorage.setItem('vehicleDataTimestamp', Date.now().toString());
      } catch (storageError) {
        console.warn('Failed to store vehicle data in local storage', storageError);
      }
      
      return jsonData;
    }

    // If local JSON file fails, try to load from local storage
    console.log('Local JSON file failed, trying local storage');
    const storedData = localStorage.getItem('vehicleData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log('Successfully loaded vehicles from local storage', {
          count: parsedData.length
        });
        vehicleDataCache = parsedData;
        cacheTimestamp = Date.now();
        return parsedData;
      } catch (parseError) {
        console.error('Failed to parse vehicle data from local storage', parseError);
      }
    }

    // If everything fails, use fallback data
    console.log('All sources failed, using fallback data');
    const fallbackData = getFallbackVehicles();
    vehicleDataCache = fallbackData;
    cacheTimestamp = Date.now();
    return fallbackData;
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    
    // Try local JSON file as first fallback
    try {
      console.log('Error with API, trying local JSON file');
      const jsonResult = await fetch(`data/vehicles.json?_t=${Date.now()}`);
      if (jsonResult.ok) {
        const jsonData = await jsonResult.json();
        console.log('Successfully loaded vehicles from JSON fallback', {
          count: jsonData.length
        });
        vehicleDataCache = jsonData;
        cacheTimestamp = Date.now();
        return jsonData;
      }
    } catch (jsonError) {
      console.error('Error fetching local JSON file:', jsonError);
    }
    
    // Try local storage as second fallback
    const storedData = localStorage.getItem('vehicleData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log('Successfully loaded vehicles from local storage fallback', {
          count: parsedData.length
        });
        vehicleDataCache = parsedData;
        cacheTimestamp = Date.now();
        return parsedData;
      } catch (parseError) {
        console.error('Failed to parse vehicle data from local storage', parseError);
      }
    }
    
    // If everything fails, use fallback data
    console.log('All fallbacks failed, using hardcoded data');
    const fallbackData = getFallbackVehicles();
    vehicleDataCache = fallbackData;
    cacheTimestamp = Date.now();
    return fallbackData;
  }
}

/**
 * Get a fallback set of vehicles when all fetch methods fail
 * @returns Array of basic vehicle data
 */
function getFallbackVehicles(): any[] {
  return [
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
    },
    {
      id: 'luxury',
      name: 'Luxury Sedan',
      capacity: 4,
      luggageCapacity: 3,
      price: 4500,
      pricePerKm: 25,
      image: '/cars/luxury.png',
      amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Premium Amenities'],
      description: 'Premium luxury sedan with high-end amenities for a comfortable journey.',
      ac: true,
      nightHaltCharge: 1200,
      driverAllowance: 300,
      isActive: true
    },
    {
      id: 'tempo',
      name: 'Tempo Traveller',
      capacity: 12,
      luggageCapacity: 8,
      price: 5500,
      pricePerKm: 22,
      image: '/cars/tempo.png',
      amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
      description: 'Spacious van suitable for group travel of up to 12 passengers.',
      ac: true,
      nightHaltCharge: 1200,
      driverAllowance: 300,
      isActive: true
    }
  ];
}
