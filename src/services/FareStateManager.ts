
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';
import { clearFareCache } from '@/lib/fareCalculationService';

// Interfaces for different fare types
export interface OutstationFare {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
}

export interface LocalFare {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
  driverAllowance: number;
}

export interface AirportFare {
  vehicleId: string;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

// Type guard functions
export function isOutstationFare(fare: any): fare is OutstationFare {
  return fare && typeof fare.basePrice === 'number' && typeof fare.pricePerKm === 'number';
}

export function isLocalFare(fare: any): fare is LocalFare {
  return fare && typeof fare.price8hrs80km === 'number';
}

export function isAirportFare(fare: any): fare is AirportFare {
  return fare && typeof fare.tier1Price === 'number';
}

interface FareCacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class FareStateManager {
  private static instance: FareStateManager;
  private isLocked: boolean = false;
  private requestQueue: Array<() => Promise<void>> = [];
  private outstationFaresCache: Map<string, FareCacheItem<OutstationFare>> = new Map();
  private localFaresCache: Map<string, FareCacheItem<LocalFare>> = new Map();
  private airportFaresCache: Map<string, FareCacheItem<AirportFare>> = new Map();
  private requestTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lastFetchTimestamp: Record<string, number> = {
    outstation: 0,
    local: 0,
    airport: 0
  };
  private maxCacheAge: number = 5 * 60 * 1000; // 5 minutes default
  
  private constructor() {
    // Initialize event listeners for fare updates
    this.setupEventListeners();
  }
  
  public static getInstance(): FareStateManager {
    if (!FareStateManager.instance) {
      FareStateManager.instance = new FareStateManager();
    }
    return FareStateManager.instance;
  }
  
  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      // Listen for fare-cache-cleared events
      window.addEventListener('fare-cache-cleared', () => {
        console.log('FareStateManager: Fare cache cleared event detected');
        this.clearAllCaches();
      });
      
