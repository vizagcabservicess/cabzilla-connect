
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { toast } from 'sonner';

// Interface for airport fare calculation
interface AirportFareParams {
  vehicleId: string;
  distance: number;
}

// Interface for local fare calculation
interface LocalFareParams {
  vehicleId: string;
  hourlyPackage: string;
}

// Interface for outstation fare calculation
interface OutstationFareParams {
  vehicleId: string;
  distance: number;
  tripMode: 'one-way' | 'round-trip';
  pickupDate?: Date;
}

// Fare state manager for handling all fare calculations
class FareStateManager {
  private requestsInProgress: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { value: any, timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes cache time

  // Clear the fare cache
  public clearCache() {
    this.cache.clear();
    console.log('FareStateManager: Cache cleared');
    
    try {
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Error dispatching fare-cache-cleared event:', error);
    }
  }

  // Calculate airport fare
  public async calculateAirportFare(params: AirportFareParams): Promise<number> {
    const { vehicleId, distance } = params;
    
    if (!vehicleId) {
      console.error('Vehicle ID is required for airport fare calculation');
      return 0;
    }

    const cacheKey = `airport_${vehicleId}_${distance}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`FareStateManager: Using cached airport fare for ${vehicleId}: ${cached.value}`);
      return cached.value;
    }

    // Check if there's already a request in progress for this calculation
    if (this.requestsInProgress.has(cacheKey)) {
      console.log(`FareStateManager: Request in progress for ${cacheKey}, waiting...`);
      return this.requestsInProgress.get(cacheKey)!;
    }

    // Create a new request
    const promise = this.fetchAirportFare(vehicleId, distance);
    this.requestsInProgress.set(cacheKey, promise);

    try {
      const fare = await promise;
      this.cache.set(cacheKey, { value: fare, timestamp: Date.now() });
      return fare;
    } catch (error) {
      console.error(`FareStateManager: Error calculating airport fare for ${vehicleId}:`, error);
      return 0;
    } finally {
      this.requestsInProgress.delete(cacheKey);
    }
  }

  // Calculate local fare
  public async calculateLocalFare(params: LocalFareParams): Promise<number> {
    const { vehicleId, hourlyPackage } = params;
    
    if (!vehicleId) {
      console.error('Vehicle ID is required for local fare calculation');
      return 0;
    }

    if (!hourlyPackage) {
      console.error('Hourly package is required for local fare calculation');
      return 0;
    }

    const cacheKey = `local_${vehicleId}_${hourlyPackage}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`FareStateManager: Using cached local fare for ${vehicleId} (${hourlyPackage}): ${cached.value}`);
      return cached.value;
    }

    // Check if there's already a request in progress for this calculation
    if (this.requestsInProgress.has(cacheKey)) {
      console.log(`FareStateManager: Request in progress for ${cacheKey}, waiting...`);
      return this.requestsInProgress.get(cacheKey)!;
    }

    // Create a new request
    const promise = this.fetchLocalFare(vehicleId, hourlyPackage);
    this.requestsInProgress.set(cacheKey, promise);

