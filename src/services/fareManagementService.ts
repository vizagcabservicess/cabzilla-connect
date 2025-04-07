
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation } from '@/utils/apiHelper';

// Define common fare data interface with optional fields to support different fare types
export interface FareData {
  vehicleId: string;
  vehicle_id?: string; // Make this optional since we'll set it from vehicleId
  basePrice?: number; // Make these optional since not all fare types need them
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  [key: string]: any;
}

// Function to clear browser cache for fare data
export const clearFareCache = () => {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(key => key.includes('fare') || key.includes('Fare'));
  
  cacheKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  toast.info('Fare cache cleared');
};

// Initialize database tables for fare management
export const initializeDatabaseTables = async (): Promise<boolean> => {
  try {
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-collation.php?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to initialize database tables: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      console.log('Database tables initialized successfully:', result);
      return true;
    } else {
      console.error('Failed to initialize database tables:', result?.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('Error initializing database tables:', error);
    return false;
  }
};

// Get local fares for a specific vehicle
export const fetchLocalFares = async (vehicleId: string): Promise<FareData[]> => {
  try {
    // Append a timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/direct-local-fares.php?vehicleId=${vehicleId}&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch local fares: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    if (responseData && responseData.status === 'success' && responseData.fares) {
      return Array.isArray(responseData.fares) ? responseData.fares : [responseData.fares];
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching local fares:', error);
    throw error;
  }
};

// Update local fares for a specific vehicle
export const updateLocalFares = async (fareData: FareData): Promise<any> => {
  try {
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Ensure vehicle_id is set
    fareData.vehicle_id = fareData.vehicleId;
    
    // Create form data to pass to the API
    const formData = new FormData();
    formData.append('vehicleId', fareData.vehicleId);
    formData.append('vehicle_id', fareData.vehicleId);
    
    // Append all fare fields that exist in the data
    if (fareData.price4hrs40km !== undefined) formData.append('price4hrs40km', String(fareData.price4hrs40km));
    if (fareData.price8hrs80km !== undefined) formData.append('price8hrs80km', String(fareData.price8hrs80km));
    if (fareData.price10hrs100km !== undefined) formData.append('price10hrs100km', String(fareData.price10hrs100km));
    if (fareData.priceExtraKm !== undefined) formData.append('priceExtraKm', String(fareData.priceExtraKm));
    if (fareData.priceExtraHour !== undefined) formData.append('priceExtraHour', String(fareData.priceExtraHour));
    
    // Add compatibility for both field naming conventions
    if (fareData.extraKmCharge !== undefined) formData.append('extraKmCharge', String(fareData.extraKmCharge));
    
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/local-fares-update.php?_t=${timestamp}`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update local fares: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      // Dispatch custom event to notify other components
      const event = new CustomEvent('fare-data-updated', {
        detail: {
          fareType: 'local',
          vehicleId: fareData.vehicleId
        }
      });
      window.dispatchEvent(event);
      
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update local fares');
    }
  } catch (error) {
    console.error('Error updating local fares:', error);
    throw error;
  }
};

// Get airport fares for a specific vehicle
export const fetchAirportFares = async (vehicleId: string): Promise<FareData[]> => {
  try {
    // Append a timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    
    console.log(`Fetching airport fares for vehicle ${vehicleId} at ${timestamp}`);
    
    const response = await fetch(`${apiBaseUrl}/api/admin/direct-airport-fares.php?vehicleId=${vehicleId}&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch airport fares: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('Airport fares response:', responseData);
    
    if (responseData && responseData.status === 'success' && responseData.fares) {
      // Transform the response data to match our FareData interface
      let fares = Array.isArray(responseData.fares) ? responseData.fares : [responseData.fares];
      
      // Ensure all fares have the necessary properties
      fares = fares.map(fare => ({
        ...fare,
        vehicleId: vehicleId,
        vehicle_id: vehicleId,
        // Make sure all required fields have at least a default value
        basePrice: fare.basePrice || fare.base_price || 0,
        pricePerKm: fare.pricePerKm || fare.price_per_km || 0,
        pickupPrice: fare.pickupPrice || fare.pickup_price || 0,
        dropPrice: fare.dropPrice || fare.drop_price || 0,
        tier1Price: fare.tier1Price || fare.tier1_price || 0,
        tier2Price: fare.tier2Price || fare.tier2_price || 0,
        tier3Price: fare.tier3Price || fare.tier3_price || 0,
        tier4Price: fare.tier4Price || fare.tier4_price || 0,
        extraKmCharge: fare.extraKmCharge || fare.extra_km_charge || 0
      }));
      
      console.log('Transformed fares data:', fares);
      return fares;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    throw error;
  }
};

// Update airport fares for a specific vehicle
export const updateAirportFares = async (fareData: FareData): Promise<any> => {
  try {
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    // Ensure vehicle_id is set
    fareData.vehicle_id = fareData.vehicleId;
    
    // Create form data to pass to the API
    const formData = new FormData();
    formData.append('vehicleId', fareData.vehicleId);
    formData.append('vehicle_id', fareData.vehicleId);
    
    // Append all fare fields (handling optionals with defaults)
    formData.append('basePrice', String(fareData.basePrice || 0));
    formData.append('pricePerKm', String(fareData.pricePerKm || 0));
    formData.append('pickupPrice', String(fareData.pickupPrice || 0));
    formData.append('dropPrice', String(fareData.dropPrice || 0));
    formData.append('tier1Price', String(fareData.tier1Price || 0));
    formData.append('tier2Price', String(fareData.tier2Price || 0));
    formData.append('tier3Price', String(fareData.tier3Price || 0));
    formData.append('tier4Price', String(fareData.tier4Price || 0));
    formData.append('extraKmCharge', String(fareData.extraKmCharge || 0));
    
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/airport-fares-update.php?_t=${timestamp}`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update airport fares: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      // Dispatch custom event to notify other components
      const event = new CustomEvent('fare-data-updated', {
        detail: {
          fareType: 'airport',
          vehicleId: fareData.vehicleId
        }
      });
      window.dispatchEvent(event);
      
      return result;
    } else {
      throw new Error(result?.message || 'Failed to update airport fares');
    }
  } catch (error) {
    console.error('Error updating airport fares:', error);
    throw error;
  }
};

// Sync local fare tables (update or create tables if needed)
export const syncLocalFares = async (): Promise<any> => {
  try {
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/sync-local-fares.php?force_sync=true&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync local fares: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      // Refresh fare cache
      clearFareCache();
      
      // Dispatch custom event
      const event = new CustomEvent('fare-data-updated', {
        detail: {
          fareType: 'local',
          allVehicles: true
        }
      });
      window.dispatchEvent(event);
      
      return result;
    } else {
      throw new Error(result?.message || 'Failed to sync local fares');
    }
  } catch (error) {
    console.error('Error syncing local fares:', error);
    throw error;
  }
};

// Sync airport fare tables (update or create tables if needed)
export const syncAirportFares = async (): Promise<any> => {
  try {
    // Append a timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const response = await fetch(`${apiBaseUrl}/api/admin/sync-airport-fares.php?force_sync=true&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync airport fares: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success') {
      // Refresh fare cache
      clearFareCache();
      
      // Dispatch custom event
      const event = new CustomEvent('fare-data-updated', {
        detail: {
          fareType: 'airport',
          allVehicles: true
        }
      });
      window.dispatchEvent(event);
      
      return result;
    } else {
      throw new Error(result?.message || 'Failed to sync airport fares');
    }
  } catch (error) {
    console.error('Error syncing airport fares:', error);
    throw error;
  }
};