      // Listen for fare-data-updated events
      window.addEventListener('fare-data-updated', (event: Event) => {
        const customEvent = event as CustomEvent;
        const { tripType, vehicleId } = customEvent.detail || {};
        
        if (tripType) {
          console.log(`FareStateManager: Fare data updated for ${tripType}${vehicleId ? ` (${vehicleId})` : ''}`);
          this.invalidateCache(tripType, vehicleId);
        }
      });
    }
  }
  
  private clearAllCaches(): void {
    this.outstationFaresCache.clear();
    this.localFaresCache.clear();
    this.airportFaresCache.clear();
    this.lastFetchTimestamp = {
      outstation: 0,
      local: 0,
      airport: 0
    };
    console.log('FareStateManager: All fare caches cleared');
  }
  
  private invalidateCache(tripType: string, vehicleId?: string): void {
    switch (tripType.toLowerCase()) {
      case 'outstation':
        if (vehicleId) {
          this.outstationFaresCache.delete(vehicleId);
        } else {
          this.outstationFaresCache.clear();
        }
        this.lastFetchTimestamp.outstation = 0;
        break;
      case 'local':
        if (vehicleId) {
          this.localFaresCache.delete(vehicleId);
        } else {
          this.localFaresCache.clear();
        }
        this.lastFetchTimestamp.local = 0;
        break;
      case 'airport':
        if (vehicleId) {
          this.airportFaresCache.delete(vehicleId);
        } else {
          this.airportFaresCache.clear();
        }
        this.lastFetchTimestamp.airport = 0;
        break;
      default:
        // If tripType is unknown, clear all caches
        this.clearAllCaches();
    }
    
    // Dispatch an event to notify components that the fare has been invalidated
    this.dispatchFareEvent('fare-cache-invalidated', { tripType, vehicleId });
  }
  
  private async lock<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isLocked) {
      return new Promise<T>((resolve, reject) => {
        const queuedOperation = async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        
        this.requestQueue.push(queuedOperation);
      });
    }
    
    this.isLocked = true;
    
    try {
      const result = await operation();
      return result;
    } finally {
      this.isLocked = false;
      
      if (this.requestQueue.length > 0) {
        const nextOperation = this.requestQueue.shift();
        if (nextOperation) {
          nextOperation().catch(error => {
            console.error('FareStateManager: Error in queued operation:', error);
          });
        }
      }
    }
  }
  
  public async getOutstationFares(forceRefresh = false): Promise<Record<string, OutstationFare>> {
    return this.lock(async () => {
      const now = Date.now();
      const cacheKey = 'allOutstationFares';
      
      // Return from cache if not forced and cache is fresh
      if (!forceRefresh && 
          now - this.lastFetchTimestamp.outstation < this.maxCacheAge) {
        const allFares: Record<string, OutstationFare> = {};
        let hasData = false;
        
        this.outstationFaresCache.forEach((cacheItem, vehicleId) => {
          if (now < cacheItem.expiry) {
            allFares[vehicleId] = cacheItem.data;
            hasData = true;
          }
        });
        
        if (hasData) {
          console.log('FareStateManager: Using cached outstation fares');
          return allFares;
        }
      }
      
      try {
        const url = getApiUrl(`api/outstation-fares.php?_t=${now}`);
        console.log('FareStateManager: Fetching all outstation fares from:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.fares && typeof data.fares === 'object') {
          const allFares: Record<string, OutstationFare> = {};
          const expiry = now + this.maxCacheAge;
          
          // Process and cache each fare
          Object.entries(data.fares).forEach(([vehicleId, fare]) => {
            if (isOutstationFare(fare)) {
              allFares[vehicleId] = fare;
              this.outstationFaresCache.set(vehicleId, {
                data: fare,
                timestamp: now,
                expiry
              });
            }
          });
          
          this.lastFetchTimestamp.outstation = now;
          console.log(`FareStateManager: Fetched ${Object.keys(allFares).length} outstation fares`);
          
          // Dispatch event to notify components that fares have been updated
          this.dispatchFareEvent('fare-data-fetched', { 
            tripType: 'outstation', 
            timestamp: now 
          });
          
          return allFares;
        }
        
        throw new Error('Invalid response format or no data returned');
      } catch (error) {
        console.error('FareStateManager: Error fetching outstation fares:', error);
        
        // If cache exists, use it as fallback
        if (this.outstationFaresCache.size > 0) {
          const allFares: Record<string, OutstationFare> = {};
          this.outstationFaresCache.forEach((cacheItem, vehicleId) => {
            allFares[vehicleId] = cacheItem.data;
          });
          
          console.log('FareStateManager: Using expired cache as fallback for outstation fares');
          return allFares;
        }
        
        throw error;
      }
    });
  }
  
  public async getOutstationFareForVehicle(vehicleId: string, forceRefresh = false): Promise<OutstationFare | null> {
    if (!vehicleId) {
      console.error('FareStateManager: Vehicle ID is required');
      return null;
    }
    
    return this.lock(async () => {
      const now = Date.now();
      const cachedFare = this.outstationFaresCache.get(vehicleId);
      
      // Return from cache if not forced and cache is fresh
      if (!forceRefresh && cachedFare && now < cachedFare.expiry) {
        console.log(`FareStateManager: Using cached outstation fare for ${vehicleId}`);
        return cachedFare.data;
      }
      
      try {
        // First try to find it in the existing cache of all fares
        if (now - this.lastFetchTimestamp.outstation < this.maxCacheAge && !forceRefresh) {
          const allFares = await this.getOutstationFares(false);
          if (allFares[vehicleId]) {
            return allFares[vehicleId];
          }
        }
        
        // If not found or cache is stale, make a direct request
        const url = getApiUrl(`api/outstation-fares.php?vehicle_id=${vehicleId}&_t=${now}`);
        console.log(`FareStateManager: Fetching outstation fare for ${vehicleId} from:`, url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.fares && data.fares[vehicleId]) {
          const fare = data.fares[vehicleId];
          
          if (isOutstationFare(fare)) {
            // Cache the result
            this.outstationFaresCache.set(vehicleId, {
              data: fare,
              timestamp: now,
              expiry: now + this.maxCacheAge
            });
            
            console.log(`FareStateManager: Fetched outstation fare for ${vehicleId}`);
            
            // Dispatch event for this specific vehicle's fare update
            this.dispatchFareEvent('fare-data-fetched', { 
              tripType: 'outstation', 
              vehicleId, 
              timestamp: now 
            });
            
            return fare;
          }
        }
        
        // If we couldn't find the vehicle-specific fare, try to get all fares
        const allFares = await this.getOutstationFares(true);
        if (allFares[vehicleId]) {
          return allFares[vehicleId];
        }
        
        throw new Error(`No outstation fare data found for vehicle: ${vehicleId}`);
      } catch (error) {
        console.error(`FareStateManager: Error fetching outstation fare for ${vehicleId}:`, error);
        
        // Use cached value as fallback if available
        if (cachedFare) {
          console.log(`FareStateManager: Using expired cache as fallback for ${vehicleId}`);
          return cachedFare.data;
        }
        
        // As a last resort, return default structure
        console.log(`FareStateManager: Creating default outstation fare for ${vehicleId}`);
        
        return {
          vehicleId,
          basePrice: 0,
          pricePerKm: 0,
          roundTripBasePrice: 0,
          roundTripPricePerKm: 0,
          driverAllowance: 300,
          nightHaltCharge: 700
        };
      }
    });
  }
  
  public async getLocalFares(forceRefresh = false): Promise<Record<string, LocalFare>> {
    return this.lock(async () => {
      const now = Date.now();
      
      // Return from cache if not forced and cache is fresh
      if (!forceRefresh && 
          now - this.lastFetchTimestamp.local < this.maxCacheAge) {
        const allFares: Record<string, LocalFare> = {};
        let hasData = false;
        
        this.localFaresCache.forEach((cacheItem, vehicleId) => {
          if (now < cacheItem.expiry) {
            allFares[vehicleId] = cacheItem.data;
            hasData = true;
          }
        });
        
        if (hasData) {
          console.log('FareStateManager: Using cached local fares');
          return allFares;
        }
      }
      
      try {
        const url = getApiUrl(`api/local-package-fares.php?_t=${now}`);
        console.log('FareStateManager: Fetching all local fares from:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.fares && Array.isArray(data.fares)) {
          const allFares: Record<string, LocalFare> = {};
          const expiry = now + this.maxCacheAge;
          
          // Process and cache each fare
          data.fares.forEach((fare: any) => {
            if (fare.vehicleId) {
              const vehicleId = fare.vehicleId;
              const localFare: LocalFare = {
                vehicleId,
                price4hrs40km: parseFloat(fare.price4hrs40km) || 0,
                price8hrs80km: parseFloat(fare.price8hrs80km) || 0,
                price10hrs100km: parseFloat(fare.price10hrs100km) || 0,
                priceExtraKm: parseFloat(fare.priceExtraKm) || 0,
                priceExtraHour: parseFloat(fare.priceExtraHour) || 0,
                driverAllowance: parseFloat(fare.driverAllowance) || 250
              };
              
              allFares[vehicleId] = localFare;
              this.localFaresCache.set(vehicleId, {
                data: localFare,
                timestamp: now,
                expiry
              });
            }
          });
          
          this.lastFetchTimestamp.local = now;
          console.log(`FareStateManager: Fetched ${Object.keys(allFares).length} local fares`);
          
          // Dispatch event to notify components that fares have been updated
          this.dispatchFareEvent('fare-data-fetched', { 
            tripType: 'local', 
            timestamp: now 
          });
          
          return allFares;
        }
        
        throw new Error('Invalid response format or no data returned for local fares');
      } catch (error) {
        console.error('FareStateManager: Error fetching local fares:', error);
        
        // If cache exists, use it as fallback
        if (this.localFaresCache.size > 0) {
          const allFares: Record<string, LocalFare> = {};
          this.localFaresCache.forEach((cacheItem, vehicleId) => {
            allFares[vehicleId] = cacheItem.data;
          });
          
          console.log('FareStateManager: Using expired cache as fallback for local fares');
          return allFares;
        }
        
        throw error;
      }
    });
  }
  
  public async getLocalFareForVehicle(vehicleId: string, forceRefresh = false): Promise<LocalFare | null> {
    if (!vehicleId) {
      console.error('FareStateManager: Vehicle ID is required for local fare');
      return null;
    }
    
    return this.lock(async () => {
      const now = Date.now();
      const cachedFare = this.localFaresCache.get(vehicleId);
      
      // Return from cache if not forced and cache is fresh
      if (!forceRefresh && cachedFare && now < cachedFare.expiry) {
        console.log(`FareStateManager: Using cached local fare for ${vehicleId}`);
        return cachedFare.data;
      }
      
      try {
        // First try to find it in the existing cache of all fares
        if (now - this.lastFetchTimestamp.local < this.maxCacheAge && !forceRefresh) {
          const allFares = await this.getLocalFares(false);
          if (allFares[vehicleId]) {
            return allFares[vehicleId];
          }
        }
        
        // If not found or cache is stale, make a direct request
        const url = getApiUrl(`api/local-package-fares.php?vehicle_id=${vehicleId}&_t=${now}`);
        console.log(`FareStateManager: Fetching local fare for ${vehicleId} from:`, url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.fares && Array.isArray(data.fares)) {
          // Find the fare for this vehicle
          const fareDatas = data.fares.filter((f: any) => 
            f.vehicleId === vehicleId || f.vehicle_id === vehicleId
          );
          
          if (fareDatas.length > 0) {
            const fareData = fareDatas[0];
            const fare: LocalFare = {
              vehicleId,
              price4hrs40km: parseFloat(fareData.price4hrs40km) || 0,
              price8hrs80km: parseFloat(fareData.price8hrs80km) || 0,
              price10hrs100km: parseFloat(fareData.price10hrs100km) || 0,
              priceExtraKm: parseFloat(fareData.priceExtraKm) || 0,
              priceExtraHour: parseFloat(fareData.priceExtraHour) || 0,
              driverAllowance: parseFloat(fareData.driverAllowance) || 250
            };
            
            // Cache the result
            this.localFaresCache.set(vehicleId, {
              data: fare,
              timestamp: now,
              expiry: now + this.maxCacheAge
            });
            
            console.log(`FareStateManager: Fetched local fare for ${vehicleId}`);
            
            // Dispatch event for this specific vehicle's fare update
            this.dispatchFareEvent('fare-data-fetched', { 
              tripType: 'local', 
              vehicleId, 
              timestamp: now 
            });
            
            return fare;
          }
        }
        
        // If we couldn't find the vehicle-specific fare, try to get all fares
        const allFares = await this.getLocalFares(true);
        if (allFares[vehicleId]) {
          return allFares[vehicleId];
        }
        
        throw new Error(`No local fare data found for vehicle: ${vehicleId}`);
      } catch (error) {
        console.error(`FareStateManager: Error fetching local fare for ${vehicleId}:`, error);
        
        // Use cached value as fallback if available
        if (cachedFare) {
          console.log(`FareStateManager: Using expired cache as fallback for ${vehicleId}`);
          return cachedFare.data;
        }
        
        // As a last resort, return default structure
        console.log(`FareStateManager: Creating default local fare for ${vehicleId}`);
        
        // Basic defaults based on vehicle type
        let defaults = {
          price4hrs40km: 800,
          price8hrs80km: 1500,
          price10hrs100km: 1800,
          priceExtraKm: 12,
          priceExtraHour: 100,
          driverAllowance: 250
        };
        
        if (vehicleId.includes('ertiga')) {
          defaults = {
            price4hrs40km: 1000,
            price8hrs80km: 1800,
            price10hrs100km: 2200,
            priceExtraKm: 15,
            priceExtraHour: 120,
            driverAllowance: 250
          };
        } else if (vehicleId.includes('innova')) {
          defaults = {
            price4hrs40km: 1200,
            price8hrs80km: 2200,
            price10hrs100km: 2600,
            priceExtraKm: 18,
            priceExtraHour: 150,
            driverAllowance: 300
          };
        }
        
        return {
          vehicleId,
          ...defaults
        };
      }
    });
  }
  
  public async getAirportFares(forceRefresh = false): Promise<Record<string, AirportFare>> {
    return this.lock(async () => {
      const now = Date.now();
      
      // Return from cache if not forced and cache is fresh
      if (!forceRefresh && 
          now - this.lastFetchTimestamp.airport < this.maxCacheAge) {
        const allFares: Record<string, AirportFare> = {};
        let hasData = false;
        
        this.airportFaresCache.forEach((cacheItem, vehicleId) => {
          if (now < cacheItem.expiry) {
            allFares[vehicleId] = cacheItem.data;
            hasData = true;
          }
        });
        
        if (hasData) {
          console.log('FareStateManager: Using cached airport fares');
          return allFares;
        }
      }
      
      try {
        const url = getApiUrl(`api/airport-transfer-fares.php?_t=${now}`);
        console.log('FareStateManager: Fetching all airport fares from:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.fares && Array.isArray(data.fares)) {
          const allFares: Record<string, AirportFare> = {};
          const expiry = now + this.maxCacheAge;
          
          // Process and cache each fare
          data.fares.forEach((fare: any) => {
            if (fare.vehicleId) {
              const vehicleId = fare.vehicleId;
              const airportFare: AirportFare = {
                vehicleId,
                tier1Price: parseFloat(fare.tier1Price) || 0,
                tier2Price: parseFloat(fare.tier2Price) || 0,
                tier3Price: parseFloat(fare.tier3Price) || 0,
                tier4Price: parseFloat(fare.tier4Price) || 0,
                extraKmCharge: parseFloat(fare.extraKmCharge) || 0
              };
              
              allFares[vehicleId] = airportFare;
              this.airportFaresCache.set(vehicleId, {
                data: airportFare,
                timestamp: now,
                expiry
              });
            }
          });
          
          this.lastFetchTimestamp.airport = now;
          console.log(`FareStateManager: Fetched ${Object.keys(allFares).length} airport fares`);
          
          // Dispatch event to notify components that fares have been updated
          this.dispatchFareEvent('fare-data-fetched', { 
            tripType: 'airport', 
            timestamp: now 
          });
          
          return allFares;
        }
        
        throw new Error('Invalid response format or no data returned for airport fares');
      } catch (error) {
        console.error('FareStateManager: Error fetching airport fares:', error);
        
        // If cache exists, use it as fallback
        if (this.airportFaresCache.size > 0) {
          const allFares: Record<string, AirportFare> = {};
          this.airportFaresCache.forEach((cacheItem, vehicleId) => {
            allFares[vehicleId] = cacheItem.data;
          });
          
          console.log('FareStateManager: Using expired cache as fallback for airport fares');
          return allFares;
        }
        
        throw error;
      }
    });
  }
  
  public async getAirportFareForVehicle(vehicleId: string, forceRefresh = false): Promise<AirportFare | null> {
    if (!vehicleId) {
      console.error('FareStateManager: Vehicle ID is required for airport fare');
      return null;
    }
    
    return this.lock(async () => {
      const now = Date.now();
      const cachedFare = this.airportFaresCache.get(vehicleId);
      
      // Return from cache if not forced and cache is fresh
      if (!forceRefresh && cachedFare && now < cachedFare.expiry) {
        console.log(`FareStateManager: Using cached airport fare for ${vehicleId}`);
        return cachedFare.data;
      }
      
      try {
        // First try to find it in the existing cache of all fares
        if (now - this.lastFetchTimestamp.airport < this.maxCacheAge && !forceRefresh) {
          const allFares = await this.getAirportFares(false);
          if (allFares[vehicleId]) {
            return allFares[vehicleId];
          }
        }
        
        // If not found or cache is stale, make a direct request
        const url = getApiUrl(`api/airport-transfer-fares.php?vehicle_id=${vehicleId}&_t=${now}`);
        console.log(`FareStateManager: Fetching airport fare for ${vehicleId} from:`, url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.fares && Array.isArray(data.fares)) {
          // Find the fare for this vehicle
          const fareDatas = data.fares.filter((f: any) => 
            f.vehicleId === vehicleId || f.vehicle_id === vehicleId
          );
          
          if (fareDatas.length > 0) {
            const fareData = fareDatas[0];
            const fare: AirportFare = {
              vehicleId,
              tier1Price: parseFloat(fareData.tier1Price) || 0,
              tier2Price: parseFloat(fareData.tier2Price) || 0,
              tier3Price: parseFloat(fareData.tier3Price) || 0,
              tier4Price: parseFloat(fareData.tier4Price) || 0,
              extraKmCharge: parseFloat(fareData.extraKmCharge) || 0
            };
            
            // Cache the result
            this.airportFaresCache.set(vehicleId, {
              data: fare,
              timestamp: now,
              expiry: now + this.maxCacheAge
            });
            
            console.log(`FareStateManager: Fetched airport fare for ${vehicleId}`);
            
            // Dispatch event for this specific vehicle's fare update
            this.dispatchFareEvent('fare-data-fetched', { 
              tripType: 'airport', 
              vehicleId, 
              timestamp: now 
            });
            
            return fare;
          }
        }
        
        // If we couldn't find the vehicle-specific fare, try to get all fares
        const allFares = await this.getAirportFares(true);
        if (allFares[vehicleId]) {
          return allFares[vehicleId];
        }
        
        throw new Error(`No airport fare data found for vehicle: ${vehicleId}`);
      } catch (error) {
        console.error(`FareStateManager: Error fetching airport fare for ${vehicleId}:`, error);
        
        // Use cached value as fallback if available
        if (cachedFare) {
          console.log(`FareStateManager: Using expired cache as fallback for ${vehicleId}`);
          return cachedFare.data;
        }
        
        // As a last resort, return default structure
        console.log(`FareStateManager: Creating default airport fare for ${vehicleId}`);
        
        // Basic defaults based on vehicle type
        let defaults = {
          tier1Price: 800,
          tier2Price: 1200,
          tier3Price: 1600,
          tier4Price: 2000,
          extraKmCharge: 12
        };
        
        if (vehicleId.includes('ertiga')) {
          defaults = {
            tier1Price: 1000,
            tier2Price: 1500,
            tier3Price: 2000,
            tier4Price: 2500,
            extraKmCharge: 15
          };
        } else if (vehicleId.includes('innova')) {
          defaults = {
            tier1Price: 1200,
            tier2Price: 1800,
            tier3Price: 2400,
            tier4Price: 3000,
            extraKmCharge: 18
          };
        }
        
        return {
          vehicleId,
          ...defaults
        };
      }
    });
  }
  
  // Calculate outstation fare for a specific vehicle and trip details
  public async calculateOutstationFare(params: {
    vehicleId: string;
    distance: number;
    tripMode: 'one-way' | 'round-trip';
    pickupDate?: Date;
  }): Promise<number> {
    const { vehicleId, distance, tripMode, pickupDate } = params;
    
    try {
      // Get the fare data from the database
      const fare = await this.getOutstationFareForVehicle(vehicleId);
      
      if (!fare) {
        throw new Error(`No outstation fare data found for vehicle: ${vehicleId}`);
      }
      
      const minKm = 300;
      let effectiveDistance = distance;
      
      // For one-way trips, double the distance for driver return
      if (tripMode === 'one-way') {
        effectiveDistance = Math.max(distance * 2, minKm);
      } else {
        effectiveDistance = Math.max(distance, minKm);
      }
      
      // Calculate base fare
      const perKmRate = tripMode === 'one-way' ? 
        fare.pricePerKm : 
        fare.roundTripPricePerKm;
      
      const baseFare = effectiveDistance * perKmRate;
      
      // Add driver allowance
      let calculatedFare = baseFare + fare.driverAllowance;
      
      // Add night charges if applicable (usually 10% of base fare)
      if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
        const nightCharges = Math.round(baseFare * 0.1);
        calculatedFare += nightCharges;
      }
      
      // Round to nearest 10
      calculatedFare = Math.round(calculatedFare / 10) * 10;
      
      console.log(`FareStateManager: Calculated outstation fare for ${vehicleId}: ${calculatedFare}`);
      
      // Dispatch an event with the calculated fare
      this.dispatchFareEvent('fare-calculated', {
        cabId: vehicleId,
        fare: calculatedFare,
        tripType: 'outstation',
        timestamp: Date.now()
      });
      
      return calculatedFare;
    } catch (error) {
      console.error(`FareStateManager: Error calculating outstation fare for ${vehicleId}:`, error);
      return 0;
    }
  }
  
  // Calculate local fare for a specific vehicle and trip details
  public async calculateLocalFare(params: {
    vehicleId: string;
    hourlyPackage: string;
  }): Promise<number> {
    const { vehicleId, hourlyPackage } = params;
    
    try {
      // Get the fare data from the database
      const fare = await this.getLocalFareForVehicle(vehicleId);
      
      if (!fare) {
        throw new Error(`No local fare data found for vehicle: ${vehicleId}`);
      }
      
      let packagePrice = 0;
      
      if (hourlyPackage === '4hrs-40km') {
        packagePrice = fare.price4hrs40km;
      } else if (hourlyPackage === '8hrs-80km') {
        packagePrice = fare.price8hrs80km;
      } else if (hourlyPackage === '10hrs-100km') {
        packagePrice = fare.price10hrs100km;
      } else {
        // Default to 8hrs package
        packagePrice = fare.price8hrs80km;
      }
      
      // Add driver allowance
      const calculatedFare = packagePrice + fare.driverAllowance;
      
      console.log(`FareStateManager: Calculated local fare for ${vehicleId} (${hourlyPackage}): ${calculatedFare}`);
      
      // Dispatch an event with the calculated fare
      this.dispatchFareEvent('fare-calculated', {
        cabId: vehicleId,
        fare: calculatedFare,
        tripType: 'local',
        hourlyPackage,
        timestamp: Date.now()
      });
      
      return calculatedFare;
    } catch (error) {
      console.error(`FareStateManager: Error calculating local fare for ${vehicleId}:`, error);
      return 0;
    }
  }
  
  // Calculate airport fare for a specific vehicle and trip details
  public async calculateAirportFare(params: {
    vehicleId: string;
    distance: number;
  }): Promise<number> {
    const { vehicleId, distance } = params;
    
    try {
      // Get the fare data from the database
      const fare = await this.getAirportFareForVehicle(vehicleId);
      
      if (!fare) {
        throw new Error(`No airport fare data found for vehicle: ${vehicleId}`);
      }
      
      let calculatedFare = 0;
      
      // Determine tier based on distance
      if (distance <= 10) {
        calculatedFare = fare.tier1Price;
      } else if (distance <= 20) {
        calculatedFare = fare.tier2Price;
      } else if (distance <= 30) {
        calculatedFare = fare.tier3Price;
      } else {
        calculatedFare = fare.tier4Price;
        
        // Add cost for extra kilometers
        if (distance > 30) {
          const extraKm = distance - 30;
          calculatedFare += extraKm * fare.extraKmCharge;
        }
      }
      
      // Round to nearest 10
      calculatedFare = Math.round(calculatedFare / 10) * 10;
      
      console.log(`FareStateManager: Calculated airport fare for ${vehicleId}: ${calculatedFare}`);
      
      // Dispatch an event with the calculated fare
      this.dispatchFareEvent('fare-calculated', {
        cabId: vehicleId,
        fare: calculatedFare,
        tripType: 'airport',
        timestamp: Date.now()
      });
      
      return calculatedFare;
    } catch (error) {
      console.error(`FareStateManager: Error calculating airport fare for ${vehicleId}:`, error);
      return 0;
    }
  }
  
  // Utility to dispatch custom events
  private dispatchFareEvent(eventName: string, detail: any): void {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
      } catch (error) {
        console.error(`FareStateManager: Error dispatching ${eventName} event:`, error);
      }
    }
  }
  
  // Clear all fare caches and fetch new data
  public async refreshAllFares(): Promise<void> {
    this.clearAllCaches();
    clearFareCache();
    
    try {
      await Promise.all([
        this.getOutstationFares(true),
        this.getLocalFares(true),
        this.getAirportFares(true)
      ]);
      
      toast.success('Fare data refreshed successfully');
      
      this.dispatchFareEvent('fare-data-updated', {
        timestamp: Date.now(),
        allFaresRefreshed: true
      });
    } catch (error) {
      console.error('FareStateManager: Error refreshing all fares:', error);
      toast.error('Failed to refresh fare data');
    }
  }
}

export const fareStateManager = FareStateManager.getInstance();
export default fareStateManager;
