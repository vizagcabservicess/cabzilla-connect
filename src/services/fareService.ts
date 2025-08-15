import axios from 'axios';
import { TripType, TripMode } from '@/lib/tripTypes';
import { LocalFare, OutstationFare, AirportFare } from '@/types/cab';

// Create a global timestamp for fare cache refreshes
let globalTimestamp = Date.now();

// Define functions that will be used and exported
function clearFareCache() {
  console.log('Clearing fare cache at', new Date().toISOString());
  localStorage.removeItem('outstation_fares');
  localStorage.removeItem('local_fares'); 
  localStorage.removeItem('airport_fares');
  localStorage.removeItem('outstation_fares_timestamp');
  localStorage.removeItem('local_fares_timestamp'); 
  localStorage.removeItem('airport_fares_timestamp');
  localStorage.setItem('globalFareRefreshToken', Date.now().toString());

  // Clear all fare-related cache items from localStorage and sessionStorage
  const keysToRemove = [
    'cachedFareData', 'cabPricing', 'fareCache', 'fares', 
    'cabData', 'vehicles', 'calculatedFares', 'cabTypes', 
    'outstationFares', 'airportFares', 'tourFares'
  ];

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  // Also clear all prefixed cache keys
  for (const storageType of [localStorage, sessionStorage]) {
    try {
      const keys = Object.keys(storageType);
      for (const key of keys) {
        if (key.startsWith('cabOptions_') || 
            key.startsWith('fare_') || 
            key.startsWith('pricing_')) {
          storageType.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Error clearing prefixed cache keys:', e);
    }
  }

  // Trigger a fare cache cleared event
  window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));

  globalTimestamp = Date.now();
}

// Utility function to reset cab options state
function resetCabOptionsState() {
  // Clear cab options related cache
  const cabOptionsKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('cabOptions_'));

  for (const key of cabOptionsKeys) {
    localStorage.removeItem(key);
  }

  // Add session storage items too
  const sessionCabOptionsKeys = Object.keys(sessionStorage).filter(key => 
    key.startsWith('cabOptions_'));

  for (const key of sessionCabOptionsKeys) {
    sessionStorage.removeItem(key);
  }

  console.log('Reset cab options state');

  // Dispatch an event to notify components that state has been reset
  window.dispatchEvent(new CustomEvent('cab-options-reset', {
    detail: { timestamp: Date.now() }
  }));
}

// Utility function to get bypass headers for cache invalidation
function getBypassHeaders() {
  return {
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-API-Version': '1.0.55',
    'Accept': 'application/json' // Added Accept header for better error handling
  };
}

// Utility function to get forced request config for axios
function getForcedRequestConfig() {
  return {
    headers: getBypassHeaders(),
    params: {
      _t: Date.now(), // Cache busting timestamp
      force: 'true'
    }
  };
}

// Initialize database tables - useful for admin operations
async function initializeDatabase(forceRecreate = false) {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';
    const params = new URLSearchParams();

    if (forceRecreate) {
      params.append('force', 'true');
    }

    params.append('verbose', 'true');
    params.append('_t', Date.now().toString()); // Cache busting

    const response = await axios.get(`${baseUrl}/api/admin/init-database.php?${params.toString()}`, {
      headers: getBypassHeaders()
    });

    return response.data;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Direct method to update fares with sync option
async function directFareUpdate(tripType: string, vehicleId: string, data: any) {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';
    let endpoint = '';

    // Construct the appropriate endpoint based on trip type
    switch (tripType) {
      case 'outstation':
        endpoint = `${baseUrl}/api/admin/direct-outstation-fares.php`;
        break;
      case 'local':
        endpoint = `${baseUrl}/api/admin/direct-local-fares.php`;
        break;
      case 'airport':
        endpoint = `${baseUrl}/api/admin/direct-airport-fares.php`;
        break;
      default:
        endpoint = `${baseUrl}/api/admin/direct-fare-update.php`;
    }

    // Prepare form data for the request
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId);
    formData.append('tripType', tripType);

    // Add all data properties to the form data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    console.log(`Sending ${tripType} fare update for ${vehicleId} to ${endpoint}`);

    // Make the request using FormData
    const response = await axios.post(endpoint, formData);

    // After updating, force a sync between tables
    if (tripType === 'outstation') {
      console.log('Syncing outstation_fares with vehicle_pricing');
      try {
        const syncResponse = await syncOutstationFares(vehicleId);
        console.log('Sync response:', syncResponse);
      } catch (syncError) {
        console.error('Error during sync after update:', syncError);
        // Continue anyway, as the primary update succeeded
      }
    }

    // Clear cache after updating
    clearFareCache();

    // Dispatch an event to notify other components
    const eventName = `${tripType}-fares-updated`;
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: {
        vehicleId,
        timestamp: Date.now(),
        prices: data
      }
    }));

    return response.data;
  } catch (error) {
    console.error(`Error updating ${tripType} fares for ${vehicleId}:`, error);
    throw error;
  }
}

