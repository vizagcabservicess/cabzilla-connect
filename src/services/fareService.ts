
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
  
  // Alias for backward compatibility
  clearCache() {
    this.clearAllCaches();
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
    console.log(`Getting local fares for vehicle ${vehicleId}, force refresh: ${forceRefresh}`);
    
    // Return from cache if available
    if (!forceRefresh && this.localFareCache[vehicleId] && 
        this.cacheExpiry[`local_${vehicleId}`] && 
        Date.now() < this.cacheExpiry[`local_${vehicleId}`]) {
      return this.localFareCache[vehicleId];
    }
    
    try {
      // First try the direct endpoint
      const response = await directApiCallWithFallback(
        `/api/direct-local-fares.php?id=${vehicleId}`,
        `/api/admin/direct-local-fares.php?id=${vehicleId}`,
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        }
      );
      
      if (response && (response.fare || response.fares)) {
        const fareData = response.fare || (Array.isArray(response.fares) ? response.fares[0] : response.fares);
        
        if (fareData) {
          // Normalize the data
          const localFare: LocalFare = {
            vehicleId: fareData.vehicleId || fareData.vehicle_id || vehicleId,
            price4hrs40km: parseFloat(fareData.price4hrs40km || fareData.price_4hrs_40km || 0),
            price8hrs80km: parseFloat(fareData.price8hrs80km || fareData.price_8hrs_80km || 0),
            price10hrs100km: parseFloat(fareData.price10hrs100km || fareData.price_10hrs_100km || 0),
            priceExtraKm: parseFloat(fareData.priceExtraKm || fareData.price_extra_km || 0),
            priceExtraHour: parseFloat(fareData.priceExtraHour || fareData.price_extra_hour || 0)
          };
          
          // Cache the data
          this.localFareCache[vehicleId] = localFare;
          this.cacheExpiry[`local_${vehicleId}`] = Date.now() + this.cacheTTL;
          
          return localFare;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting local fares:', error);
      throw error;
    }
  }
  
  /**
   * Gets outstation fares for a specific vehicle
   */
  async getOutstationFares(vehicleId: string, forceRefresh = false): Promise<OutstationFare | null> {
    console.log(`Getting outstation fares for vehicle ${vehicleId}, force refresh: ${forceRefresh}`);
    
    // Return from cache if available
    if (!forceRefresh && this.outstationFareCache[vehicleId] && 
        this.cacheExpiry[`outstation_${vehicleId}`] && 
        Date.now() < this.cacheExpiry[`outstation_${vehicleId}`]) {
      return this.outstationFareCache[vehicleId];
    }
    
    try {
      // First try the direct endpoint
      const response = await directApiCallWithFallback(
        `/api/direct-outstation-fares.php?id=${vehicleId}`,
        `/api/admin/direct-outstation-fares.php?id=${vehicleId}`,
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        }
      );
      
      if (response && (response.fare || response.fares)) {
        const fareData = response.fare || (Array.isArray(response.fares) ? response.fares[0] : response.fares);
        
        if (fareData) {
          // Normalize the data
          const outstationFare: OutstationFare = {
            vehicleId: fareData.vehicleId || fareData.vehicle_id || vehicleId,
            basePrice: parseFloat(fareData.basePrice || fareData.base_price || 0),
            pricePerKm: parseFloat(fareData.pricePerKm || fareData.price_per_km || 0),
            driverAllowance: parseFloat(fareData.driverAllowance || fareData.driver_allowance || 0),
            nightHaltCharge: parseFloat(fareData.nightHaltCharge || fareData.night_halt_charge || fareData.nightHalt || 0),
            roundTripBasePrice: fareData.roundTripBasePrice || fareData.round_trip_base_price,
            roundTripPricePerKm: fareData.roundTripPricePerKm || fareData.round_trip_price_per_km
          };
          
          // Cache the data
          this.outstationFareCache[vehicleId] = outstationFare;
          this.cacheExpiry[`outstation_${vehicleId}`] = Date.now() + this.cacheTTL;
          
          return outstationFare;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting outstation fares:', error);
      throw error;
    }
  }
  
  /**
   * Gets fares for a specific vehicle based on trip type
   */
  async getFaresByTripType(vehicleId: string, tripType: string, forceRefresh = false): Promise<any> {
    switch (tripType.toLowerCase()) {
      case 'airport':
        return this.getAirportFares(vehicleId, forceRefresh);
      case 'outstation':
        return this.getOutstationFares(vehicleId, forceRefresh);
      case 'local':
        return this.getLocalFares(vehicleId, forceRefresh);
      default:
        throw new Error(`Unknown trip type: ${tripType}`);
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
   * Syncs local fares with the database
   */
  async syncLocalFares(forceRefresh = false): Promise<any> {
    console.log('Syncing local fares, force refresh:', forceRefresh);
    
    try {
      const endpoint = forceRefresh 
        ? '/api/admin/sync-local-fares.php?forceRefresh=true'
        : '/api/admin/sync-local-fares.php';
      
      const response = await directApiCall(endpoint, {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        }
      });
      
      // Clear caches to ensure fresh data
      this.clearLocalFareCache();
      clearVehicleDataCache();
      
      // Notify components that fares changed
      window.dispatchEvent(new CustomEvent('local-fares-synced', {
        detail: { timestamp: Date.now(), forceRefresh }
      }));
      
      return response;
    } catch (error) {
      console.error('Error syncing local fares:', error);
      throw error;
    }
  }
  
  /**
   * Syncs outstation fares with the database
   */
  async syncOutstationFares(forceRefresh = false): Promise<any> {
    console.log('Syncing outstation fares, force refresh:', forceRefresh);
    
    try {
      const endpoint = forceRefresh 
        ? '/api/admin/sync-outstation-fares.php?forceRefresh=true'
        : '/api/admin/sync-outstation-fares.php';
      
      const response = await directApiCall(endpoint, {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        }
      });
      
      // Clear caches to ensure fresh data
      this.clearOutstationFareCache();
      clearVehicleDataCache();
      
      // Notify components that fares changed
      window.dispatchEvent(new CustomEvent('outstation-fares-synced', {
        detail: { timestamp: Date.now(), forceRefresh }
      }));
      
      return response;
    } catch (error) {
      console.error('Error syncing outstation fares:', error);
      throw error;
    }
  }
  
  /**
   * Force syncs outstation fares with the database
   */
  async forceSyncOutstationFares(): Promise<any> {
    return this.syncOutstationFares(true);
  }
  
  /**
   * Sync local fare tables
   */
  async syncLocalFareTables(forceRefresh = false): Promise<any> {
    return this.syncLocalFares(forceRefresh);
  }
  
  /**
   * Gets airport fares for a specific vehicle (alias method)
   */
  async getAirportFaresForVehicle(vehicleId: string, forceRefresh = false): Promise<AirportFare | null> {
    return this.getAirportFares(vehicleId, forceRefresh);
  }
  
  /**
   * Gets local fares for a specific vehicle (alias method)
   */
  async getLocalFaresForVehicle(vehicleId: string, forceRefresh = false): Promise<LocalFare | null> {
    return this.getLocalFares(vehicleId, forceRefresh);
  }
  
  /**
   * Gets outstation fares for a specific vehicle (alias method)
   */
  async getOutstationFaresForVehicle(vehicleId: string, forceRefresh = false): Promise<OutstationFare | null> {
    return this.getOutstationFares(vehicleId, forceRefresh);
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
  
  /**
   * Initializes the database
   */
  async initializeDatabase(): Promise<any> {
    console.log('Initializing database');
    
    try {
      const response = await directApiCall('/api/admin/initialize-database.php', {
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
      console.error('Error initializing database:', error);
      throw error;
    }
  }
  
  /**
   * Resets cab options state
   */
  resetCabOptionsState(): void {
    console.log('Resetting cab options state');
    this.clearAllCaches();
    clearVehicleDataCache();
    
    // Notify components that state was reset
    window.dispatchEvent(new CustomEvent('cab-options-reset', {
      detail: { timestamp: Date.now() }
    }));
  }
  
  /**
   * Direct fare update for any fare type
   */
  async directFareUpdate(fareType: string, data: any): Promise<any> {
    console.log(`Direct fare update for ${fareType}:`, data);
    
    if (!data.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    try {
      const endpoint = `/api/admin/direct-${fareType}-fares-update.php`;
      const fallbackEndpoint = `/api/admin/${fareType}-fares-update.php`;
      
      const response = await directApiPostWithFallback(
        endpoint,
        fallbackEndpoint,
        data,
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        }
      );
      
      // Clear caches based on fare type
      switch (fareType) {
        case 'airport':
          this.clearAirportFareCache();
          break;
        case 'local':
          this.clearLocalFareCache();
          break;
        case 'outstation':
          this.clearOutstationFareCache();
          break;
        default:
          this.clearAllCaches();
      }
      
      clearVehicleDataCache();
      
      // Notify components that fares changed
      window.dispatchEvent(new CustomEvent(`${fareType}-fares-updated`, {
        detail: { timestamp: Date.now(), vehicleId: data.vehicleId }
      }));
      
      return response;
    } catch (error) {
      console.error(`Error updating ${fareType} fare:`, error);
      throw error;
    }
  }
  
  /**
   * Get bypass headers for API calls
   */
  getBypassHeaders(): Record<string, string> {
    return {
      'X-Admin-Mode': 'true',
      'X-Debug': 'true',
      'X-Bypass-Cache': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
  }
  
  /**
   * Get forced request config
   */
  getForcedRequestConfig(): RequestInit {
    return {
      headers: this.getBypassHeaders(),
      cache: 'no-store'
    };
  }
}

// Export a singleton instance
export const fareService = new FareService();

// Export helper methods
export async function getAirportFares(vehicleId: string, forceRefresh = false) {
  return fareService.getAirportFares(vehicleId, forceRefresh);
}

export async function getLocalFares(vehicleId: string, forceRefresh = false) {
  return fareService.getLocalFares(vehicleId, forceRefresh);
}

export async function getOutstationFares(vehicleId: string, forceRefresh = false) {
  return fareService.getOutstationFares(vehicleId, forceRefresh);
}

export async function getAirportFaresForVehicle(vehicleId: string, forceRefresh = false) {
  return fareService.getAirportFaresForVehicle(vehicleId, forceRefresh);
}

export async function getLocalFaresForVehicle(vehicleId: string, forceRefresh = false) {
  return fareService.getLocalFaresForVehicle(vehicleId, forceRefresh);
}

export async function getOutstationFaresForVehicle(vehicleId: string, forceRefresh = false) {
  return fareService.getOutstationFaresForVehicle(vehicleId, forceRefresh);
}

export async function getFaresByTripType(vehicleId: string, tripType: string, forceRefresh = false) {
  return fareService.getFaresByTripType(vehicleId, tripType, forceRefresh);
}

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

export async function syncAirportFares(forceRefresh = false): Promise<any> {
  return fareService.syncAirportFares(forceRefresh);
}

export async function syncLocalFares(forceRefresh = false): Promise<any> {
  return fareService.syncLocalFares(forceRefresh);
}

export async function syncOutstationFares(forceRefresh = false): Promise<any> {
  return fareService.syncOutstationFares(forceRefresh);
}

export async function forceSyncOutstationFares(): Promise<any> {
  return fareService.forceSyncOutstationFares();
}

export async function syncLocalFareTables(forceRefresh = false): Promise<any> {
  return fareService.syncLocalFareTables(forceRefresh);
}

export async function initializeDatabase(): Promise<any> {
  return fareService.initializeDatabase();
}

export async function directFareUpdate(fareType: string, data: any): Promise<any> {
  return fareService.directFareUpdate(fareType, data);
}

export function resetCabOptionsState(): void {
  fareService.resetCabOptionsState();
}

// Export helper functions to clear cache
export function clearFareCache() {
  fareService.clearAllCaches();
}

// Export for direct access
export default fareService;
