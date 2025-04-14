
import { getBypassHeaders, getAdminRequestConfig } from '@/config/api';
import fareStateManager from './FareStateManager';

export interface OutstationFareData {
  id?: number;
  vehicleId: string;
  vehicle_id?: string;
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  // Add these fields to match the type in OutstationFareManagement.tsx
  oneWayBasePrice?: number;
  oneWayPricePerKm?: number;
}

/**
 * Fetch outstation fare data from the server
 */
export const fetchOutstationFare = async (vehicleId: string): Promise<OutstationFareData | null> => {
  if (!vehicleId) {
    console.error('Vehicle ID is required to fetch outstation fare');
    return null;
  }
  
  try {
    console.log(`Fetching outstation fare for vehicle ID: ${vehicleId}`);
    
    // Try to get from FareStateManager first
    const fareFromCache = await fareStateManager.getOutstationFareForVehicle(vehicleId);
    
    if (fareFromCache) {
      console.log(`Outstation fare found in cache for ${vehicleId}:`, fareFromCache);
      return fareFromCache as OutstationFareData;
    }
    
    // If not in cache, fetch directly from API
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-outstation-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Outstation fare API response:', data);
    
    if (data.status !== 'success') {
      console.warn(`No outstation fare found for vehicle ${vehicleId}`);
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
      console.warn(`No outstation fare data found for ${vehicleId}`);
      return null;
    }
    
    // Normalize field names
    const normalizedFare: OutstationFareData = {
      vehicleId: vehicleId,
      vehicle_id: vehicleId,
      basePrice: parseFloat(String(fareData.basePrice ?? fareData.base_price ?? 0)),
      pricePerKm: parseFloat(String(fareData.pricePerKm ?? fareData.price_per_km ?? 0)),
      nightHaltCharge: parseFloat(String(fareData.nightHaltCharge ?? fareData.night_halt_charge ?? 0)),
      driverAllowance: parseFloat(String(fareData.driverAllowance ?? fareData.driver_allowance ?? 0)),
      roundTripBasePrice: parseFloat(String(fareData.roundTripBasePrice ?? fareData.roundtrip_base_price ?? 0)),
      roundTripPricePerKm: parseFloat(String(fareData.roundTripPricePerKm ?? fareData.roundtrip_price_per_km ?? 0))
    };
    
    console.log(`Normalized outstation fare for ${vehicleId}:`, normalizedFare);
    
    // Store in FareStateManager for future use
    await fareStateManager.storeOutstationFare(vehicleId, normalizedFare);
    
    return normalizedFare;
  } catch (error) {
    console.error(`Error fetching outstation fare for ${vehicleId}:`, error);
    return null;
  }
};

/**
 * Update outstation fare data on the server
 */
export const updateOutstationFare = async (fareData: OutstationFareData): Promise<boolean> => {
  if (!fareData.vehicleId) {
    console.error('Vehicle ID is required to update outstation fare');
    return false;
  }
  
  try {
    console.log(`Updating outstation fare for ${fareData.vehicleId}:`, fareData);
    
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
    formData.append('night_halt_charge', String(fareData.nightHaltCharge));
    formData.append('driver_allowance', String(fareData.driverAllowance));
    formData.append('roundtrip_base_price', String(fareData.roundTripBasePrice));
    formData.append('roundtrip_price_per_km', String(fareData.roundTripPricePerKm));
    
    // Send request
    const response = await fetch('/api/admin/direct-outstation-fares.php', {
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
      throw new Error(result.message || 'Failed to update outstation fare');
    }
    
    // Update in FareStateManager
    await fareStateManager.storeOutstationFare(fareData.vehicleId, fareData);
    
    console.log(`Outstation fare updated successfully for ${fareData.vehicleId}`);
    return true;
  } catch (error) {
    console.error(`Error updating outstation fare for ${fareData.vehicleId}:`, error);
    return false;
  }
};

/**
 * Sync outstation fare tables
 */
export const syncOutstationFareTables = async (): Promise<boolean> => {
  try {
    console.log('Syncing outstation fare tables');
    
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-outstation-fares.php?sync=true&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to sync outstation fare tables');
    }
    
    // Force refresh in FareStateManager
    await fareStateManager.syncFareData();
    
    console.log('Outstation fare tables synced successfully');
    return true;
  } catch (error) {
    console.error('Error syncing outstation fare tables:', error);
    return false;
  }
};

/**
 * Initialize outstation fare tables
 */
export const initializeOutstationFareTables = async (): Promise<boolean> => {
  try {
    console.log('Initializing outstation fare tables');
    
    const timestamp = Date.now();
    const response = await fetch(`/api/admin/direct-outstation-fares.php?initialize=true&_t=${timestamp}`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to initialize outstation fare tables');
    }
    
    // Force refresh in FareStateManager
    await fareStateManager.syncFareData();
    
    console.log('Outstation fare tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing outstation fare tables:', error);
    return false;
  }
};