// Sync outstation fares - safer implementation with fallback to local API
async function syncOutstationFares(vehicleId?: string) {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';
    console.log('Syncing outstation_fares with vehicle_pricing' + (vehicleId ? ` for vehicle ${vehicleId}` : ''));

    // Construct the URL with parameters
    let url = `${baseUrl}/api/admin/sync-outstation-fares.php`;
    const params = new URLSearchParams();
    params.append('_t', Date.now().toString());

    if (vehicleId) {
      params.append('vehicle_id', vehicleId);
    }

    try {
      // First try using the main API endpoint
      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: getBypassHeaders(),
        timeout: 10000 // 10 second timeout
      });

      console.log('Sync successful using main endpoint:', response.data);

      // Clear cache after syncing
      clearFareCache();

      return response.data;
    } catch (mainError) {
      console.error('Error using main sync endpoint:', mainError);

      // As a fallback, try the default outstation-fares.php endpoint with sync=true
      console.log('Trying fallback sync method...');

      const fallbackParams = new URLSearchParams(params);
      fallbackParams.append('sync', 'true');
      fallbackParams.append('force_sync', 'true');

      const fallbackResponse = await axios.get(`${baseUrl}/api/outstation-fares.php?${fallbackParams.toString()}`, {
        headers: getBypassHeaders(),
        timeout: 10000 // 10 second timeout
      });

      console.log('Sync successful using fallback endpoint:', fallbackResponse.data);

      // Clear cache after syncing
      clearFareCache();

      return {
        status: 'success',
        message: 'Sync completed using fallback method',
        originalError: (mainError as any).message,
        data: fallbackResponse.data
      };
    }
  } catch (error) {
    console.error('All sync attempts failed:', error);
    throw error;
  }
}

// Force sync outstation fares with vehicle_pricing
async function forceSyncOutstationFares() {
  try {
    return await syncOutstationFares();
  } catch (error) {
    console.error('Error forcing sync of outstation fares:', error);
    throw error;
  }
}

// Sync local fare tables - ensure consistency with vehicle_pricing
async function syncLocalFareTables(): Promise<boolean> {
  try {
    console.log('Syncing local fare tables...');
    const bypassHeaders = getBypassHeaders();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';

    // Call the sync-local-fares.php API endpoint
    const response = await fetch(`${baseUrl}/admin/sync-local-fares.php`, {
      method: 'GET',
      headers: {
        ...bypassHeaders,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    const data = await response.json();
    console.log('Local fare tables sync response:', data);

    if (data.status === 'success') {
      // Clear fare cache to ensure latest data is fetched
      clearFareCache();

      // Dispatch an event to notify components about the fare update
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now().toString() }
      }));

      return true;
    } else {
      console.error('Failed to sync local fare tables:', data.message);
      return false;
    }
  } catch (error) {
    console.error('Error syncing local fare tables:', error);
    return false;
  }
};

// Function to get fares based on trip type
function getFaresByTripType(tripType: TripType, vehicleId?: string) {
  switch (tripType) {
    case 'outstation':
      return vehicleId ? getOutstationFaresForVehicle(vehicleId) : getOutstationFares();
    case 'local':
      return vehicleId ? getLocalFaresForVehicle(vehicleId) : getLocalFares();
    case 'airport':
      return vehicleId ? getAirportFaresForVehicle(vehicleId) : getAirportFares();
    default:
      return Promise.resolve({});
  }
}

// Helper function to build a fallback URL when outstation-fares.php is not available
function getFallbackOutstationUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';
  // Try to use the vehicle_pricing table directly as a fallback
  return `${baseUrl}/api/vehicle-pricing.php?trip_type=outstation`;
}

// Outstation Fares - use vehicle_pricing table with fallbacks
async function getOutstationFares(origin?: string, destination?: string): Promise<Record<string, OutstationFare>> {
  try {
    // Always force a refresh of fares by skipping cache
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';
    const timestamp = Date.now();

    console.log('Fetching outstation fares with timestamp:', timestamp);

    try {
      // First try the main outstation-fares.php endpoint
      const response = await axios.get(`${baseUrl}/api/outstation-fares.php`, {
        params: { 
          origin,
          destination,
          _t: timestamp, // Cache busting
          force: 'true',
          source: 'vehicle_pricing', // Force using vehicle_pricing table
          check_sync: 'true' // Add check_sync param to ensure tables are in sync
        },
        headers: getBypassHeaders(),
        timeout: 5000 // 5 second timeout
      });

      if (response.data && response.data.fares) {
        console.log('Outstation fares fetched successfully:', response.data);
        // Cache the fares
        localStorage.setItem('outstation_fares', JSON.stringify(response.data.fares));
        localStorage.setItem('outstation_fares_timestamp', timestamp.toString());

        return response.data.fares;
      }
    } catch (mainError) {
      console.error('Error fetching from outstation-fares.php:', mainError);

      // Try the fallback URL
      console.log('Trying fallback URL for outstation fares');
      try {
        const fallbackUrl = getFallbackOutstationUrl();
        const fallbackResponse = await axios.get(fallbackUrl, {
          params: { 
            _t: timestamp, // Cache busting
            force: 'true'
          },
          headers: getBypassHeaders(),
          timeout: 5000 // 5 second timeout
        });

        if (fallbackResponse.data && fallbackResponse.data.fares) {
          console.log('Outstation fares fetched from fallback URL:', fallbackResponse.data);
          // Cache the fares
          localStorage.setItem('outstation_fares', JSON.stringify(fallbackResponse.data.fares));
          localStorage.setItem('outstation_fares_timestamp', timestamp.toString());

          return fallbackResponse.data.fares;
        }
      } catch (fallbackError) {
        console.error('Error fetching from fallback outstation URL:', fallbackError);
      }
    }

    // If both tries failed, try to return cached fares
    const cachedFares = localStorage.getItem('outstation_fares');
    if (cachedFares) {
      console.log('Using cached outstation fares');
      return JSON.parse(cachedFares);
    }

    // Return default fallback fares if all else fails
    console.warn('No outstation fares available, using defaults');
    return generateDefaultOutstationFares();
  } catch (error) {
    console.error('Error fetching outstation fares:', error);

    // Try to return cached fares if available, even if they are old
    const cachedFares = localStorage.getItem('outstation_fares');
    if (cachedFares) {
      return JSON.parse(cachedFares);
    }

    return generateDefaultOutstationFares();
  }
}

