
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';

export interface OutstationFareData {
  vehicleId: string;
  vehicle_id?: string;
  oneWayBasePrice: number;
  oneWayPricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  // Dynamic tier pricing for one-way outstation trips (35km to 149km)
  tier1Price?: number; // 35-50 km
  tier2Price?: number; // 51-75 km
  tier3Price?: number; // 76-100 km
  tier4Price?: number; // 101-149 km
  extraKmCharge?: number; // For distances beyond 149km
  // Tier distance ranges (configurable)
  tier1MinKm?: number; // Default: 35
  tier1MaxKm?: number; // Default: 50
  tier2MinKm?: number; // Default: 51
  tier2MaxKm?: number; // Default: 75
  tier3MinKm?: number; // Default: 76
  tier3MaxKm?: number; // Default: 100
  tier4MinKm?: number; // Default: 101
  tier4MaxKm?: number; // Default: 149
  [key: string]: any;
}

/**
 * Fetch outstation fares for all vehicles
 */
export const fetchAllOutstationFares = async (includeInactive = true): Promise<Record<string, OutstationFareData>> => {
  try {
    const timestamp = Date.now();
    const url = getApiUrl(`api/admin/direct-outstation-fares.php?includeInactive=${includeInactive}&_t=${timestamp}&force_refresh=true`);
    console.log('Fetching all outstation fares from:', url);
    
    // Clear any existing cache
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('Cleared browser cache');
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Fetched outstation fares data:', data);
    
    if (data && data.status === 'success' && data.fares) {
      return data.fares;
    }
    
    throw new Error('Invalid response format or no data returned');
  } catch (error) {
    console.error('Error fetching outstation fares:', error);
    throw error;
  }
};

/**
 * Fetch outstation fare for a specific vehicle
 */
export const fetchOutstationFare = async (vehicleId: string): Promise<OutstationFareData | null> => {
  try {
    if (!vehicleId) {
      console.error('Vehicle ID is required');
      return null;
    }
    
    console.log(`Fetching outstation fare for vehicle: ${vehicleId}`);
    const allFares = await fetchAllOutstationFares();
    
    console.log('All available fares:', Object.keys(allFares));
    console.log('Looking for vehicle ID:', vehicleId);
    console.log('All fares data:', allFares);
    
    // Try to find an exact match first
    if (allFares[vehicleId]) {
      console.log('Found exact match for vehicle ID:', vehicleId);
      console.log('Fare data:', allFares[vehicleId]);
      return allFares[vehicleId];
    }
    
    // Try case-insensitive match
    const keys = Object.keys(allFares);
    const matchKey = keys.find(key => key.toLowerCase() === vehicleId.toLowerCase());
    
    if (matchKey) {
      return allFares[matchKey];
    }
    
    console.warn(`No outstation fare found for vehicle: ${vehicleId}`);
    console.log('Available vehicle IDs:', Object.keys(allFares));
    console.log('Falling back to default tier pricing values');
    
    // Return default structure if no match found
    return {
      vehicleId: vehicleId,
      oneWayBasePrice: 0,
      oneWayPricePerKm: 0,
      roundTripBasePrice: 0,
      roundTripPricePerKm: 0,
      driverAllowance: 300,
      nightHaltCharge: 700,
      // Default tier pricing
      tier1Price: 3500,
      tier2Price: 4200,
      tier3Price: 4900,
      tier4Price: 5600,
      extraKmCharge: 14,
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
    console.error(`Error fetching outstation fare for vehicle ${vehicleId}:`, error);
    toast.error('Failed to load outstation fare data');
    return null;
  }
};

/**
 * Update outstation fare for a specific vehicle
 */
export const updateOutstationFare = async (fareData: OutstationFareData): Promise<boolean> => {
  try {
    if (!fareData.vehicleId) {
      console.error('Vehicle ID is required for updating outstation fare');
      toast.error('Vehicle ID is required');
      return false;
    }
    
    console.log('Updating outstation fare with data:', fareData);
    
    // Create a FormData object to send the data
    const formData = new FormData();
    
    // Add all fields to the FormData
    Object.keys(fareData).forEach(key => {
      if (fareData[key] !== undefined && fareData[key] !== null) {
        formData.append(key, String(fareData[key]));
      }
    });
    
    // Make sure we're using the correct endpoint for outstation fares
    const url = getApiUrl(`api/admin/direct-outstation-fares.php?_t=${Date.now()}`);
    console.log('Sending outstation fare update to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error ${response.status}:`, errorText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Outstation fare update response:', result);
    
    if (result && result.status === 'success') {
      toast.success('Outstation fare updated successfully');
      return true;
    } else {
      toast.error(result.message || 'Failed to update outstation fare');
      return false;
    }
  } catch (error) {
    console.error('Error updating outstation fare:', error);
    toast.error(`Failed to update outstation fare: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

/**
 * Initialize outstation fare tables in the database
 */
export const initializeOutstationFareTables = async (): Promise<boolean> => {
  try {
    const url = getApiUrl(`api/admin/initialize-outstation-tables.php?_t=${Date.now()}`);
    console.log('Initializing outstation fare tables:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      toast.success('Outstation fare tables initialized successfully');
      return true;
    } else {
      toast.error(result.message || 'Failed to initialize outstation fare tables');
      return false;
    }
  } catch (error) {
    console.error('Error initializing outstation fare tables:', error);
    toast.error(`Failed to initialize tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

/**
 * Sync outstation fare tables with other pricing tables
 */
export const syncOutstationFareTables = async (): Promise<boolean> => {
  try {
    const url = getApiUrl(`api/admin/sync-outstation-tables.php?_t=${Date.now()}`);
    console.log('Syncing outstation fare tables:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      toast.success('Outstation fare tables synced successfully');
      return true;
    } else {
      toast.error(result.message || 'Failed to sync outstation fare tables');
      return false;
    }
  } catch (error) {
    console.error('Error syncing outstation fare tables:', error);
    toast.error(`Failed to sync tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};
