
// FareStateManager.ts - Centralized fare management service
import { toast } from "sonner";

interface FareCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

interface AirportFareParams {
  vehicleId: string;
  distance: number;
}

interface LocalFareParams {
  vehicleId: string;
  hourlyPackage: string;
}

interface OutstationFareParams {
  vehicleId: string;
  distance: number;
  tripMode: 'one-way' | 'round-trip';
  pickupDate?: string | Date;
}

class FareStateManager {
  private cache: FareCache = {};
  private cacheExpiry = 15 * 60 * 1000; // 15 minutes
  private apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  // Function to clear cache, with option to clear specific cache entries
  public clearCache(specificKeys?: string[]) {
    if (specificKeys && specificKeys.length > 0) {
      specificKeys.forEach(key => {
        delete this.cache[key];
      });
      console.log(`FareStateManager: Cleared specific cache entries: ${specificKeys.join(', ')}`);
    } else {
      this.cache = {};
      console.log('FareStateManager: Cleared entire cache');
    }
    
    // Trigger UI refresh
    window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
      detail: { timestamp: Date.now() }
    }));
  }
  
  // Check if cache is valid for a key
  private isCacheValid(key: string): boolean {
    const cacheEntry = this.cache[key];
    if (!cacheEntry) return false;
    
    const now = Date.now();
    return now - cacheEntry.timestamp < this.cacheExpiry;
  }
  
  // Get data from cache or null if invalid/missing
  private getFromCache(key: string): any | null {
    if (this.isCacheValid(key)) {
      return this.cache[key].data;
    }
    return null;
  }
  
  // Set data in cache
  private setCache(key: string, data: any) {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
  }
  
  // Airport fare calculation
  public async calculateAirportFare(params: AirportFareParams): Promise<number> {
    try {
      const { vehicleId, distance } = params;
      const cacheKey = `airport_${vehicleId}_${distance}`;
      
      // Try to get from cache first
      const cachedFare = this.getFromCache(cacheKey);
      if (cachedFare !== null) {
        console.log(`FareStateManager: Airport fare for ${vehicleId} from cache:`, cachedFare);
        return cachedFare;
      }
      
      // Calculate the fare
      console.log(`FareStateManager: Calculating airport fare for ${vehicleId} with distance ${distance}`);
      
      // Get the fare structure for this vehicle
      const fareStructure = await this.getAirportFareForVehicle(vehicleId);
      
      if (!fareStructure) {
        console.error(`No airport fare structure found for ${vehicleId}`);
        return 0;
      }
      
      let calculatedFare = 0;
      
      // Apply the fare calculation logic
      if (fareStructure.baseFare) {
        calculatedFare = fareStructure.baseFare;
      } else if (fareStructure.perKmRate) {
        calculatedFare = fareStructure.perKmRate * distance;
      }
      
      // Apply minimums
      if (fareStructure.minimumFare && calculatedFare < fareStructure.minimumFare) {
        calculatedFare = fareStructure.minimumFare;
      }
      
      console.log(`FareStateManager: Calculated airport fare for ${vehicleId}:`, calculatedFare);
      
      // Cache the result
      this.setCache(cacheKey, calculatedFare);
      
      return calculatedFare;
    } catch (error) {
      console.error('FareStateManager: Error calculating airport fare:', error);
      return 0;
    }
  }
  
  // Local fare calculation
  public async calculateLocalFare(params: LocalFareParams): Promise<number> {
    try {
      const { vehicleId, hourlyPackage } = params;
      const cacheKey = `local_${vehicleId}_${hourlyPackage}`;
      
      // Try to get from cache first
      const cachedFare = this.getFromCache(cacheKey);
      if (cachedFare !== null) {
        console.log(`FareStateManager: Local fare for ${vehicleId} (${hourlyPackage}) from cache:`, cachedFare);
        return cachedFare;
      }
      
      // Get the local fare structure for this vehicle
      const fareStructure = await this.getLocalFareForVehicle(vehicleId);
      
      if (!fareStructure) {
        console.error(`No local fare structure found for ${vehicleId}`);
        return 0;
      }
      
      let calculatedFare = 0;
      
      // Apply fare based on hourly package
      switch (hourlyPackage) {
        case '4hrs-40km':
          calculatedFare = fareStructure.price4hrs40km || 0;
          break;
        case '8hrs-80km':
          calculatedFare = fareStructure.price8hrs80km || 0;
          break;
        case '10hrs-100km':
          calculatedFare = fareStructure.price10hrs100km || 0;
          break;
        default:
          console.error(`Unknown hourly package: ${hourlyPackage}`);
          return 0;
      }
      
      console.log(`FareStateManager: Calculated local fare for ${vehicleId} (${hourlyPackage}):`, calculatedFare);
      
      // Cache the result
      this.setCache(cacheKey, calculatedFare);
      
      return calculatedFare;
    } catch (error) {
      console.error('FareStateManager: Error calculating local fare:', error);
      return 0;
    }
  }
  
  // Outstation fare calculation
  public async calculateOutstationFare(params: OutstationFareParams): Promise<number> {
    try {
      const { vehicleId, distance, tripMode } = params;
      const cacheKey = `outstation_${vehicleId}_${distance}_${tripMode}`;
      
      // Try to get from cache first
      const cachedFare = this.getFromCache(cacheKey);
      if (cachedFare !== null) {
        console.log(`FareStateManager: Outstation fare for ${vehicleId} from cache:`, cachedFare);
        return cachedFare;
      }
      
      // Get the outstation fare structure for this vehicle
      const fareStructure = await this.getOutstationFareForVehicle(vehicleId);
      
      if (!fareStructure) {
        console.error(`No outstation fare structure found for ${vehicleId}`);
        return 0;
      }
      
      let calculatedFare = 0;
      
      // Different calculation based on trip mode
      if (tripMode === 'one-way') {
        if (fareStructure.perKmRate) {
          calculatedFare = fareStructure.perKmRate * distance;
        }
        
        // Add driver allowance for one-way trips
        if (fareStructure.driverAllowance) {
          calculatedFare += fareStructure.driverAllowance;
        }
      } else { // round-trip
        if (fareStructure.perKmRate) {
          // For round-trip, calculate for total distance (both ways)
          calculatedFare = fareStructure.perKmRate * distance * 2;
        }
        
        // Add night halt charges for round-trip
        if (fareStructure.nightHaltCharge) {
          calculatedFare += fareStructure.nightHaltCharge;
        }
      }
      
      // Apply minimums
      if (fareStructure.minimumFare && calculatedFare < fareStructure.minimumFare) {
        calculatedFare = fareStructure.minimumFare;
      }
      
      console.log(`FareStateManager: Calculated outstation fare for ${vehicleId}:`, calculatedFare);
      
      // Cache the result
      this.setCache(cacheKey, calculatedFare);
      
      return calculatedFare;
    } catch (error) {
      console.error('FareStateManager: Error calculating outstation fare:', error);
      return 0;
    }
  }
  
  // Get airport fare data for a specific vehicle
  public async getAirportFareForVehicle(vehicleId: string): Promise<any> {
    try {
      const cacheKey = `airportFareStructure_${vehicleId}`;
      
      // Try to get from cache first
      const cachedStructure = this.getFromCache(cacheKey);
      if (cachedStructure !== null) {
        return cachedStructure;
      }
      
      // Construct the API URL for direct-airport-fares.php
      const urlPath = `/api/direct-airport-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
      const fullUrl = this.apiBaseUrl + urlPath;
      
      console.log(`FareStateManager: Fetching airport fare data for ${vehicleId}:`, fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error fetching airport fare: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.fares && data.fares.length > 0) {
        // Get the first matching fare structure
        const fareStructure = data.fares.find((fare: any) => fare.vehicleId === vehicleId) || data.fares[0];
        
        // Cache the result
        this.setCache(cacheKey, fareStructure);
        
        return fareStructure;
      } else {
        console.warn(`No airport fare data found for ${vehicleId}`);
        return null;
      }
    } catch (error) {
      console.error(`FareStateManager: Error fetching airport fare for ${vehicleId}:`, error);
      return null;
    }
  }
  
  // Get local fare data for a specific vehicle
  public async getLocalFareForVehicle(vehicleId: string): Promise<any> {
    try {
      const cacheKey = `localFareStructure_${vehicleId}`;
      
      // Try to get from cache first
      const cachedStructure = this.getFromCache(cacheKey);
      if (cachedStructure !== null) {
        return cachedStructure;
      }
      
      // Construct the API URL for direct-local-fares.php
      const urlPath = `/api/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
      const fullUrl = this.apiBaseUrl + urlPath;
      
      console.log(`FareStateManager: Fetching local fare data for ${vehicleId}:`, fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error fetching local fare: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.fares && data.fares.length > 0) {
        // Get the first matching fare structure
        const fareStructure = data.fares.find((fare: any) => fare.vehicleId === vehicleId) || data.fares[0];
        
        // Cache the result
        this.setCache(cacheKey, fareStructure);
        
        return fareStructure;
      } else {
        console.warn(`No local fare data found for ${vehicleId}`);
        return null;
      }
    } catch (error) {
      console.error(`FareStateManager: Error fetching local fare for ${vehicleId}:`, error);
      return null;
    }
  }
  
  // Get outstation fare data for a specific vehicle
  public async getOutstationFareForVehicle(vehicleId: string): Promise<any> {
    try {
      const cacheKey = `outstationFareStructure_${vehicleId}`;
      
      // Try to get from cache first
      const cachedStructure = this.getFromCache(cacheKey);
      if (cachedStructure !== null) {
        return cachedStructure;
      }
      
      // Construct the API URL for direct-outstation-fares.php
      const urlPath = `/api/direct-outstation-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
      const fullUrl = this.apiBaseUrl + urlPath;
      
      console.log(`FareStateManager: Fetching outstation fare data for ${vehicleId}:`, fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error fetching outstation fare: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.fares && data.fares.length > 0) {
        // Get the first matching fare structure
        const fareStructure = data.fares.find((fare: any) => fare.vehicleId === vehicleId) || data.fares[0];
        
        // Cache the result
        this.setCache(cacheKey, fareStructure);
        
        return fareStructure;
      } else {
        console.warn(`No outstation fare data found for ${vehicleId}`);
        return null;
      }
    } catch (error) {
      console.error(`FareStateManager: Error fetching outstation fare for ${vehicleId}:`, error);
      return null;
    }
  }
  
  // Sync fare data from the server
  public async syncFareData(): Promise<boolean> {
    try {
      console.log('FareStateManager: Syncing fare data...');
      
      // Clear the cache before syncing
      this.clearCache();
      
      // Make a request to sync the fare data
      const response = await fetch(`${this.apiBaseUrl}/api/sync-fares.php?_t=${Date.now()}`, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error syncing fares: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        console.log('FareStateManager: Fare data synced successfully');
        
        // Notify UI components that fare data has been updated
        window.dispatchEvent(new CustomEvent('fare-data-updated', {
          detail: { timestamp: Date.now() }
        }));
        
        return true;
      } else {
        console.error('FareStateManager: Failed to sync fare data:', data.message);
        return false;
      }
    } catch (error) {
      console.error('FareStateManager: Error syncing fare data:', error);
      return false;
    }
  }
}

// Create a singleton instance
const fareStateManager = new FareStateManager();

export default fareStateManager;