// Generate default outstation fares with dynamic tier pricing
function generateDefaultOutstationFares(): Record<string, OutstationFare> {
  console.log('Generating default outstation fares with tier pricing');
  return {
    'sedan': {
      basePrice: 4200,
      pricePerKm: 14,
      driverAllowance: 250,
      nightHaltCharge: 700,
      roundTripBasePrice: 3780,
      roundTripPricePerKm: 12,
      // Dynamic tier pricing for one-way trips (35km to 149km)
      tier1Price: 3500, // 35-50 km
      tier2Price: 4200, // 51-75 km
      tier3Price: 4900, // 76-100 km
      tier4Price: 5600, // 101-149 km
      extraKmCharge: 14, // For distances beyond 149km
      // Configurable tier distance ranges
      tier1MinKm: 35,
      tier1MaxKm: 50,
      tier2MinKm: 51,
      tier2MaxKm: 75,
      tier3MinKm: 76,
      tier3MaxKm: 100,
      tier4MinKm: 101,
      tier4MaxKm: 149
    },
    'ertiga': {
      basePrice: 5400,
      pricePerKm: 18,
      driverAllowance: 250,
      nightHaltCharge: 1000,
      roundTripBasePrice: 4860,
      roundTripPricePerKm: 15,
      // Dynamic tier pricing for one-way trips
      tier1Price: 4500, // 35-50 km
      tier2Price: 5400, // 51-75 km
      tier3Price: 6300, // 76-100 km
      tier4Price: 7200, // 101-149 km
      extraKmCharge: 18,
      // Configurable tier distance ranges
      tier1MinKm: 35,
      tier1MaxKm: 50,
      tier2MinKm: 51,
      tier2MaxKm: 75,
      tier3MinKm: 76,
      tier3MaxKm: 100,
      tier4MinKm: 101,
      tier4MaxKm: 149
    },
    'innova': {
      basePrice: 6000,
      pricePerKm: 20,
      driverAllowance: 250,
      nightHaltCharge: 1000,
      roundTripBasePrice: 5400,
      roundTripPricePerKm: 17,
      // Dynamic tier pricing for one-way trips
      tier1Price: 5000, // 35-50 km
      tier2Price: 6000, // 51-75 km
      tier3Price: 7000, // 76-100 km
      tier4Price: 8000, // 101-149 km
      extraKmCharge: 20,
      // Configurable tier distance ranges
      tier1MinKm: 35,
      tier1MaxKm: 50,
      tier2MinKm: 51,
      tier2MaxKm: 75,
      tier3MinKm: 76,
      tier3MaxKm: 100,
      tier4MinKm: 101,
      tier4MaxKm: 149
    },
    'innova_crysta': {
      basePrice: 6500,
      pricePerKm: 22,
      driverAllowance: 300,
      nightHaltCharge: 1200,
      roundTripBasePrice: 5850,
      roundTripPricePerKm: 19,
      // Dynamic tier pricing for one-way trips
      tier1Price: 5500, // 35-50 km
      tier2Price: 6500, // 51-75 km
      tier3Price: 7500, // 76-100 km
      tier4Price: 8500, // 101-149 km
      extraKmCharge: 22,
      // Configurable tier distance ranges
      tier1MinKm: 35,
      tier1MaxKm: 50,
      tier2MinKm: 51,
      tier2MaxKm: 75,
      tier3MinKm: 76,
      tier3MaxKm: 100,
      tier4MinKm: 101,
      tier4MaxKm: 149
    },
    'tempo': {
      basePrice: 8000,
      pricePerKm: 25,
      driverAllowance: 300,
      nightHaltCharge: 1200,
      roundTripBasePrice: 7200,
      roundTripPricePerKm: 21,
      // Dynamic tier pricing for one-way trips
      tier1Price: 6500, // 35-50 km
      tier2Price: 7800, // 51-75 km
      tier3Price: 9100, // 76-100 km
      tier4Price: 10400, // 101-149 km
      extraKmCharge: 25,
      // Configurable tier distance ranges
      tier1MinKm: 35,
      tier1MaxKm: 50,
      tier2MinKm: 51,
      tier2MaxKm: 75,
      tier3MinKm: 76,
      tier3MaxKm: 100,
      tier4MinKm: 101,
      tier4MaxKm: 149
    }
  };
}

