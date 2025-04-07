
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';
import { directVehicleOperation } from '@/utils/apiHelper';

// Define common fare data interface
export interface FareData {
  vehicleId: string;
  vehicle_id: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
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

// Get airport fares for a specific vehicle
export const fetchAirportFares = async (vehicleId: string): Promise<FareData[]> => {
  try {
    // Append a timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    
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
    
    if (responseData && responseData.status === 'success' && responseData.fares) {
      return Array.isArray(responseData.fares) ? responseData.fares : [responseData.fares];
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
    
    // Create form data to pass to the API
    const formData = new FormData();
    formData.append('vehicleId', fareData.vehicleId);
    formData.append('vehicle_id', fareData.vehicleId);
    
    // Append all fare fields
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