    try {
      const fare = await promise;
      this.cache.set(cacheKey, { value: fare, timestamp: Date.now() });
      return fare;
    } catch (error) {
      console.error(`FareStateManager: Error calculating local fare for ${vehicleId} (${hourlyPackage}):`, error);
      return 0;
    } finally {
      this.requestsInProgress.delete(cacheKey);
    }
  }

  // Calculate outstation fare
  public async calculateOutstationFare(params: OutstationFareParams): Promise<number> {
    const { vehicleId, distance, tripMode, pickupDate } = params;
    
    if (!vehicleId) {
      console.error('Vehicle ID is required for outstation fare calculation');
      return 0;
    }

    const cacheKey = `outstation_${vehicleId}_${distance}_${tripMode}_${pickupDate?.getTime() || 'none'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`FareStateManager: Using cached outstation fare for ${vehicleId}: ${cached.value}`);
      return cached.value;
    }

    // Check if there's already a request in progress for this calculation
    if (this.requestsInProgress.has(cacheKey)) {
      console.log(`FareStateManager: Request in progress for ${cacheKey}, waiting...`);
      return this.requestsInProgress.get(cacheKey)!;
    }

    // Create a new request
    const promise = this.fetchOutstationFare(vehicleId, distance, tripMode);
    this.requestsInProgress.set(cacheKey, promise);

    try {
      const fare = await promise;
      this.cache.set(cacheKey, { value: fare, timestamp: Date.now() });
      return fare;
    } catch (error) {
      console.error(`FareStateManager: Error calculating outstation fare for ${vehicleId}:`, error);
      return 0;
    } finally {
      this.requestsInProgress.delete(cacheKey);
    }
  }

  // Methods for retrieving fares by vehicle type
  public async getAirportFareForVehicle(vehicleId: string): Promise<any> {
    try {
      const url = getApiUrl(`api/direct-airport-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...forceRefreshHeaders,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.status === 'success' && data.fares && data.fares.length > 0) {
        const fareData = data.fares.find((fare: any) => fare.vehicleId === vehicleId);
        if (fareData) {
          return fareData;
        }
      }
      
      throw new Error('No fare data found for this vehicle');
    } catch (error) {
      console.error(`Error fetching airport fare for ${vehicleId}:`, error);
      return null;
    }
  }

  public async getLocalFareForVehicle(vehicleId: string): Promise<any> {
    try {
      const url = getApiUrl(`api/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...forceRefreshHeaders,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.status === 'success' && data.fares && data.fares.length > 0) {
        const fareData = data.fares.find((fare: any) => fare.vehicleId === vehicleId);
        if (fareData) {
          return fareData;
        }
      }
      
      throw new Error('No fare data found for this vehicle');
    } catch (error) {
      console.error(`Error fetching local fare for ${vehicleId}:`, error);
      return null;
    }
  }

  public async getOutstationFareForVehicle(vehicleId: string): Promise<any> {
    try {
      const url = getApiUrl(`api/outstation-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...forceRefreshHeaders,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.status === 'success' && data.fares) {
        if (data.fares[vehicleId]) {
          return data.fares[vehicleId];
        }
      }
      
      throw new Error('No fare data found for this vehicle');
    } catch (error) {
      console.error(`Error fetching outstation fare for ${vehicleId}:`, error);
      return null;
    }
  }

  // Private methods for API calls
  private async fetchAirportFare(vehicleId: string, distance: number): Promise<number> {
    try {
      console.log(`Fetching airport fare for ${vehicleId} with distance ${distance}km`);
      
      const url = getApiUrl(`api/direct-airport-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...forceRefreshHeaders,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.status === 'success' && data.fares && data.fares.length > 0) {
        const fare = data.fares[0];
        
        // Determine which tier to use based on distance
        let price = 0;
        if (distance <= 10) {
          price = fare.tier1Price;
        } else if (distance <= 20) {
          price = fare.tier2Price;
        } else if (distance <= 30) {
          price = fare.tier3Price;
        } else {
          price = fare.tier4Price;
          
          // Add extra charge for distance over 40km
          if (distance > 40) {
            const extraKm = distance - 40;
            price += extraKm * fare.extraKmCharge;
          }
        }
        
        console.log(`Calculated airport fare for ${vehicleId}: ₹${price}`);
        return price;
      }
      
      throw new Error('Invalid fare data returned from API');
    } catch (error) {
      console.error(`Error fetching airport fare for ${vehicleId}:`, error);
      
      // Fallback to local estimation
      let baseFare = 0;
      
      if (vehicleId.includes('sedan')) {
        baseFare = 800;
      } else if (vehicleId.includes('ertiga')) {
        baseFare = 1000;
      } else if (vehicleId.includes('innova')) {
        baseFare = 1200;
      } else if (vehicleId.includes('tempo')) {
        baseFare = 2000;
      } else {
        baseFare = 1000;
      }
      
      // Add distance-based adjustment
      if (distance > 10) {
        const extraRate = vehicleId.includes('sedan') ? 12 : 
                        vehicleId.includes('ertiga') ? 15 : 
                        vehicleId.includes('innova') ? 18 : 25;
        baseFare += (distance - 10) * extraRate;
      }
      
      console.log(`Using fallback airport fare for ${vehicleId}: ₹${baseFare}`);
      return baseFare;
    }
  }

  private async fetchLocalFare(vehicleId: string, hourlyPackage: string): Promise<number> {
    try {
      console.log(`Fetching local fare for ${vehicleId} with package ${hourlyPackage}`);
      
      const url = getApiUrl(`api/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...forceRefreshHeaders,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.status === 'success' && data.fares && data.fares.length > 0) {
        const fare = data.fares[0];
        
        // Determine which package to use
        let price = 0;
        
        if (hourlyPackage === '4hrs40km') {
          price = fare.price4hrs40km;
        } else if (hourlyPackage === '8hrs80km') {
          price = fare.price8hrs80km;
        } else if (hourlyPackage === '10hrs100km') {
          price = fare.price10hrs100km;
        }
        
        console.log(`Calculated local fare for ${vehicleId} (${hourlyPackage}): ₹${price}`);
        return price;
      }
      
      throw new Error('Invalid fare data returned from API');
    } catch (error) {
      console.error(`Error fetching local fare for ${vehicleId}:`, error);
      
      // Fallback to local estimation
      let price = 0;
      
      if (hourlyPackage === '4hrs40km') {
        price = vehicleId.includes('sedan') ? 800 : 
              vehicleId.includes('ertiga') ? 1000 : 
              vehicleId.includes('innova') ? 1200 : 
              vehicleId.includes('tempo') ? 2000 : 1000;
      } else if (hourlyPackage === '8hrs80km') {
        price = vehicleId.includes('sedan') ? 1500 : 
              vehicleId.includes('ertiga') ? 1800 : 
              vehicleId.includes('innova') ? 2200 : 
              vehicleId.includes('tempo') ? 3500 : 1800;
      } else if (hourlyPackage === '10hrs100km') {
        price = vehicleId.includes('sedan') ? 1800 : 
              vehicleId.includes('ertiga') ? 2200 : 
              vehicleId.includes('innova') ? 2600 : 
              vehicleId.includes('tempo') ? 4000 : 2200;
      }
      
      console.log(`Using fallback local fare for ${vehicleId} (${hourlyPackage}): ₹${price}`);
      return price;
    }
  }

  private async fetchOutstationFare(vehicleId: string, distance: number, tripMode: 'one-way' | 'round-trip'): Promise<number> {
    try {
      console.log(`Fetching outstation fare for ${vehicleId} with distance ${distance}km and mode ${tripMode}`);
      
      const url = getApiUrl(`api/outstation-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...forceRefreshHeaders,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.status === 'success' && data.fares) {
        const fare = data.fares[vehicleId];
        
        if (!fare) {
          throw new Error(`No fare data found for vehicle ${vehicleId}`);
        }
        
        // Calculate fare based on trip mode
        let price = 0;
        
        if (tripMode === 'one-way') {
          // One-way trip calculation
          price = fare.basePrice + (distance * fare.pricePerKm);
          
          // Add driver allowance
          price += fare.driverAllowance || 250;
        } else {
          // Round trip calculation
          price = (fare.roundTripBasePrice || (fare.basePrice * 0.95)) + 
                 (distance * (fare.roundTripPricePerKm || (fare.pricePerKm * 0.85)));
          
          // Add driver allowance and night halt charge for round trips
          price += (fare.driverAllowance || 250) + (fare.nightHaltCharge || 700);
        }
        
        console.log(`Calculated outstation fare for ${vehicleId} (${tripMode}): ₹${price}`);
        return Math.round(price);
      }
      
      throw new Error('Invalid fare data returned from API');
    } catch (error) {
      console.error(`Error fetching outstation fare for ${vehicleId}:`, error);
      
      // Fallback to local estimation
      let basePrice = 0;
      let pricePerKm = 0;
      
      if (vehicleId.includes('sedan')) {
        basePrice = 3000;
        pricePerKm = 15;
      } else if (vehicleId.includes('ertiga')) {
        basePrice = 3500;
        pricePerKm = 18;
      } else if (vehicleId.includes('innova')) {
        basePrice = 4000;
        pricePerKm = 20;
      } else if (vehicleId.includes('tempo')) {
        basePrice = 6000;
        pricePerKm = 30;
      } else {
        basePrice = 3500;
        pricePerKm = 18;
      }
      
      let price = 0;
      
      if (tripMode === 'one-way') {
        price = basePrice + (distance * pricePerKm) + 250; // Add driver allowance
      } else {
        // Round trip - slight discount on base price and per km
        price = (basePrice * 0.95) + (distance * pricePerKm * 0.85) + 250 + 700; // Add driver allowance and night halt
      }
      
      console.log(`Using fallback outstation fare for ${vehicleId} (${tripMode}): ₹${price}`);
      return Math.round(price);
    }
  }

  // Method to synchronize fare data
  public async syncFareData(): Promise<boolean> {
    try {
      toast.info('Synchronizing fare data...');
      
      // Clear the cache
      this.clearCache();
      
      // Fetch a sample fare to trigger synchronization
      await Promise.all([
        this.fetchAirportFare('sedan', 15),
        this.fetchLocalFare('sedan', '8hrs80km'),
        this.fetchOutstationFare('sedan', 100, 'one-way')
      ]);
      
      toast.success('Fare data synchronized successfully');
      
      // Trigger fare data fetched event
      window.dispatchEvent(new CustomEvent('fare-data-fetched', {
        detail: { timestamp: Date.now() }
      }));
      
      return true;
    } catch (error) {
      console.error('Error synchronizing fare data:', error);
      toast.error('Failed to synchronize fare data');
      return false;
    }
  }
}

// Create and export a singleton instance
const fareStateManager = new FareStateManager();
export default fareStateManager;