// Get outstation fares for a specific vehicle with robust fallbacks
async function getOutstationFaresForVehicle(vehicleId: string): Promise<OutstationFare> {
  try {
    // Try to fetch directly for this vehicle
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';
    const now = Date.now();

    console.log(`Fetching outstation fares for vehicle ${vehicleId} with timestamp:`, now);

    try {
      // First try the main API endpoint
      const response = await axios.get(`${baseUrl}/api/outstation-fares.php`, {
        params: {
          vehicle_id: normalizeVehicleId(vehicleId),
          _t: now, // Cache busting
          force: 'true',
          source: 'vehicle_pricing' // Force using vehicle_pricing table
        },
        headers: getBypassHeaders(),
        timeout: 5000 // 5 second timeout
      });

      if (response.data && response.data.fares && response.data.fares[normalizeVehicleId(vehicleId)]) {
        console.log(`Outstation fares for vehicle ${vehicleId}:`, response.data.fares[normalizeVehicleId(vehicleId)]);
        console.log(`Source table: ${response.data.sourceTable || 'vehicle_pricing'}`);

        // Cache this specific vehicle fare
        const cachedFares = localStorage.getItem('outstation_fares');
        const fares = cachedFares ? JSON.parse(cachedFares) : {};
        fares[normalizeVehicleId(vehicleId)] = response.data.fares[normalizeVehicleId(vehicleId)];
        localStorage.setItem('outstation_fares', JSON.stringify(fares));
        localStorage.setItem('outstation_fares_timestamp', now.toString());

        return response.data.fares[normalizeVehicleId(vehicleId)];
      }
    } catch (mainError) {
      console.error(`Error fetching outstation fares for vehicle ${vehicleId} from main endpoint:`, mainError);

      // Try fallback vehicle_pricing endpoint directly
      try {
        console.log(`Trying fallback for vehicle ${vehicleId}`);
        const fallbackUrl = `${baseUrl}/api/vehicle-pricing.php`;
        const fallbackResponse = await axios.get(fallbackUrl, {
          params: {
            vehicle_id: normalizeVehicleId(vehicleId),
            trip_type: 'outstation',
            _t: now,
            force: 'true'
          },
          headers: getBypassHeaders(),
          timeout: 5000
        });

        if (fallbackResponse.data && fallbackResponse.data.prices) {
          console.log(`Retrieved vehicle pricing for ${vehicleId} from fallback:`, fallbackResponse.data);

          // Convert vehicle_pricing format to OutstationFare format
          const pricing = fallbackResponse.data.prices;
          const fare: OutstationFare = {
            basePrice: pricing.base_fare || 0,
            pricePerKm: pricing.price_per_km || 0,
            driverAllowance: pricing.driver_allowance || 250,
            nightHaltCharge: pricing.night_halt_charge || 300,
            roundTripBasePrice: pricing.round_trip_base_fare || pricing.base_fare * 0.9 || 0,
            roundTripPricePerKm: pricing.round_trip_price_per_km || pricing.price_per_km * 0.85 || 0
          };

          // Cache this fare
          const cachedFares = localStorage.getItem('outstation_fares');
          const fares = cachedFares ? JSON.parse(cachedFares) : {};
          fares[normalizeVehicleId(vehicleId)] = fare;
          localStorage.setItem('outstation_fares', JSON.stringify(fares));
          localStorage.setItem('outstation_fares_timestamp', now.toString());

          return fare;
        }
      } catch (fallbackError) {
        console.error(`Error fetching from fallback for ${vehicleId}:`, fallbackError);
      }
    }

    // If direct fetches failed, try to get all fares
    console.warn(`No specific fare found for vehicle ${vehicleId}, fetching all fares`);
    const allFares = await getOutstationFares();
    if (allFares && allFares[normalizeVehicleId(vehicleId)]) {
      return allFares[normalizeVehicleId(vehicleId)];
    }

    // Try to find in cache as a last resort
    const cachedFares = localStorage.getItem('outstation_fares');
    if (cachedFares) {
      const fares = JSON.parse(cachedFares);
      if (fares[normalizeVehicleId(vehicleId)]) {
        return fares[normalizeVehicleId(vehicleId)];
      }
    }

    console.warn(`No outstation fare found for vehicle ${vehicleId}, using defaults`);
    // Return default values based on vehicle type with tier pricing
    const defaultFares = generateDefaultOutstationFares();
    const normalizedId = normalizeVehicleId(vehicleId);
    
    if (defaultFares[normalizedId]) {
      return defaultFares[normalizedId];
    }
    
    // Fallback for unknown vehicle types with tier pricing
    return {
      basePrice: normalizedId.includes('sedan') ? 4200 : 
                normalizedId.includes('ertiga') ? 5400 : 
                normalizedId.includes('innova') ? 6000 : 5000,
      pricePerKm: normalizedId.includes('sedan') ? 14 : 
                 normalizedId.includes('ertiga') ? 18 : 
                 normalizedId.includes('innova') ? 20 : 16,
      driverAllowance: 250,
      nightHaltCharge: 300,
      roundTripBasePrice: normalizedId.includes('sedan') ? 3780 : 
                        normalizedId.includes('ertiga') ? 4860 : 
                        normalizedId.includes('innova') ? 5400 : 4500,
      roundTripPricePerKm: normalizedId.includes('sedan') ? 12 : 
                         normalizedId.includes('ertiga') ? 15 : 
                         normalizedId.includes('innova') ? 17 : 14,
      // Default tier pricing
      tier1Price: normalizedId.includes('sedan') ? 3500 : 
                 normalizedId.includes('ertiga') ? 4500 : 
                 normalizedId.includes('innova') ? 5000 : 4000,
      tier2Price: normalizedId.includes('sedan') ? 4200 : 
                 normalizedId.includes('ertiga') ? 5400 : 
                 normalizedId.includes('innova') ? 6000 : 4800,
      tier3Price: normalizedId.includes('sedan') ? 4900 : 
                 normalizedId.includes('ertiga') ? 6300 : 
                 normalizedId.includes('innova') ? 7000 : 5600,
      tier4Price: normalizedId.includes('sedan') ? 5600 : 
                 normalizedId.includes('ertiga') ? 7200 : 
                 normalizedId.includes('innova') ? 8000 : 6400,
      extraKmCharge: normalizedId.includes('sedan') ? 14 : 
                    normalizedId.includes('ertiga') ? 18 : 
                    normalizedId.includes('innova') ? 20 : 16,
      // Default tier distance ranges
      tier1MinKm: 35,
      tier1MaxKm: 50,
      tier2MinKm: 51,
      tier2MaxKm: 75,
      tier3MinKm: 76,
      tier3MaxKm: 100,
      tier4MinKm: 101,
      tier4MaxKm: 149
    };
  } catch (error) {
    console.error(`Error fetching outstation fares for vehicle ${vehicleId}:`, error);

    // Return default values based on vehicle type with tier pricing
    const normalizedId = normalizeVehicleId(vehicleId);
    return {
      basePrice: normalizedId.includes('sedan') ? 4200 : 
                normalizedId.includes('ertiga') ? 5400 : 
                normalizedId.includes('innova') ? 6000 : 5000,
      pricePerKm: normalizedId.includes('sedan') ? 14 : 
                 normalizedId.includes('ertiga') ? 18 : 
                 normalizedId.includes('innova') ? 20 : 16,
      driverAllowance: 250,
      nightHaltCharge: 300,
      roundTripBasePrice: normalizedId.includes('sedan') ? 3780 : 
                        normalizedId.includes('ertiga') ? 4860 : 
                        normalizedId.includes('innova') ? 5400 : 4500,
      roundTripPricePerKm: normalizedId.includes('sedan') ? 12 : 
                         normalizedId.includes('ertiga') ? 15 : 
                         normalizedId.includes('innova') ? 17 : 14,
      // Default tier pricing
      tier1Price: normalizedId.includes('sedan') ? 3500 : 
                 normalizedId.includes('ertiga') ? 4500 : 
                 normalizedId.includes('innova') ? 5000 : 4000,
      tier2Price: normalizedId.includes('sedan') ? 4200 : 
                 normalizedId.includes('ertiga') ? 5400 : 
                 normalizedId.includes('innova') ? 6000 : 4800,
      tier3Price: normalizedId.includes('sedan') ? 4900 : 
                 normalizedId.includes('ertiga') ? 6300 : 
                 normalizedId.includes('innova') ? 7000 : 5600,
      tier4Price: normalizedId.includes('sedan') ? 5600 : 
                 normalizedId.includes('ertiga') ? 7200 : 
                 normalizedId.includes('innova') ? 8000 : 6400,
      extraKmCharge: normalizedId.includes('sedan') ? 14 : 
                    normalizedId.includes('ertiga') ? 18 : 
                    normalizedId.includes('innova') ? 20 : 16,
      // Default tier distance ranges
      tier1MinKm: 35,
      tier1MaxKm: 50,
      tier2MinKm: 51,
      tier2MaxKm: 75,
      tier3MinKm: 76,
      tier3MaxKm: 100,
      tier4MinKm: 101,
      tier4MaxKm: 149
    };
  }
}

