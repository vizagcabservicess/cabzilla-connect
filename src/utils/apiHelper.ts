
import axios from 'axios';
import { apiBaseUrl } from '@/config/api';
import { clearVehicleDataCache, getVehicleData } from '@/services/vehicleDataService';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';
import { getBypassHeaders, getForcedRequestConfig, formatDataForMultipart } from '@/config/requestConfig';

/**
 * Fix database tables - corrects NULL values in critical fields
 * @returns {Promise<boolean>} Success status
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    // First, clear all caches to ensure fresh data
    clearVehicleDataCache();
    fareService.clearCache();
    localStorage.removeItem('cachedVehicles');
    localStorage.removeItem('localVehicles');
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const response = await axios.get(`${apiBaseUrl}/api/admin/fix-database-tables.php?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      },
      timeout: 30000 // 30 second timeout
    });
    
    if (response.data && response.data.status === 'success') {
      console.log('Database tables fixed successfully:', response.data);
      
      // Trigger global events to refresh all data
      window.dispatchEvent(new CustomEvent('database-fixed', { 
        detail: { timestamp: Date.now() }
      }));
      
      window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
        detail: { forced: true, timestamp: Date.now() }
      }));
      
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: Date.now() }
      }));
      
      // Force refresh vehicle data
      try {
        await getVehicleData(true, true);
        console.log('Vehicle data refreshed after database fix');
        toast.success('Database fixed and vehicle data refreshed successfully');
      } catch (refreshError) {
        console.error('Error refreshing vehicle data:', refreshError);
        toast.error('Database fixed but failed to refresh vehicle data');
      }
      
      return true;
    } else {
      console.error('Failed to fix database tables:', response.data);
      toast.error('Failed to fix database tables: ' + (response.data?.message || 'Unknown error'));
      return false;
    }
  } catch (error: any) {
    console.error('Error fixing database tables:', error);
    toast.error('Failed to fix database tables: ' + (error?.message || 'Network error'));
    throw error;
  }
};

/**
 * Force update of vehicle data in all components
 */
export const forceVehicleDataRefresh = async () => {
  try {
    // Clear all caches
    clearVehicleDataCache();
    fareService.clearCache();
    
    // Set flags for forced refresh
    localStorage.setItem('forceCacheRefresh', 'true');
    localStorage.setItem('fareDataLastRefreshed', Date.now().toString());
    localStorage.setItem('forceTripFaresRefresh', 'true');
    
    // Trigger events
    window.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
      detail: { forced: true, timestamp: Date.now() }
    }));
    
    window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
      detail: { timestamp: Date.now() }
    }));
    
    // Force reload vehicle data
    const vehicles = await getVehicleData(true, true);
    console.log(`Refreshed ${vehicles.length} vehicles`);
    toast.success(`Successfully refreshed ${vehicles.length} vehicles`);
    
    // Clean up flags
    setTimeout(() => {
      localStorage.removeItem('forceCacheRefresh');
      localStorage.removeItem('forceTripFaresRefresh');
    }, 5000);
    
    return vehicles;
  } catch (error) {
    console.error('Error force refreshing vehicle data:', error);
    toast.error('Failed to refresh vehicle data');
    throw error;
  }
};

/**
 * Check if backend API is available
 */
export const checkBackendAvailable = async (): Promise<boolean> => {
  try {
    const timestamp = Date.now();
    const response = await axios.get(`${apiBaseUrl}/api/admin/check-connection.php?_t=${timestamp}`, { 
      timeout: 5000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('Backend API check failed:', error);
    return false;
  }
};

/**
 * Direct vehicle operation helper for API calls
 * @param endpoint - API endpoint
 * @param method - HTTP method
 * @param data - Request data (optional)
 * @returns Promise with response data
 */
export const directVehicleOperation = async (
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
  data: any = null
): Promise<any> => {
  try {
    const fullEndpoint = endpoint.startsWith('http') 
      ? endpoint 
      : `${apiBaseUrl}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
    
    const requestConfig = {
      method,
      url: fullEndpoint,
      headers: {
        ...getBypassHeaders(),
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
      },
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined,
      timeout: 30000, // 30 second timeout for reliability
    };
    
    console.log(`Making ${method} request to ${fullEndpoint}`);
    const response = await axios(requestConfig);
    
    // If this was a successful update operation, force a data refresh
    if (
      (method === 'POST' || method === 'PUT') && 
      response.data && 
      response.data.status === 'success' &&
      (endpoint.includes('update') || endpoint.includes('modify'))
    ) {
      // Delay refresh slightly to allow server to process changes
      setTimeout(() => {
        try {
          forceVehicleDataRefresh();
        } catch (refreshErr) {
          console.error('Error auto-refreshing data after update:', refreshErr);
        }
      }, 1000);
    }
    
    return response.data;
  } catch (error: any) {
    console.error(`Error in directVehicleOperation (${endpoint}):`, error);
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    throw new Error(errorMessage);
  }
};

// Re-export the formatDataForMultipart function for components that need it directly
export { formatDataForMultipart };
