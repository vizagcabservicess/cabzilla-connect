
import axios from 'axios';
import { apiBaseUrl } from '@/config/api';
import { clearVehicleDataCache, getVehicleData } from '@/services/vehicleDataService';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';

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
    const response = await axios.get(`${apiBaseUrl}/admin/fix-database-tables.php?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
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
      } catch (refreshError) {
        console.error('Error refreshing vehicle data:', refreshError);
      }
      
      return true;
    } else {
      console.error('Failed to fix database tables:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error fixing database tables:', error);
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
    const response = await axios.get(`${apiBaseUrl}/admin/check-connection.php?_t=${timestamp}`, { 
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