// Local Fares - with fallbacks
async function getLocalFares(): Promise<Record<string, LocalFare>> {
  try {
    // Always fetch fares from API
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const timestamp = Date.now();

    console.log('Fetching local fares with timestamp:', timestamp);

    const response = await axios.get(`${baseUrl}/api/local-fares.php`, {
      params: { 
        _t: timestamp, // Cache busting
        force: 'true',
        source: 'vehicle_pricing' // Force using vehicle_pricing table
      },
      headers: getBypassHeaders()
    });

    if (response.data && response.data.fares) {
      console.log('Local fares fetched successfully:', response.data);
      // Cache the fares
      localStorage.setItem('local_fares', JSON.stringify(response.data.fares));
      localStorage.setItem('local_fares_timestamp', timestamp.toString());

      return response.data.fares;
    }

    console.warn('No local fares returned from API');
    return {};
  } catch (error) {
    console.error('Error fetching local fares:', error);

    // Try to return cached fares if available, even if they are old
    const cachedFares = localStorage.getItem('local_fares');
    if (cachedFares) {
      return JSON.parse(cachedFares);
    }

    return {};
  }
}

// Get local fares for a specific vehicle with fallbacks
async function getLocalFaresForVehicle(vehicleId: string): Promise<LocalFare> {
  try {
    // Always fetch fresh data - skip the cache check
    // Try to fetch directly for this vehicle
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const now = Date.now();

    console.log(`Fetching local fares for vehicle ${vehicleId} with timestamp:`, now);

    const response = await axios.get(`${baseUrl}/api/local-fares.php`, {
      params: {
        vehicle_id: normalizeVehicleId(vehicleId),
        _t: now, // Cache busting
        force: 'true',
        source: 'vehicle_pricing' // Force using vehicle_pricing table
      },
      headers: getBypassHeaders()
    });

    if (response.data && response.data.fares && response.data.fares[normalizeVehicleId(vehicleId)]) {
      console.log(`Local fares for vehicle ${vehicleId}:`, response.data.fares[normalizeVehicleId(vehicleId)]);
      console.log(`Source table: ${response.data.sourceTable || 'vehicle_pricing'}`);

      // Cache this specific vehicle fare
      const cachedFares = localStorage.getItem('local_fares');
      const fares = cachedFares ? JSON.parse(cachedFares) : {};
      fares[normalizeVehicleId(vehicleId)] = response.data.fares[normalizeVehicleId(vehicleId)];
      localStorage.setItem('local_fares', JSON.stringify(fares));
      localStorage.setItem('local_fares_timestamp', now.toString());

      return response.data.fares[normalizeVehicleId(vehicleId)];
    }

    // If direct fetch failed, try to get all fares
    console.warn(`No specific local fare found for vehicle ${vehicleId}, fetching all fares`);
    const allFares = await getLocalFares();
    if (allFares && allFares[normalizeVehicleId(vehicleId)]) {
      return allFares[normalizeVehicleId(vehicleId)];
    }

    // Return default values if no data found
    return {
      price4hrs40km: 0,
      price8hrs80km: 0,
      price10hrs100km: 0,
      priceExtraKm: 0,
      priceExtraHour: 0
    };
  } catch (error) {
    console.error(`Error fetching local fares for vehicle ${vehicleId}:`, error);

    // Try to get from cache if available
    const cachedFares = localStorage.getItem('local_fares');
    if (cachedFares) {
      const fares = JSON.parse(cachedFares);
      if (fares[normalizeVehicleId(vehicleId)]) {
        return fares[normalizeVehicleId(vehicleId)];
      }
    }

    // Return default values if error
    return {
      price4hrs40km: 0,
      price8hrs80km: 0,
      price10hrs100km: 0,
      priceExtraKm: 0,
      priceExtraHour: 0
    };
  }
}

