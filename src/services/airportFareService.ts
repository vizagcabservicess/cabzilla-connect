
import { getBypassHeaders, getAdminRequestConfig } from '@/config/api';
import fareStateManager from './FareStateManager';

export interface AirportFareData {
  id?: number;
  vehicleId: string;
  vehicle_id?: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

/**
 * Normalize a vehicle ID to ensure consistent lookup
 */
const normalizeVehicleId = (vehicleId: string): string => {
  return vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
};

/**
 * Fetch airport fare data from the server
 */
export const fetchAirportFare = async (vehicleId: string): Promise<AirportFareData | null> => {
  if (!vehicleId) {
    console.error('Vehicle ID is required to fetch airport fare');
    return null;
  }
  
  try {
    console.log(`Fetching airport fares for vehicle ID: ${vehicleId}`);
    
    // Try to get from FareStateManager first
    const fareFromCache = await fareStateManager.getAirportFareForVehicle(vehicleId);
    
    if (fareFromCache) {
      console.log(`Airport fare found in cache for ${vehicleId}:`, fareFromCache);
      return fareFromCache as AirportFareData;
    }
    
    // If not in cache, fetch directly from API with a normalized vehicle ID
    // First, normalize the vehicle ID to ensure consistent casing
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-airport-fares.php?vehicle_id=${encodeURIComponent(normalizedVehicleId)}&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Airport fare API response:', data);
    
    if (data.status !== 'success') {
      console.warn(`No airport fare found for vehicle ${vehicleId}`);
      return null;
    }
    
    // Extract fare data from response with better handling for different response formats
    let fareData = null;
    
    // Try different response formats
    if (data.fares) {
      if (Array.isArray(data.fares)) {
        // Try to find exact match first
        fareData = data.fares.find((fare: any) => 
          normalizeVehicleId(fare.vehicleId || '') === normalizedVehicleId ||
          normalizeVehicleId(fare.vehicle_id || '') === normalizedVehicleId
        );
        
        // If no exact match, try case-insensitive match
        if (!fareData) {
          fareData = data.fares.find((fare: any) => 
            normalizeVehicleId(fare.vehicleId || '') === normalizedVehicleId ||
            normalizeVehicleId(fare.vehicle_id || '') === normalizedVehicleId
          );
        }
        
        // If still no match, use the first one (fallback)
        if (!fareData && data.fares.length > 0) {
          console.warn(`No match for ${vehicleId}, using first fare in array as fallback`);
          fareData = data.fares[0];
        }
      } else if (typeof data.fares === 'object') {
        // Try to get by exact vehicle ID
        fareData = data.fares[vehicleId] || null;
        
        // If no match, try normalized version
        if (!fareData) {
          const keys = Object.keys(data.fares);
          const matchingKey = keys.find(key => normalizeVehicleId(key) === normalizedVehicleId);
          
          if (matchingKey) {
            fareData = data.fares[matchingKey];
          } else if (keys.length > 0) {
            // Fallback to first entry
            console.warn(`No match for ${vehicleId}, using first fare object as fallback`);
            fareData = data.fares[keys[0]];
          }
        }
      }
    }
    
    if (!fareData) {
      console.warn(`No airport fare data found for ${vehicleId}, creating default`);
      // Create default fare data as fallback
      fareData = {
        vehicleId: vehicleId,
        vehicle_id: vehicleId,
        basePrice: 1500, // Increased default base price
        pricePerKm: 15,   // Increased default per km price
        pickupPrice: 600, // Increased default pickup price
        dropPrice: 600,   // Increased default drop price
        tier1Price: 700,  // Adjusted default tier prices
        tier2Price: 1000,
        tier3Price: 1500,
        tier4Price: 1800,
        extraKmCharge: 15
      };
    }
    
    // Normalize field names and ensure all values are numbers
    const normalizedFare: AirportFareData = {
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      basePrice: parseFloat(String(fareData.basePrice ?? fareData.base_price ?? 1500)),
      pricePerKm: parseFloat(String(fareData.pricePerKm ?? fareData.price_per_km ?? 15)),
      pickupPrice: parseFloat(String(fareData.pickupPrice ?? fareData.pickup_price ?? 600)),
      dropPrice: parseFloat(String(fareData.dropPrice ?? fareData.drop_price ?? 600)),
      tier1Price: parseFloat(String(fareData.tier1Price ?? fareData.tier1_price ?? 700)),
      tier2Price: parseFloat(String(fareData.tier2Price ?? fareData.tier2_price ?? 1000)),
      tier3Price: parseFloat(String(fareData.tier3Price ?? fareData.tier3_price ?? 1500)),
      tier4Price: parseFloat(String(fareData.tier4Price ?? fareData.tier4_price ?? 1800)),
      extraKmCharge: parseFloat(String(fareData.extraKmCharge ?? fareData.extra_km_charge ?? 15))
    };
    
    // Ensure no zero values for critical fields
    if (normalizedFare.basePrice <= 0) normalizedFare.basePrice = 1500;
    if (normalizedFare.pricePerKm <= 0) normalizedFare.pricePerKm = 15;
    if (normalizedFare.pickupPrice <= 0) normalizedFare.pickupPrice = 600;
    if (normalizedFare.dropPrice <= 0) normalizedFare.dropPrice = 600;
    
    console.log(`Normalized airport fare for ${vehicleId}:`, normalizedFare);
    
    // Store in FareStateManager for future use
    await fareStateManager.storeAirportFare(vehicleId, normalizedFare);
    
    // Broadcast that we have calculated a fare
    window.dispatchEvent(new CustomEvent('fare-calculated', {
      detail: {
        source: 'database',
        cabId: vehicleId,
        fareType: 'airport',
        timestamp: Date.now()
      }
    }));
    
    return normalizedFare;
  } catch (error) {
    console.error(`Error fetching airport fare for ${vehicleId}:`, error);
    // Return fallback data instead of null
    const fallbackFare: AirportFareData = {
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      basePrice: 1500,
      pricePerKm: 15,
      pickupPrice: 600,
      dropPrice: 600,
      tier1Price: 700,
      tier2Price: 1000,
      tier3Price: 1500,
      tier4Price: 1800,
      extraKmCharge: 15
    };
    
    console.log(`Using fallback airport fare for ${vehicleId} due to error:`, fallbackFare);
    
    // Store fallback in FareStateManager for consistency
    await fareStateManager.storeAirportFare(vehicleId, fallbackFare);
    
    return fallbackFare;
  }
};

/**
 * Update airport fare data on the server
 */
export const updateAirportFare = async (fareData: AirportFareData): Promise<boolean> => {
  if (!fareData.vehicleId) {
    console.error('Vehicle ID is required to update airport fare');
    return false;
  }
  
  try {
    console.log(`Updating airport fare for ${fareData.vehicleId}:`, fareData);
    
    // Create FormData for the request
    const formData = new FormData();
    formData.append('vehicle_id', fareData.vehicleId);
    
    // Add all fare data fields
    Object.entries(fareData).forEach(([key, value]) => {
      if (key !== 'vehicleId' && key !== 'vehicle_id' && key !== 'id') {
        formData.append(key, String(value));
      }
    });
    
    // Also add with underscore format for compatibility
    formData.append('base_price', String(fareData.basePrice));
    formData.append('price_per_km', String(fareData.pricePerKm));
    formData.append('pickup_price', String(fareData.pickupPrice));
    formData.append('drop_price', String(fareData.dropPrice));
    formData.append('tier1_price', String(fareData.tier1Price));
    formData.append('tier2_price', String(fareData.tier2Price));
    formData.append('tier3_price', String(fareData.tier3Price));
    formData.append('tier4_price', String(fareData.tier4Price));
    formData.append('extra_km_charge', String(fareData.extraKmCharge));
    
    // Send request
    const response = await fetch('/api/admin/direct-airport-fares.php', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to update airport fare');
    }
    
    // Update in FareStateManager
    await fareStateManager.storeAirportFare(fareData.vehicleId, fareData);
    
    console.log(`Airport fare updated successfully for ${fareData.vehicleId}`);
    return true;
  } catch (error) {
    console.error(`Error updating airport fare for ${fareData.vehicleId}:`, error);
    return false;
  }
};

/**
 * Sync airport fare tables
 */
export const syncAirportFareTables = async (): Promise<boolean> => {
  try {
    console.log('Syncing airport fare tables');
    
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-airport-fares.php?sync=true&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to sync airport fare tables');
    }
    
    // Force refresh in FareStateManager
    await fareStateManager.syncFareData();
    
    console.log('Airport fare tables synced successfully');
    return true;
  } catch (error) {
    console.error('Error syncing airport fare tables:', error);
    return false;
  }
};

/**
 * Initialize airport fare tables
 */
export const initializeAirportFareTables = async (): Promise<boolean> => {
  try {
    console.log('Initializing airport fare tables');
    
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-airport-fares.php?initialize=true&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to initialize airport fare tables');
    }
    
    // Force refresh in FareStateManager
    await fareStateManager.syncFareData();
    
    console.log('Airport fare tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing airport fare tables:', error);
    return false;
  }
};
