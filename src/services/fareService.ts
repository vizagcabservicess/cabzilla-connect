
import axios from 'axios';
import { clearFareCache } from '@/lib/fareCalculationService';

const FORCE_HEADERS = {
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export const fareService = {
  clearCache: clearFareCache,
  
  // Get forced request config with headers that bypass cache
  getForcedRequestConfig: () => ({
    headers: FORCE_HEADERS,
    cache: 'no-store',
    method: 'GET',
    timeout: 10000
  }),
  
  // Direct fare update for specific fare types
  directFareUpdate: async (fareType, vehicleId, data) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const endpoint = `${baseUrl}/api/admin/direct-${fareType}-fares.php`;
      console.log(`Updating ${fareType} fares for ${vehicleId}...`, data);
      
      // Ensure vehicleId is included in the data
      const requestData = {
        ...data,
        vehicleId,
        _t: Date.now() // Cache busting
      };
      
      const response = await axios.post(endpoint, requestData, {
        headers: FORCE_HEADERS
      });
      
      console.log(`${fareType} fare update response:`, response.data);
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || `Failed to update ${fareType} fares`);
      }
      
      // Clear cache to ensure the latest data is fetched
      clearFareCache();
      
      return response.data;
    } catch (error) {
      console.error(`Error updating ${fareType} fares:`, error);
      throw error;
    }
  },
  
  // Get outstation fares for a specific vehicle
  getOutstationFaresForVehicle: async (vehicleId) => {
    try {
      if (!vehicleId) {
        throw new Error("Vehicle ID is required to fetch fares");
      }
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const cacheKey = `outstation_${vehicleId}_${Date.now()}`;
      const params = new URLSearchParams();
      params.append('vehicleId', vehicleId);
      params.append('_t', Date.now().toString());
      
      const response = await axios.get(`${baseUrl}/api/admin/direct-outstation-fares.php?${params.toString()}`, {
        headers: FORCE_HEADERS
      });
      
      console.log(`Outstation fares for ${vehicleId}:`, response.data);
      
      if (!response.data || response.data.status === 'error') {
        throw new Error(response.data?.message || 'Failed to fetch outstation fares');
      }
      
      // Return the fare data
      return response.data.data || response.data;
    } catch (error) {
      console.error(`Error fetching outstation fares for vehicle ${vehicleId}:`, error);
      throw error;
    }
  },
  
  // Initialize database tables
  initializeDatabase: async (syncTables = false) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      console.log("Initializing database...");
      
      const params = new URLSearchParams();
      params.append('_t', Date.now().toString());
      
      if (syncTables) {
        params.append('sync', 'true');
      }
      
      const response = await axios.get(`${baseUrl}/api/admin/init-database.php?${params.toString()}`, {
        headers: FORCE_HEADERS,
        timeout: 20000 // Longer timeout for database initialization
      });
      
      console.log("Database initialization response:", response.data);
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to initialize database');
      }
      
      // Clear cache to ensure the latest data is fetched
      clearFareCache();
      
      return response.data;
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  },
  
  // Force synchronization between outstation_fares and vehicle_pricing tables
  forceSyncOutstationFares: async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      console.log("Forcing sync of outstation fares...");
      
      const params = new URLSearchParams();
      params.append('direction', 'to_vehicle_pricing');
      params.append('_t', Date.now().toString());
      
      const response = await axios.get(`${baseUrl}/api/admin/sync-outstation-fares.php?${params.toString()}`, {
        headers: FORCE_HEADERS,
        timeout: 15000 // Extended timeout for sync operation
      });
      
      console.log("Outstation fares sync response:", response.data);
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to sync outstation fares');
      }
      
      // Clear cache to ensure the latest data is fetched
      clearFareCache();
      
      return response.data;
    } catch (error) {
      console.error("Error syncing outstation fares:", error);
      throw error;
    }
  }
};

export default fareService;