// Airport Fares - with proper airport_transfer_fares table integration
async function getAirportFares(): Promise<Record<string, AirportFare>> {
  try {
    // Always force refresh to get the latest data
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const timestamp = Date.now();

    console.log('Fetching airport fares with timestamp:', timestamp);

    const response = await axios.get(`${baseUrl}/api/airport-fares.php`, {
      params: { 
        _t: timestamp, // Cache busting
        force: 'true',
        source: 'airport_transfer_fares' // Force using airport_transfer_fares table specifically
      },
      headers: getBypassHeaders()
    });

    if (response.data && response.data.fares) {
      console.log('Airport fares fetched successfully:', response.data);
      // Cache the fares
      localStorage.setItem('airport_fares', JSON.stringify(response.data.fares));
      localStorage.setItem('airport_fares_timestamp', timestamp.toString());

      return response.data.fares;
    }

    console.warn('No airport fares returned from API');
    return {};
  } catch (error) {
    console.error('Error fetching airport fares:', error);

    // Try to return cached fares if available, even if they are old
    const cachedFares = localStorage.getItem('airport_fares');
    if (cachedFares) {
      return JSON.parse(cachedFares);
    }

    return {};
  }
}

// Get airport fares for a specific vehicle with improved airport_transfer_fares table support
async function getAirportFaresForVehicle(vehicleId: string): Promise<AirportFare> {
  try {
    // Normalize vehicle ID to match database convention (handle casing and special chars)
    const normalizedVehicleId = normalizeVehicleId(vehicleId);

    console.log(`Fetching airport fares for vehicle ${vehicleId} (normalized: ${normalizedVehicleId}) with timestamp:`, Date.now());

    // Try to fetch directly from the airport_transfer_fares table
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const now = Date.now();

    // First try with the original vehicle ID
    let response = await axios.get(`${baseUrl}/api/direct-airport-fares.php`, {
      params: {
        vehicle_id: vehicleId,
        _t: now,
        force: 'true',
        source: 'airport_transfer_fares' // Explicitly specify the table
      },
      headers: getBypassHeaders()
    });

    // If no results with original ID, try with normalized ID
    if ((!response.data || !response.data.fares || 
        (Array.isArray(response.data.fares) && response.data.fares.length === 0) ||
        (!Array.isArray(response.data.fares) && Object.keys(response.data.fares).length === 0)) && 
        vehicleId !== normalizedVehicleId) {
      console.log(`No results with original ID, trying normalized ID: ${normalizedVehicleId}`);
      response = await axios.get(`${baseUrl}/api/direct-airport-fares.php`, {
        params: {
          vehicle_id: normalizedVehicleId,
          _t: now,
          force: 'true',
          source: 'airport_transfer_fares'
        },
        headers: getBypassHeaders()
      });
    }

    // Log how the API data looks to help debug
    console.log(`Airport fares API response:`, response.data);

    // Process the API response to extract fare data
    let fare: AirportFare | null = null;

    if (response.data && response.data.fares) {
      if (Array.isArray(response.data.fares) && response.data.fares.length > 0) {
        // Find the matching fare in the array
        const matchingFare = response.data.fares.find((f: any) => {
          const faresVehicleId = f.vehicle_id || f.vehicleId || '';
          return faresVehicleId.toLowerCase() === vehicleId.toLowerCase() || 
                 faresVehicleId.toLowerCase() === normalizedVehicleId.toLowerCase();
        });

        if (matchingFare) {
          console.log(`Found matching fare in array:`, matchingFare);
          fare = convertToAirportFare(matchingFare);
        } else {
          console.log(`No matching fare found in array, using first:`, response.data.fares[0]);
          fare = convertToAirportFare(response.data.fares[0]);
        }
      } else if (typeof response.data.fares === 'object' && response.data.fares !== null) {
        // Check if there's a direct match in the object
        if (response.data.fares[vehicleId]) {
          console.log(`Found direct match in fares object:`, response.data.fares[vehicleId]);
          fare = convertToAirportFare(response.data.fares[vehicleId]);
        } else if (response.data.fares[normalizedVehicleId]) {
          console.log(`Found normalized match in fares object:`, response.data.fares[normalizedVehicleId]);
          fare = convertToAirportFare(response.data.fares[normalizedVehicleId]);
        } else {
          // Try a case-insensitive match
          const keys = Object.keys(response.data.fares);
          const matchingKey = keys.find(key => key.toLowerCase() === vehicleId.toLowerCase() || 
                                              key.toLowerCase() ===normalizedVehicleId.toLowerCase());

          if (matchingKey) {
            console.log(`Found case-insensitive match in fares object:`, response.data.fares[matchingKey]);
            fare = convertToAirportFare(response.data.fares[matchingKey]);
          }
        }
      }
    }

    // If we found a fare, cache it and return it
    if (fare) {
      console.log(`Processed airport fare for ${vehicleId}:`, fare);

            // Cache this specific vehicle fare
      const cachedFares = localStorage.getItem('airport_fares');
      const fares = cachedFares? JSON.parse(cachedFares) : {};
      fares[vehicleId] = fare;
      localStorage.setItem('airport_fares', JSON.stringify(fares));
      localStorage.setItem('airport_fares_timestamp', now.toString());

      return fare;
    }

    // If direct fetch failed, try to get all fares
    console.warn(`No specific airport fare found for vehicle ${vehicleId}, fetching all fares`);
    const allFares = await getAirportFares();

    if (allFares) {
      // Try exact match first
      if (allFares[vehicleId]) {
        console.log(`Found ${vehicleId} in all fares`);
        return allFares[vehicleId];
      }

      // Try normalized ID
      if (allFares[normalizedVehicleId]) {
        console.log(`Found ${normalizedVehicleId} in all fares`);
        return allFares[normalizedVehicleId];
      }

      // Try case-insensitive match
      const keys = Object.keys(allFares);
      const caseInsensitiveMatch = keys.find(key => 
        key.toLowerCase() === vehicleId.toLowerCase() || 
        key.toLowerCase() === normalizedVehicleId.toLowerCase()
      );

      if (caseInsensitiveMatch) {
        console.log(`Found case-insensitive match ${caseInsensitiveMatch} in all fares`);
        return allFares[caseInsensitiveMatch];
      }
    }

    console.warn(`No airport fare found for vehicle ${vehicleId}, generating default`);
    // Generate a default fare based on vehicle type
    return generateDefaultAirportFare(vehicleId);
  } catch (error) {
    console.error(`Error fetching airport fares for vehicle ${vehicleId}:`, error);

    // Try to get from cache if available
    const cachedFares = localStorage.getItem('airport_fares');
    if (cachedFares) {
      const fares = JSON.parse(cachedFares);

      // Try exact match
      if (fares[vehicleId]) {
        return fares[vehicleId];
      }

      // Try normalized ID
      const normalizedVehicleId = normalizeVehicleId(vehicleId);
      if (fares[normalizedVehicleId]) {
        return fares[normalizedVehicleId];
      }

      // Try case-insensitive match
      const keys = Object.keys(fares);
      const caseInsensitiveMatch = keys.find(key => 
        key.toLowerCase() === vehicleId.toLowerCase() || 
        key.toLowerCase() === normalizedVehicleId.toLowerCase()
      );

      if (caseInsensitiveMatch) {
        return fares[caseInsensitiveMatch];
      }
    }

    // Return default values based on vehicle type
    return generateDefaultAirportFare(vehicleId);
  }
}

