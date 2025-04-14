import { toast } from 'sonner';
import fareStateManager from './FareStateManager';
import { getApiUrl, getBypassHeaders } from '@/config/api';
import { OutstationFareData } from '@/types/cab';

if (!fareStateManager.storeOutstationFare) {
  fareStateManager.storeOutstationFare = async (vehicleId: string, fareData: any) => {
    console.log('FareStateManager.storeOutstationFare polyfill called', vehicleId, fareData);
    try {
      if (typeof fareStateManager.updateInternalCache === 'function') {
        fareStateManager.updateInternalCache('outstation', vehicleId, fareData);
      }
      return true;
    } catch (e) {
      console.error('Failed to update internal cache:', e);
      return false;
    }
  };
}

const outstationFareCache = new Map<string, { data: OutstationFareData, timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000;

/**
 * Fetch outstation fare for a specific vehicle
 */
export const fetchOutstationFare = async (vehicleId: string): Promise<OutstationFareData | null> => {
  try {
    console.log(`Fetching outstation fare for vehicle ${vehicleId}`);
    
    if (!vehicleId) {
      console.error('Vehicle ID is required for fetchOutstationFare');
      return null;
    }
    
    const cachedFare = outstationFareCache.get(vehicleId);
    if (cachedFare && Date.now() - cachedFare.timestamp < CACHE_DURATION) {
      console.log(`Using cached outstation fare for ${vehicleId}`);
      return cachedFare.data;
    }
    
    const fareData = await fareStateManager.getOutstationFareForVehicle(vehicleId);
    
    if (fareData) {
      console.log(`Retrieved outstation fare from FareStateManager for ${vehicleId}`, fareData);
      
      const standardizedData: OutstationFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        oneWayBasePrice: parseFloat(String(fareData.basePrice || fareData.oneWayBasePrice || fareData.one_way_base_price || 0)),
        oneWayPricePerKm: parseFloat(String(fareData.pricePerKm || fareData.oneWayPricePerKm || fareData.one_way_price_per_km || 0)),
        roundTripBasePrice: parseFloat(String(fareData.roundTripBasePrice || fareData.round_trip_base_price || 0)),
        roundTripPricePerKm: parseFloat(String(fareData.roundTripPricePerKm || fareData.round_trip_price_per_km || 0)),
        driverAllowance: parseFloat(String(fareData.driverAllowance || fareData.driver_allowance || 250)),
        nightHaltCharge: parseFloat(String(fareData.nightHaltCharge || fareData.night_halt_charge || 700))
      };
      
      if (standardizedData.oneWayBasePrice <= 0 || 
          standardizedData.oneWayPricePerKm <= 0 || 
          standardizedData.roundTripBasePrice <= 0 || 
          standardizedData.roundTripPricePerKm <= 0) {
        console.warn(`Retrieved outstation fare has invalid values for vehicle ${vehicleId}`, standardizedData);
      } else {
        outstationFareCache.set(vehicleId, {
          data: standardizedData,
          timestamp: Date.now()
        });
        
        return standardizedData;
      }
    }
    
    const response = await fetch(
      getApiUrl(`api/admin/direct-outstation-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
      { headers: getBypassHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fares) {
      let fareItem;
      
      if (data.fares[vehicleId]) {
        fareItem = data.fares[vehicleId];
      } else if (Array.isArray(data.fares) && data.fares.length > 0) {
        fareItem = data.fares.find((fare: any) => 
          fare.vehicleId === vehicleId || 
          fare.vehicle_id === vehicleId
        );
      } else if (Object.keys(data.fares).length > 0) {
        const keys = Object.keys(data.fares);
        fareItem = data.fares[keys[0]];
        console.warn(`Could not find exact fare match for ${vehicleId}, using ${keys[0]} as fallback`);
      }
      
      if (!fareItem) {
        console.error(`No fare found for vehicle ${vehicleId} in API response`);
        return null;
      }
      
      const fareData: OutstationFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        oneWayBasePrice: parseFloat(String(fareItem.basePrice || fareItem.oneWayBasePrice || fareItem.one_way_base_price || 0)),
        oneWayPricePerKm: parseFloat(String(fareItem.pricePerKm || fareItem.oneWayPricePerKm || fareItem.one_way_price_per_km || 0)),
        roundTripBasePrice: parseFloat(String(fareItem.roundTripBasePrice || fareItem.round_trip_base_price || 0)),
        roundTripPricePerKm: parseFloat(String(fareItem.roundTripPricePerKm || fareItem.round_trip_price_per_km || 0)),
        driverAllowance: parseFloat(String(fareItem.driverAllowance || fareItem.driver_allowance || 250)),
        nightHaltCharge: parseFloat(String(fareItem.nightHaltCharge || fareItem.night_halt_charge || 700))
      };
      
      if (fareData.roundTripBasePrice <= 0 && fareData.oneWayBasePrice > 0) {
        fareData.roundTripBasePrice = fareData.oneWayBasePrice * 0.95;
      }
      
      if (fareData.roundTripPricePerKm <= 0 && fareData.oneWayPricePerKm > 0) {
        fareData.roundTripPricePerKm = fareData.oneWayPricePerKm * 0.85;
      }
      
      if (fareData.oneWayBasePrice <= 0 || 
          fareData.oneWayPricePerKm <= 0 || 
          fareData.roundTripBasePrice <= 0 || 
          fareData.roundTripPricePerKm <= 0) {
        console.warn(`Direct API returned invalid outstation fare for vehicle ${vehicleId}`, fareData);
        return null;
      }
      
      outstationFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
      fareStateManager.storeOutstationFare(vehicleId, fareData);
      
      return fareData;
    }
    
    throw new Error('No valid fare data found in the response');
  } catch (error) {
    console.error(`Error fetching outstation fare for ${vehicleId}:`, error);
    return null;
  }
};

export const updateOutstationFare = async (fareData: OutstationFareData): Promise<boolean> => {
  try {
    console.log(`Updating outstation fare for vehicle ${fareData.vehicleId}`, fareData);
    
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    const formData = new FormData();
    formData.append('vehicle_id', fareData.vehicleId);
    formData.append('basePrice', String(fareData.oneWayBasePrice));
    formData.append('pricePerKm', String(fareData.oneWayPricePerKm));
    formData.append('roundTripBasePrice', String(fareData.roundTripBasePrice));
    formData.append('roundTripPricePerKm', String(fareData.roundTripPricePerKm));
    formData.append('driverAllowance', String(fareData.driverAllowance));
    formData.append('nightHaltCharge', String(fareData.nightHaltCharge));
    
    formData.append('oneWayBasePrice', String(fareData.oneWayBasePrice));
    formData.append('oneWayPricePerKm', String(fareData.oneWayPricePerKm));
    
    const response = await fetch(getApiUrl('api/admin/direct-outstation-fares.php'), {
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
    
    if (result.status === 'success') {
      console.log('Outstation fare update successful:', result);
      
      outstationFareCache.delete(fareData.vehicleId);
      fareStateManager.clearCache();
      
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after outstation fare update');
        });
      }, 1000);
      
      toast("Outstation fare updated successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error updating outstation fare');
    }
  } catch (error) {
    console.error('Error updating outstation fare:', error);
    
    toast(`Failed to update outstation fare: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

export const initializeOutstationFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/admin/outstation-fares.php?init=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Outstation fare tables initialized:', result);
      
      outstationFareCache.clear();
      fareStateManager.clearCache();
      
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after table initialization');
        });
      }, 1000);
      
      toast("Outstation fare tables initialized successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error initializing outstation fare tables');
    }
  } catch (error) {
    console.error('Error initializing outstation fare tables:', error);
    
    toast(`Failed to initialize outstation fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

export const syncOutstationFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/admin/outstation-fares.php?sync=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Outstation fare tables synced:', result);
      
      outstationFareCache.clear();
      fareStateManager.clearCache();
      
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after table sync');
        });
      }, 1000);
      
      toast("Outstation fare tables synced successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error syncing outstation fare tables');
    }
  } catch (error) {
    console.error('Error syncing outstation fare tables:', error);
    
    toast(`Failed to sync outstation fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

export { OutstationFareData };
