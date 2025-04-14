
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
 * Fetch airport fare data from the server
 */
export const fetchAirportFare = async (vehicleId: string): Promise<AirportFareData | null> => {
  if (!vehicleId) {
    console.error('Vehicle ID is required to fetch airport fare');
    return null;
  }
  
  try {
    console.log(`Fetching airport fare for vehicle ID: ${vehicleId}`);
    
    // Try to get from FareStateManager first
    const fareFromCache = await fareStateManager.getAirportFareForVehicle(vehicleId);
    
    if (fareFromCache) {
      console.log(`Airport fare found in cache for ${vehicleId}:`, fareFromCache);
      return fareFromCache as AirportFareData;
    }
    
    // If not in cache, fetch directly from API
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-airport-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${timestamp}`, {
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
    
    // Extract fare data from response
    let fareData = null;
    
    if (data.fares) {
      if (Array.isArray(data.fares)) {
        // Find fare for the requested vehicle
        fareData = data.fares.find((fare: any) => 
          fare.vehicleId === vehicleId || fare.vehicle_id === vehicleId
        );
        
        // If not found by exact match, use the first one (shouldn't happen)
        if (!fareData && data.fares.length > 0) {
          console.warn(`No exact match for ${vehicleId}, using first fare in array`);
          fareData = data.fares[0];
        }
      } else if (typeof data.fares === 'object') {
        // Try to get by vehicle ID
        fareData = data.fares[vehicleId] || null;
      }
    }
    
    if (!fareData) {
      console.warn(`No airport fare data found for ${vehicleId}`);
      return null;
    }
    
    // Normalize field names
    const normalizedFare: AirportFareData = {
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      basePrice: parseFloat(String(fareData.basePrice ?? fareData.base_price ?? 0)),
      pricePerKm: parseFloat(String(fareData.pricePerKm ?? fareData.price_per_km ?? 0)),
      pickupPrice: parseFloat(String(fareData.pickupPrice ?? fareData.pickup_price ?? 0)),
      dropPrice: parseFloat(String(fareData.dropPrice ?? fareData.drop_price ?? 0)),
      tier1Price: parseFloat(String(fareData.tier1Price ?? fareData.tier1_price ?? 0)),
      tier2Price: parseFloat(String(fareData.tier2Price ?? fareData.tier2_price ?? 0)),
      tier3Price: parseFloat(String(fareData.tier3Price ?? fareData.tier3_price ?? 0)),
      tier4Price: parseFloat(String(fareData.tier4Price ?? fareData.tier4_price ?? 0)),
      extraKmCharge: parseFloat(String(fareData.extraKmCharge ?? fareData.extra_km_charge ?? 0))
    };
    
    console.log(`Normalized airport fare for ${vehicleId}:`, normalizedFare);
    
    // Store in FareStateManager for future use
    await fareStateManager.storeAirportFare(vehicleId, normalizedFare);
    
    return normalizedFare;
  } catch (error) {
    console.error(`Error fetching airport fare for ${vehicleId}:`, error);
    return null;
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