// Helper to convert API response to AirportFare type
function convertToAirportFare(data: any): AirportFare {
  return {
    basePrice: parseFloat(data.basePrice || data.base_price || 0),
    pricePerKm: parseFloat(data.pricePerKm || data.price_per_km || 0),
    pickupPrice: parseFloat(data.pickupPrice || data.pickup_price || 0),
    dropPrice: parseFloat(data.dropPrice || data.drop_price || 0),
    tier1Price: parseFloat(data.tier1Price || data.tier1_price || 0),
    tier2Price: parseFloat(data.tier2Price || data.tier2_price || 0),
    tier3Price: parseFloat(data.tier3Price || data.tier3_price || 0),
    tier4Price: parseFloat(data.tier4Price || data.tier4_price || 0),
    extraKmCharge: parseFloat(data.extraKmCharge || data.extra_km_charge || 0)
  };
}

// Generate default airport fares based on vehicle type
function generateDefaultAirportFare(vehicleId: string): AirportFare {
  // Normalize vehicle ID for matching
  const normalizedId = normalizeVehicleId(vehicleId);

  // Default values based on vehicle types in the database
  if (normalizedId.includes('sedan') || normalizedId === 'toyota' || normalizedId === 'dzire cng') {
    return {
      basePrice: 800,
      pricePerKm: 14,
      pickupPrice: 800,
      dropPrice: 800,
      tier1Price: 800,
      tier2Price: 1000,
      tier3Price: 1000,
      tier4Price: 1200,
      extraKmCharge: 12
    };
  } else if (normalizedId.includes('ertiga')) {
    return {
      basePrice: 1000,
      pricePerKm: 15,
      pickupPrice: 1000,
      dropPrice: 1000,
      tier1Price: 800,
      tier2Price: 1000,
      tier3Price: 1200,
      tier4Price: 1400,
      extraKmCharge: 15
    };
  } else if (normalizedId.includes('innova') || normalizedId === 'mpv') {
    return {
      basePrice: 1200,
      pricePerKm: 17,
      pickupPrice: 1200,
      dropPrice: 1200,
      tier1Price: 1000,
      tier2Price: 1200,
      tier3Price: 1400,
      tier4Price: 1600,
      extraKmCharge: 17
    };
  } else if (normalizedId.includes('tempo')) {
    return {
      basePrice: 2000,
      pricePerKm: 19,
      pickupPrice: 2000,
      dropPrice: 2000,
      tier1Price: 1600,
      tier2Price: 1800,
      tier3Price: 2000,
      tier4Price: 2500,
      extraKmCharge: 19
    };
  }

  // Generic default for unknown vehicle types
  return {
    basePrice: 1000,
    pricePerKm: 15,
    pickupPrice: 1000,
    dropPrice: 1000,
    tier1Price: 1000,
    tier2Price: 1200,
    tier3Price: 1400,
    tier4Price: 1600,
    extraKmCharge: 15
  };
}

