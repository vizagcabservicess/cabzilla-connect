
// Fare State Manager
// Centralized manager for fare data storage and calculations

import { getApiUrl } from '@/config/api';
import { getBypassHeaders, getForcedRequestConfig } from '@/config/requestConfig';
import { toast } from 'sonner';

// Cache durations
const FARE_CACHE_DURATION = 60 * 1000; // 1 minute cache for fares
const AIRPORT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for airport fares
const LOCAL_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for local fares
const OUTSTATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for outstation fares

// Interface for outstation fare parameters
interface OutstationFareParams {
  vehicleId: string;
  distance: number;
  tripMode: 'one-way' | 'round-trip';
  pickupDate?: Date;
}

// Interface for local fare parameters
interface LocalFareParams {
  vehicleId: string;
  hourlyPackage: string;
}

// Interface for airport fare parameters
interface AirportFareParams {
  vehicleId: string;
  distance: number;
}

// Type definition for fare data formats
type FareDataFormat = Record<string, any>;

// Fare data cache
interface FareCache {
  timestamp: number;
  data: FareDataFormat;
}

class FareStateManager {
  // Cache for different fare types
  private outstationFares: Record<string, FareCache> = {};
  private localFares: Record<string, FareCache> = {};
  private airportFares: Record<string, FareCache> = {};
  private fareLastSynced: number = 0;
  private syncInProgress: boolean = false;
  private debugMode: boolean = true;

  constructor() {
    // Initialize and start data sync
    this.initializeFromLocalStorage();
    this.syncFareData();
    
    if (this.debugMode) {
      console.log('FareStateManager initialized');
    }
  }

  // Save fare data to localStorage for persistence
  private saveToLocalStorage() {
    try {
      localStorage.setItem('outstationFares', JSON.stringify(this.outstationFares));
      localStorage.setItem('localFares', JSON.stringify(this.localFares));
      localStorage.setItem('airportFares', JSON.stringify(this.airportFares));
      localStorage.setItem('fareLastSynced', this.fareLastSynced.toString());
    } catch (error) {
      console.error('Error saving fare data to localStorage:', error);
    }
  }

