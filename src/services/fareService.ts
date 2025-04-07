
import { toast } from 'sonner';
import { AirportFare, LocalFare, OutstationFare, CabType } from '@/types/cab';
import { directApiCall, directApiPost, directApiCallWithFallback, directApiPostWithFallback } from '@/utils/directApiHelper';
import { clearVehicleDataCache } from './vehicleDataService';

// Create a singleton instance for fare service
class FareService {
  private airportFareCache: Record<string, AirportFare> = {};
  private localFareCache: Record<string, LocalFare> = {};
  private outstationFareCache: Record<string, OutstationFare> = {};
  private cacheExpiry: Record<string, number> = {};
  private cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    console.log('FareService initialized');
    
    // Listen for fare updates to clear cache
    window.addEventListener('airport-fares-updated', this.clearAirportFareCache.bind(this));
    window.addEventListener('local-fares-updated', this.clearLocalFareCache.bind(this));
    window.addEventListener('outstation-fares-updated', this.clearOutstationFareCache.bind(this));
  }
  
  // Clear specific cache types
  clearAirportFareCache() {
    console.log('Clearing airport fare cache');
    this.airportFareCache = {};
  }
  
  clearLocalFareCache() {
    console.log('Clearing local fare cache');
    this.localFareCache = {};
  }
  
  clearOutstationFareCache() {
    console.log('Clearing outstation fare cache');
    this.outstationFareCache = {};
  }
  
  // Clear all fare caches
  clearAllCaches() {
    console.log('Clearing all fare caches');
    this.airportFareCache = {};
    this.localFareCache = {};
    this.outstationFareCache = {};
    this.cacheExpiry = {};
  }
  
  /**
   * Gets airport fares for a specific vehicle
   */
  async getAirportFares(vehicleId: string, forceRefresh = false): Promise<AirportFare | null> {
    console.log(`Getting airport fares for vehicle ${vehicleId}, force refresh: ${forceRefresh}`);
    
    // Check cache first if not forcing a refresh
    if (!forceRefresh && this.airportFareCache[vehicleId] && 
        this.cacheExpiry[`airport_${vehicleId}`] && 
        Date.now() < this.cacheExpiry[`airport_${vehicleId}`]) {
      console.log('Returning cached airport fares');
      return this.airportFareCache[vehicleId];
    }
    
    try {
      // First try the direct endpoint
      const response = await directApiCallWithFallback(
        `/api/direct-airport-fares.php?id=${vehicleId}`,
        `/api/admin/direct-airport-fares.php?id=${vehicleId}`,
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        }
      );
      
      console.log('Airport fares API response:', response);
      
      if (response && (response.fare || response.fares)) {
        const fareData = response.fare || (Array.isArray(response.fares) ? response.fares[0] : response.fares);
        
        if (fareData) {
          // Normalize the data
          const airportFare: AirportFare = {
            vehicleId: fareData.vehicleId || fareData.vehicle_id || vehicleId,
            basePrice: parseFloat(fareData.basePrice || fareData.base_price || 0),
            pricePerKm: parseFloat(fareData.pricePerKm || fareData.price_per_km || 0),
            pickupPrice: parseFloat(fareData.pickupPrice || fareData.pickup_price || 0),
            dropPrice: parseFloat(fareData.dropPrice || fareData.drop_price || 0),
            tier1Price: parseFloat(fareData.tier1Price || fareData.tier1_price || 0),
            tier2Price: parseFloat(fareData.tier2Price || fareData.tier2_price || 0),
            tier3Price: parseFloat(fareData.tier3Price || fareData.tier3_price || 0),
            tier4Price: parseFloat(fareData.tier4Price || fareData.tier4_price || 0),
            extraKmCharge: parseFloat(fareData.extraKmCharge || fareData.extra_km_charge || 0),
            nightCharges: parseFloat(fareData.nightCharges || fareData.night_charges || 0),
            extraWaitingCharges: parseFloat(fareData.extraWaitingCharges || fareData.extra_waiting_charges || 0)
          };
          
          // Cache the data
          this.airportFareCache[vehicleId] = airportFare;
          this.cacheExpiry[`airport_${vehicleId}`] = Date.now() + this.cacheTTL;
          
          console.log('Cached airport fare:', airportFare);
          return airportFare;
        }
      }
      
      console.warn('No airport fare data found');
      return null;
    } catch (error) {
      console.error('Error getting airport fares:', error);
      throw error;
    }
  }
  
  /**
   * Updates airport fares for a vehicle
   */
  async updateAirportFare(data: AirportFare): Promise<any> {
    console.log('Updating airport fare:', data);
    
    if (!data.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    try {
      // Try direct update via multiple endpoints with fallbacks
      const response = await directApiPostWithFallback(
        '/api/admin/direct-airport-fares-update.php',
        '/api/admin/airport-fares-update.php',
        data,
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        }
      );
      
      // Clear vehicle and fare caches to ensure fresh data
      this.clearAirportFareCache();
      clearVehicleDataCache();
      
      // Notify components that fares changed
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
      }));
      
      return response;
    } catch (error) {
      console.error('Error updating airport fare:', error);
      throw error;
    }
  }
  
  /**
   * Gets local fares for a specific vehicle
   */
  async getLocalFares(vehicleId: string, forceRefresh = false): Promise<LocalFare | null> {
    // Similar implementation to getAirportFares
    console.log(`Getting local fares for vehicle ${vehicleId}, force refresh: ${forceRefresh}`);
    
    // Return from cache if available
    if (!forceRefresh && this.localFareCache[vehicleId] && 
        this.cacheExpiry[`local_${vehicleId}`] && 
        Date.now() < this.cacheExpiry[`local_${vehicleId}`]) {
      return this.localFareCache[vehicleId];
    }
    
    try {
      // Implementation similar to getAirportFares
      return null; // Placeholder
    } catch (error) {
      console.error('Error getting local fares:', error);
      throw error;
    }
  }
  
  /**
   * Syncs airport fares with the database
   */
  async syncAirportFares(forceRefresh = false): Promise<any> {
    console.log('Syncing airport fares, force refresh:', forceRefresh);
    
    try {
      const endpoint = forceRefresh 
        ? '/api/admin/sync-airport-fares.php?forceRefresh=true'
        : '/api/admin/sync-airport-fares.php';
      
      const response = await directApiCall(endpoint, {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        }
      });
      
      // Clear caches to ensure fresh data
      this.clearAirportFareCache();
      clearVehicleDataCache();
      
      // Notify components that fares changed
      window.dispatchEvent(new CustomEvent('airport-fares-synced', {
        detail: { timestamp: Date.now(), forceRefresh }
      }));
      
      return response;
    } catch (error) {
      console.error('Error syncing airport fares:', error);
      throw error;
    }
  }
  
  /**
   * Fixes common database issues
   */
  async fixDatabase(): Promise<any> {
    console.log('Fixing database issues');
    
    try {
      const response = await directApiCall('/api/admin/fix-database.php', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true'
        }
      });
      
      // Clear all caches to ensure fresh data
      this.clearAllCaches();
      clearVehicleDataCache();
      
      return response;
    } catch (error) {
      console.error('Error fixing database:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const fareService = new FareService();

// Export update functions for consistency with previous code
export async function updateAirportFare(data: AirportFare): Promise<any> {
  return fareService.updateAirportFare(data);
}

export async function updateLocalFare(data: LocalFare): Promise<any> {
  // Will be implemented later
  return Promise.resolve();
}

export async function updateOutstationFare(data: OutstationFare): Promise<any> {
  // Will be implemented later
  return Promise.resolve();
}

// Export helper functions to clear cache
export function clearFareCache() {
  fareService.clearAllCaches();
}

// Export for direct access
export default fareService;