// Normalize vehicle ID - critically important
function normalizeVehicleId(vehicleId: string): string {
  if (!vehicleId) return '';
  return vehicleId.trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

// Create the fareService object with all methods
export const fareService = {
  clearCache: clearFareCache,
  resetCabOptionsState,
  getBypassHeaders,
  getForcedRequestConfig,
  initializeDatabase,
  directFareUpdate,
  forceSyncOutstationFares,
  syncOutstationFares,
  syncLocalFareTables,
  getOutstationFares,
  getLocalFares,
  getAirportFares,
  getOutstationFaresForVehicle,
  getLocalFaresForVehicle,
  getAirportFaresForVehicle,
  getFaresByTripType,
  // Add the new helper functions
  convertToAirportFare,
  generateDefaultAirportFare,
  normalizeVehicleId
};

// Export individual functions for direct imports
export {
  clearFareCache,
  resetCabOptionsState,
  getBypassHeaders,
  getForcedRequestConfig,
  initializeDatabase,
  directFareUpdate,
  forceSyncOutstationFares,
  syncOutstationFares,
  syncLocalFareTables,
  getOutstationFares,
  getLocalFares,
  getAirportFares,
  getOutstationFaresForVehicle,
  getLocalFaresForVehicle,
  getAirportFaresForVehicle,
  getFaresByTripType,
  normalizeVehicleId
};