  // Load fare data from localStorage on initialization
  private initializeFromLocalStorage() {
    try {
      const outstationFares = localStorage.getItem('outstationFares');
      const localFares = localStorage.getItem('localFares');
      const airportFares = localStorage.getItem('airportFares');
      const fareLastSynced = localStorage.getItem('fareLastSynced');

      if (outstationFares) this.outstationFares = JSON.parse(outstationFares);
      if (localFares) this.localFares = JSON.parse(localFares);
      if (airportFares) this.airportFares = JSON.parse(airportFares);
      if (fareLastSynced) this.fareLastSynced = parseInt(fareLastSynced, 10);

      if (this.debugMode) {
        console.log('Loaded fare data from localStorage:', {
          outstationFaresCount: Object.keys(this.outstationFares).length,
          localFaresCount: Object.keys(this.localFares).length,
          airportFaresCount: Object.keys(this.airportFares).length,
          lastSynced: new Date(this.fareLastSynced).toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading fare data from localStorage:', error);
    }
  }

  // Clear all cached fare data
  public clearCache() {
    this.outstationFares = {};
    this.localFares = {};
    this.airportFares = {};
    this.fareLastSynced = 0;
    
    try {
      localStorage.removeItem('outstationFares');
      localStorage.removeItem('localFares');
      localStorage.removeItem('airportFares');
      localStorage.removeItem('fareLastSynced');
      
      // Notify components about cache clear
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: Date.now() }
      }));
      
      if (this.debugMode) {
        console.log('Fare cache cleared');
      }
    } catch (error) {
      console.error('Error clearing fare cache:', error);
    }
  }

  // Sync all fare data from the server
  public async syncFareData(): Promise<boolean> {
    if (this.syncInProgress) {
      if (this.debugMode) console.log('Fare data sync already in progress');
      return false;
    }
    
    // Check if we've synced recently (within 5 minutes)
    if (Date.now() - this.fareLastSynced < 5 * 60 * 1000) {
      if (this.debugMode) console.log('Fare data synced recently, skipping');
      return true;
    }
    
    this.syncInProgress = true;
    
    try {
      if (this.debugMode) console.log('Syncing fare data from server...');
      
      // Fetch all fare types in parallel
      const [outstationSuccess, localSuccess, airportSuccess] = await Promise.all([
        this.syncOutstationFares(),
        this.syncLocalFares(),
        this.syncAirportFares()
      ]);
      
      this.fareLastSynced = Date.now();
      this.saveToLocalStorage();
      
      // Notify components about sync completion
      window.dispatchEvent(new CustomEvent('fare-data-fetched', {
        detail: { timestamp: Date.now() }
      }));
      
      if (this.debugMode) {
        console.log('Fare data sync completed:', {
          outstation: outstationSuccess,
          local: localSuccess,
          airport: airportSuccess
        });
      }
      
      return outstationSuccess && localSuccess && airportSuccess;
    } catch (error) {
      console.error('Error syncing fare data:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync outstation fares from the server
  private async syncOutstationFares(): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl('api/outstation-fares.php?_t=' + Date.now()), {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.fares) {
        throw new Error('No fare data returned from server');
      }
      
      // Reset outstation fares and add fresh data
      this.outstationFares = {};
      
      // Process the fares data
      Object.entries(data.fares).forEach(([vehicleId, fareData]) => {
        this.outstationFares[vehicleId] = {
          timestamp: Date.now(),
          data: fareData as FareDataFormat
        };
      });
      
      if (this.debugMode) {
        console.log(`Synced ${Object.keys(this.outstationFares).length} outstation fares`);
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing outstation fares:', error);
      return false;
    }
  }

  // Sync local fares from the server
  private async syncLocalFares(): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl('api/local-fares.php?_t=' + Date.now()), {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.fares) {
        throw new Error('No local fare data returned from server');
      }
      
      // Reset local fares and add fresh data
      this.localFares = {};
      
      // Process the fares data
      Object.entries(data.fares).forEach(([vehicleId, fareData]) => {
        this.localFares[vehicleId] = {
          timestamp: Date.now(),
          data: fareData as FareDataFormat
        };
      });
      
      if (this.debugMode) {
        console.log(`Synced ${Object.keys(this.localFares).length} local fares`);
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing local fares:', error);
      return false;
    }
  }

  // Sync airport fares from the server
  private async syncAirportFares(): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl('api/direct-airport-fares.php?_t=' + Date.now()), {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.fares || !Array.isArray(data.fares)) {
        throw new Error('No airport fare data returned from server');
      }
      
      // Reset airport fares and add fresh data
      this.airportFares = {};
      
      // Process the fares data
      data.fares.forEach((fare: any) => {
        if (fare.vehicleId) {
          this.airportFares[fare.vehicleId] = {
            timestamp: Date.now(),
            data: fare
          };
        }
      });
      
      if (this.debugMode) {
        console.log(`Synced ${Object.keys(this.airportFares).length} airport fares`);
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing airport fares:', error);
      return false;
    }
  }

  // Fetch outstation fare for a specific vehicle
  public async getOutstationFareForVehicle(vehicleId: string): Promise<FareDataFormat | null> {
    try {
      // Check if we have a valid cache entry
      if (
        this.outstationFares[vehicleId] &&
        Date.now() - this.outstationFares[vehicleId].timestamp < OUTSTATION_CACHE_DURATION
      ) {
        return this.outstationFares[vehicleId].data;
      }
      
      const response = await fetch(
        getApiUrl(`api/admin/direct-outstation-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
        { headers: getBypassHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.fares && data.fares[vehicleId]) {
        const fareData = data.fares[vehicleId];
        this.outstationFares[vehicleId] = {
          timestamp: Date.now(),
          data: fareData
        };
        this.saveToLocalStorage();
        return fareData;
      }
      
      throw new Error('Vehicle fare data not found');
    } catch (error) {
      console.error(`Error fetching outstation fare for ${vehicleId}:`, error);
      
      // Return existing cached data if available, even if expired
      if (this.outstationFares[vehicleId]) {
        return this.outstationFares[vehicleId].data;
      }
      
      return null;
    }
  }

  // Fetch local fare for a specific vehicle
  public async getLocalFareForVehicle(vehicleId: string): Promise<FareDataFormat | null> {
    try {
      // Check if we have a valid cache entry
      if (
        this.localFares[vehicleId] &&
        Date.now() - this.localFares[vehicleId].timestamp < LOCAL_CACHE_DURATION
      ) {
        return this.localFares[vehicleId].data;
      }
      
      const response = await fetch(
        getApiUrl(`api/direct-local-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
        { headers: getBypassHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
        const fareData = data.fares[0];
        this.localFares[vehicleId] = {
          timestamp: Date.now(),
          data: fareData
        };
        this.saveToLocalStorage();
        return fareData;
      }
      
      throw new Error('Vehicle local fare data not found');
    } catch (error) {
      console.error(`Error fetching local fare for ${vehicleId}:`, error);
      
      // Return existing cached data if available, even if expired
      if (this.localFares[vehicleId]) {
        return this.localFares[vehicleId].data;
      }
      
      return null;
    }
  }

  // Fetch airport fare for a specific vehicle
  public async getAirportFareForVehicle(vehicleId: string): Promise<FareDataFormat | null> {
    try {
      // Check if we have a valid cache entry
      if (
        this.airportFares[vehicleId] &&
        Date.now() - this.airportFares[vehicleId].timestamp < AIRPORT_CACHE_DURATION
      ) {
        return this.airportFares[vehicleId].data;
      }
      
      const response = await fetch(
        getApiUrl(`api/direct-airport-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
        { headers: getBypassHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
        const fareData = data.fares[0];
        this.airportFares[vehicleId] = {
          timestamp: Date.now(),
          data: fareData
        };
        this.saveToLocalStorage();
        return fareData;
      }
      
      throw new Error('Vehicle airport fare data not found');
    } catch (error) {
      console.error(`Error fetching airport fare for ${vehicleId}:`, error);
      
      // Return existing cached data if available, even if expired
      if (this.airportFares[vehicleId]) {
        return this.airportFares[vehicleId].data;
      }
      
      return null;
    }
  }

  // Calculate outstation fare
  public async calculateOutstationFare(params: OutstationFareParams): Promise<number> {
    const { vehicleId, distance, tripMode } = params;
    
    try {
      // Always try to get fresh data from the database first
      const fareData = await this.getOutstationFareForVehicle(vehicleId);
      
      if (!fareData) {
        console.error(`No outstation fare data available for ${vehicleId}`);
        return 0;
      }
      
      // Use correct pricing based on trip mode
      let basePrice = 0;
      let pricePerKm = 0;
      
      if (tripMode === 'one-way') {
        basePrice = parseFloat(fareData.basePrice || fareData.oneWayBasePrice || 0);
        pricePerKm = parseFloat(fareData.pricePerKm || fareData.oneWayPricePerKm || 0);
      } else {
        basePrice = parseFloat(fareData.roundTripBasePrice || fareData.basePrice * 0.95 || 0);
        pricePerKm = parseFloat(fareData.roundTripPricePerKm || fareData.pricePerKm * 0.85 || 0);
      }
      
      // Calculate the fare
      const fare = basePrice + (distance * pricePerKm);
      
      if (fare <= 0) {
        console.error(`Invalid outstation fare calculated for ${vehicleId}: ${fare}`);
        return 0;
      }
      
      if (this.debugMode) {
        console.log(`Calculated outstation fare for ${vehicleId} (${tripMode})`, {
          basePrice,
          pricePerKm,
          distance,
          fareTotal: fare
        });
      }
      
      // Dispatch event with calculated fare
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: vehicleId,
          fare: fare,
          tripType: 'outstation',
          timestamp: Date.now()
        }
      }));
      
      return fare;
    } catch (error) {
      console.error(`Error calculating outstation fare for ${vehicleId}:`, error);
      return 0;
    }
  }

  // Calculate local fare
  public async calculateLocalFare(params: LocalFareParams): Promise<number> {
    const { vehicleId, hourlyPackage } = params;
    
    try {
      // Always try to get fresh data from the database first
      const fareData = await this.getLocalFareForVehicle(vehicleId);
      
      if (!fareData) {
        console.error(`No local fare data available for ${vehicleId}`);
        return 0;
      }
      
      let fare = 0;
      
      // Extract the correct fare based on the package
      switch (hourlyPackage) {
        case '4hr40km':
          fare = parseFloat(fareData.price4hrs40km || fareData.price_4hrs_40km || fareData.package4hr40km || 0);
          break;
        case '8hr80km':
          fare = parseFloat(fareData.price8hrs80km || fareData.price_8hrs_80km || fareData.package8hr80km || 0);
          break;
        case '10hr100km':
          fare = parseFloat(fareData.price10hrs100km || fareData.price_10hrs_100km || fareData.package10hr100km || 0);
          break;
        default:
          console.error(`Unsupported hourly package: ${hourlyPackage}`);
          return 0;
      }
      
      if (fare <= 0) {
        console.error(`Invalid local fare for ${vehicleId} package ${hourlyPackage}: ${fare}`);
        return 0;
      }
      
      if (this.debugMode) {
        console.log(`Calculated local fare for ${vehicleId} (${hourlyPackage})`, {
          package: hourlyPackage,
          fareData,
          fareTotal: fare
        });
      }
      
      // Dispatch event with calculated fare
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: vehicleId,
          fare: fare,
          tripType: 'local',
          timestamp: Date.now()
        }
      }));
      
      return fare;
    } catch (error) {
      console.error(`Error calculating local fare for ${vehicleId}:`, error);
      return 0;
    }
  }

  // Calculate airport fare based on distance
  public async calculateAirportFare(params: AirportFareParams): Promise<number> {
    const { vehicleId, distance } = params;
    
    try {
      // Always try to get fresh data from the database first
      const fareData = await this.getAirportFareForVehicle(vehicleId);
      
      if (!fareData) {
        console.error(`No airport fare data available for ${vehicleId}`);
        return 0;
      }
      
      let fare = 0;
      
      // Determine tier based on distance
      if (distance <= 15) {
        fare = parseFloat(fareData.tier1Price || 0);
      } else if (distance <= 25) {
        fare = parseFloat(fareData.tier2Price || 0);
      } else if (distance <= 35) {
        fare = parseFloat(fareData.tier3Price || 0);
      } else {
        fare = parseFloat(fareData.tier4Price || 0);
        
        // Add extra charge for distances beyond tier 4
        const extraDistance = distance - 35;
        if (extraDistance > 0) {
          const extraCharge = extraDistance * parseFloat(fareData.extraKmCharge || 0);
          fare += extraCharge;
        }
      }
      
      if (fare <= 0) {
        console.error(`Invalid airport fare calculated for ${vehicleId}: ${fare}`);
        return 0;
      }
      
      if (this.debugMode) {
        console.log(`Calculated airport fare for ${vehicleId}`, {
          distance,
          fareData,
          fareTotal: fare
        });
      }
      
      // Dispatch event with calculated fare
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: vehicleId,
          fare: fare,
          tripType: 'airport',
          timestamp: Date.now()
        }
      }));
      
      return fare;
    } catch (error) {
      console.error(`Error calculating airport fare for ${vehicleId}:`, error);
      return 0;
    }
  }
}

// Create and export a singleton instance
const fareStateManager = new FareStateManager();
export default fareStateManager;
