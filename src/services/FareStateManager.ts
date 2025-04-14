
// This file manages fare state across the application
import { getBypassHeaders } from '@/config/api';

// Define interfaces for fare data types
interface LocalFare {
  vehicleId: string;
  vehicle_id?: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

interface AirportFare {
  vehicleId: string;
  vehicle_id?: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

interface OutstationFare {
  vehicleId: string;
  vehicle_id?: string;
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
}

class FareStateManager {
  private localFares: Map<string, LocalFare> = new Map();
  private airportFares: Map<string, AirportFare> = new Map();
  private outstationFares: Map<string, OutstationFare> = new Map();
  private lastSyncTimestamp: number = 0;
  private isSyncing: boolean = false;
  private syncPromise: Promise<boolean> | null = null;
  private SYNC_TIMEOUT = 60 * 1000; // 1 minute
  
  /**
   * Sync all fare data from the server
   */
  async syncFareData(): Promise<boolean> {
    // If a sync is already in progress, return that promise
    if (this.syncPromise) {
      return this.syncPromise;
    }
    
    // If data was synced recently, don't sync again
    const now = Date.now();
    if (now - this.lastSyncTimestamp < this.SYNC_TIMEOUT && this.localFares.size > 0) {
      console.log('Skipping fare sync - data was synced recently');
      return Promise.resolve(true);
    }
    
    console.log('FareStateManager: Starting sync of all fare data');
    this.isSyncing = true;
    
    // Create a promise for the sync operation
    this.syncPromise = new Promise(async (resolve) => {
      try {
        // Use Promise.all to fetch all fare types in parallel
        const [localSuccess, airportSuccess, outstationSuccess] = await Promise.all([
          this.syncLocalFares(),
          this.syncAirportFares(),
          this.syncOutstationFares()
        ]);
        
        // Update sync timestamp if at least one sync was successful
        if (localSuccess || airportSuccess || outstationSuccess) {
          this.lastSyncTimestamp = Date.now();
          console.log('FareStateManager: Fare data sync completed successfully');
          
          // Notify all components that fare data has been updated
          window.dispatchEvent(new CustomEvent('fare-data-updated', {
            detail: { timestamp: this.lastSyncTimestamp }
          }));
          
          resolve(true);
        } else {
          console.error('FareStateManager: All fare data syncs failed');
          resolve(false);
        }
      } catch (error) {
        console.error('FareStateManager: Error syncing fare data:', error);
        resolve(false);
      } finally {
        this.isSyncing = false;
        this.syncPromise = null;
      }
    });
    
    return this.syncPromise;
  }
  
  /**
   * Sync local fares from the server
   */
  private async syncLocalFares(): Promise<boolean> {
    try {
      console.log('FareStateManager: Syncing local fares');
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/direct-local-fares.php?sync=true&_t=${timestamp}`, {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to sync local fares');
      }
      
      // Clear existing local fares
      this.localFares.clear();
      
      // Process fares data - handle both array and object formats
      if (data.fares) {
        if (Array.isArray(data.fares)) {
          // Handle array of fares
          data.fares.forEach(fare => {
            if (fare.vehicleId || fare.vehicle_id) {
              const vehicleId = fare.vehicleId || fare.vehicle_id;
              const normalizedFare: LocalFare = this.normalizeLocalFare(fare);
              this.localFares.set(vehicleId, normalizedFare);
              console.log(`Local fare loaded for ${vehicleId}:`, normalizedFare);
            }
          });
        } else {
          // Handle object of fares
          Object.entries(data.fares).forEach(([key, fare]: [string, any]) => {
            if (fare) {
              const vehicleId = fare.vehicleId || fare.vehicle_id || key;
              const normalizedFare: LocalFare = this.normalizeLocalFare(fare);
              this.localFares.set(vehicleId, normalizedFare);
              console.log(`Local fare loaded for ${vehicleId}:`, normalizedFare);
            }
          });
        }
      }
      
      console.log(`FareStateManager: Synced ${this.localFares.size} local fares`);
      return true;
    } catch (error) {
      console.error('Error syncing local fares:', error);
      return false;
    }
  }
  
  /**
   * Sync airport fares from the server
   */
  private async syncAirportFares(): Promise<boolean> {
    try {
      console.log('FareStateManager: Syncing airport fares');
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/direct-airport-fares.php?sync=true&_t=${timestamp}`, {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to sync airport fares');
      }
      
      // Clear existing airport fares
      this.airportFares.clear();
      
      // Process fares data - handle both array and object formats
      if (data.fares) {
        if (Array.isArray(data.fares)) {
          // Handle array of fares
          data.fares.forEach(fare => {
            if (fare.vehicleId || fare.vehicle_id) {
              const vehicleId = fare.vehicleId || fare.vehicle_id;
              const normalizedFare: AirportFare = this.normalizeAirportFare(fare);
              this.airportFares.set(vehicleId, normalizedFare);
              console.log(`Airport fare loaded for ${vehicleId}:`, normalizedFare);
            }
          });
        } else {
          // Handle object of fares
          Object.entries(data.fares).forEach(([key, fare]: [string, any]) => {
            if (fare) {
              const vehicleId = fare.vehicleId || fare.vehicle_id || key;
              const normalizedFare: AirportFare = this.normalizeAirportFare(fare);
              this.airportFares.set(vehicleId, normalizedFare);
              console.log(`Airport fare loaded for ${vehicleId}:`, normalizedFare);
            }
          });
        }
      }
      
      console.log(`FareStateManager: Synced ${this.airportFares.size} airport fares`);
      return true;
    } catch (error) {
      console.error('Error syncing airport fares:', error);
      return false;
    }
  }
  
  /**
   * Sync outstation fares from the server
   */
  private async syncOutstationFares(): Promise<boolean> {
    try {
      console.log('FareStateManager: Syncing outstation fares');
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/direct-outstation-fares.php?sync=true&_t=${timestamp}`, {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to sync outstation fares');
      }
      
      // Clear existing outstation fares
      this.outstationFares.clear();
      
      // Process fares data - handle both array and object formats
      if (data.fares) {
        if (Array.isArray(data.fares)) {
          // Handle array of fares
          data.fares.forEach(fare => {
            if (fare.vehicleId || fare.vehicle_id) {
              const vehicleId = fare.vehicleId || fare.vehicle_id;
              const normalizedFare: OutstationFare = this.normalizeOutstationFare(fare);
              this.outstationFares.set(vehicleId, normalizedFare);
              console.log(`Outstation fare loaded for ${vehicleId}:`, normalizedFare);
            }
          });
        } else {
          // Handle object of fares
          Object.entries(data.fares).forEach(([key, fare]: [string, any]) => {
            if (fare) {
              const vehicleId = fare.vehicleId || fare.vehicle_id || key;
              const normalizedFare: OutstationFare = this.normalizeOutstationFare(fare);
              this.outstationFares.set(vehicleId, normalizedFare);
              console.log(`Outstation fare loaded for ${vehicleId}:`, normalizedFare);
            }
          });
        }
      }
      
      console.log(`FareStateManager: Synced ${this.outstationFares.size} outstation fares`);
      return true;
    } catch (error) {
      console.error('Error syncing outstation fares:', error);
      return false;
    }
  }
  
  /**
   * Clear all cached fare data
   */
  clearCache(): void {
    console.log('FareStateManager: Clearing cache');
    this.localFares.clear();
    this.airportFares.clear();
    this.outstationFares.clear();
    this.lastSyncTimestamp = 0;
    
    // Notify components that cache has been cleared
    window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
      detail: { timestamp: Date.now() }
    }));
  }
  
  /**
   * Get local fare for a specific vehicle
   */
  async getLocalFareForVehicle(vehicleId: string): Promise<LocalFare | null> {
    if (!vehicleId) {
      console.error('Vehicle ID is required to get local fare');
      return null;
    }
    
    // Try to get from cache first
    const cachedFare = this.localFares.get(vehicleId);
    if (cachedFare) {
      return cachedFare;
    }
    
    // If not in cache, try to fetch directly
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${timestamp}`, {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        console.warn(`No fare data found for vehicle ${vehicleId}`);
        return null;
      }
      
      let fare = null;
      
      if (data.fares) {
        if (Array.isArray(data.fares) && data.fares.length > 0) {
          // Find matching fare
          const matchingFare = data.fares.find((f: any) => 
            (f.vehicleId === vehicleId || f.vehicle_id === vehicleId)
          );
          fare = matchingFare || data.fares[0];
        } else if (typeof data.fares === 'object') {
          fare = data.fares[vehicleId] || null;
        }
      }
      
      if (fare) {
        const normalizedFare = this.normalizeLocalFare(fare);
        // Update cache
        this.localFares.set(vehicleId, normalizedFare);
        return normalizedFare;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching local fare for vehicle ${vehicleId}:`, error);
      return null;
    }
  }
  
  /**
   * Get airport fare for a specific vehicle
   */
  async getAirportFareForVehicle(vehicleId: string): Promise<AirportFare | null> {
    if (!vehicleId) {
      console.error('Vehicle ID is required to get airport fare');
      return null;
    }
    
    // Try to get from cache first
    const cachedFare = this.airportFares.get(vehicleId);
    if (cachedFare) {
      return cachedFare;
    }
    
    // If not in cache, try to fetch directly
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/direct-airport-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${timestamp}`, {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        console.warn(`No fare data found for vehicle ${vehicleId}`);
        return null;
      }
      
      let fare = null;
      
      if (data.fares) {
        if (Array.isArray(data.fares) && data.fares.length > 0) {
          // Find matching fare
          const matchingFare = data.fares.find((f: any) => 
            (f.vehicleId === vehicleId || f.vehicle_id === vehicleId)
          );
          fare = matchingFare || data.fares[0];
        } else if (typeof data.fares === 'object') {
          fare = data.fares[vehicleId] || null;
        }
      }
      
      if (fare) {
        const normalizedFare = this.normalizeAirportFare(fare);
        // Update cache
        this.airportFares.set(vehicleId, normalizedFare);
        return normalizedFare;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching airport fare for vehicle ${vehicleId}:`, error);
      return null;
    }
  }
  
  /**
   * Get outstation fare for a specific vehicle
   */
  async getOutstationFareForVehicle(vehicleId: string): Promise<OutstationFare | null> {
    if (!vehicleId) {
      console.error('Vehicle ID is required to get outstation fare');
      return null;
    }
    
    // Try to get from cache first
    const cachedFare = this.outstationFares.get(vehicleId);
    if (cachedFare) {
      return cachedFare;
    }
    
    // If not in cache, try to fetch directly
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/direct-outstation-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${timestamp}`, {
        headers: getBypassHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        console.warn(`No fare data found for vehicle ${vehicleId}`);
        return null;
      }
      
      let fare = null;
      
      if (data.fares) {
        if (Array.isArray(data.fares) && data.fares.length > 0) {
          // Find matching fare
          const matchingFare = data.fares.find((f: any) => 
            (f.vehicleId === vehicleId || f.vehicle_id === vehicleId)
          );
          fare = matchingFare || data.fares[0];
        } else if (typeof data.fares === 'object') {
          fare = data.fares[vehicleId] || null;
        }
      }
      
      if (fare) {
        const normalizedFare = this.normalizeOutstationFare(fare);
        // Update cache
        this.outstationFares.set(vehicleId, normalizedFare);
        return normalizedFare;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching outstation fare for vehicle ${vehicleId}:`, error);
      return null;
    }
  }
  
  /**
   * Store local fare data for a vehicle
   */
  async storeLocalFare(vehicleId: string, fareData: any): Promise<boolean> {
    if (!vehicleId || !fareData) {
      console.error('Vehicle ID and fare data are required');
      return false;
    }
    
    const normalizedFare = this.normalizeLocalFare(fareData);
    this.localFares.set(vehicleId, normalizedFare);
    console.log(`Local fare stored for ${vehicleId}:`, normalizedFare);
    return true;
  }
  
  /**
   * Store airport fare data for a vehicle
   */
  async storeAirportFare(vehicleId: string, fareData: any): Promise<boolean> {
    if (!vehicleId || !fareData) {
      console.error('Vehicle ID and fare data are required');
      return false;
    }
    
    const normalizedFare = this.normalizeAirportFare(fareData);
    this.airportFares.set(vehicleId, normalizedFare);
    console.log(`Airport fare stored for ${vehicleId}:`, normalizedFare);
    return true;
  }
  
  /**
   * Store outstation fare data for a vehicle
   */
  async storeOutstationFare(vehicleId: string, fareData: any): Promise<boolean> {
    if (!vehicleId || !fareData) {
      console.error('Vehicle ID and fare data are required');
      return false;
    }
    
    const normalizedFare = this.normalizeOutstationFare(fareData);
    this.outstationFares.set(vehicleId, normalizedFare);
    console.log(`Outstation fare stored for ${vehicleId}:`, normalizedFare);
    return true;
  }
  
  /**
   * Update internal cache with fare data
   */
  updateInternalCache(fareType: 'local' | 'airport' | 'outstation', vehicleId: string, fareData: any): void {
    if (!vehicleId || !fareData) {
      console.error('Vehicle ID and fare data are required');
      return;
    }
    
    switch (fareType) {
      case 'local':
        this.localFares.set(vehicleId, this.normalizeLocalFare(fareData));
        break;
      case 'airport':
        this.airportFares.set(vehicleId, this.normalizeAirportFare(fareData));
        break;
      case 'outstation':
        this.outstationFares.set(vehicleId, this.normalizeOutstationFare(fareData));
        break;
    }
    
    console.log(`${fareType} fare updated in cache for ${vehicleId}`);
  }
  
  /**
   * Calculate local fare
   */
  async calculateLocalFare(params: { vehicleId: string, hourlyPackage: string }): Promise<number> {
    const { vehicleId, hourlyPackage } = params;
    console.log(`FareStateManager: Calculating local fare for ${vehicleId}, package: ${hourlyPackage}`);
    
    if (!vehicleId || !hourlyPackage) {
      console.error('Vehicle ID and hourly package are required for local fare calculation');
      return 0;
    }
    
    const fareData = await this.getLocalFareForVehicle(vehicleId);
    
    if (!fareData) {
      console.error(`Local fare data not found for vehicle ${vehicleId}`);
      return 0;
    }
    
    console.log(`Found local fare data for ${vehicleId}:`, fareData);
    
    // Normalize the package name
    const normalizedPackage = hourlyPackage.toLowerCase().replace(/\s+/g, '');
    
    // Extract package price based on package type
    if (normalizedPackage.includes('4hr') || normalizedPackage.includes('4hrs')) {
      return fareData.price4hrs40km;
    } else if (normalizedPackage.includes('8hr') || normalizedPackage.includes('8hrs')) {
      return fareData.price8hrs80km;
    } else if (normalizedPackage.includes('10hr') || normalizedPackage.includes('10hrs')) {
      return fareData.price10hrs100km;
    }
    
    console.warn(`Unknown package type: ${hourlyPackage}`);
    return 0;
  }
  
  /**
   * Calculate outstation fare
   */
  async calculateOutstationFare(params: { vehicleId: string, distance: number, tripMode: 'one-way' | 'round-trip', pickupDate?: Date }): Promise<number> {
    const { vehicleId, distance, tripMode } = params;
    console.log(`FareStateManager: Calculating outstation fare for ${vehicleId}, distance: ${distance}, mode: ${tripMode}`);
    
    if (!vehicleId || typeof distance !== 'number' || distance <= 0) {
      console.error('Valid vehicle ID and distance are required for outstation fare calculation');
      return 0;
    }
    
    const fareData = await this.getOutstationFareForVehicle(vehicleId);
    
    if (!fareData) {
      console.error(`Outstation fare data not found for vehicle ${vehicleId}`);
      return 0;
    }
    
    console.log(`Found outstation fare data for ${vehicleId}:`, fareData);
    
    // Calculate based on trip mode
    if (tripMode === 'round-trip') {
      return fareData.roundTripBasePrice + (distance * fareData.roundTripPricePerKm);
    } else {
      return fareData.basePrice + (distance * fareData.pricePerKm);
    }
  }
  
  /**
   * Calculate airport fare
   */
  async calculateAirportFare(params: { vehicleId: string, distance: number }): Promise<number> {
    const { vehicleId, distance } = params;
    console.log(`FareStateManager: Calculating airport fare for ${vehicleId}, distance: ${distance}`);
    
    if (!vehicleId || typeof distance !== 'number' || distance <= 0) {
      console.error('Valid vehicle ID and distance are required for airport fare calculation');
      return 0;
    }
    
    const fareData = await this.getAirportFareForVehicle(vehicleId);
    
    if (!fareData) {
      console.error(`Airport fare data not found for vehicle ${vehicleId}`);
      return 0;
    }
    
    console.log(`Found airport fare data for ${vehicleId}:`, fareData);
    
    let fare = fareData.basePrice;
    
    if (distance <= 10) {
      fare += fareData.tier1Price;
    } else if (distance <= 20) {
      fare += fareData.tier2Price;
    } else if (distance <= 30) {
      fare += fareData.tier3Price;
    } else {
      fare += fareData.tier4Price;
      const extraKm = distance - 30;
      if (extraKm > 0) {
        fare += extraKm * fareData.extraKmCharge;
      }
    }
    
    return fare + (distance * fareData.pricePerKm);
  }
  
  /**
   * Normalize local fare data
   */
  private normalizeLocalFare(data: any): LocalFare {
    // Convert values to numbers and handle different property formats
    return {
      vehicleId: data.vehicleId || data.vehicle_id || '',
      vehicle_id: data.vehicleId || data.vehicle_id || '',
      price4hrs40km: this.toNumber(data.price4hrs40km || data.price_4hrs_40km),
      price8hrs80km: this.toNumber(data.price8hrs80km || data.price_8hrs_80km),
      price10hrs100km: this.toNumber(data.price10hrs100km || data.price_10hrs_100km),
      priceExtraKm: this.toNumber(data.priceExtraKm || data.price_extra_km),
      priceExtraHour: this.toNumber(data.priceExtraHour || data.price_extra_hour)
    };
  }
  
  /**
   * Normalize airport fare data
   */
  private normalizeAirportFare(data: any): AirportFare {
    // Convert values to numbers and handle different property formats
    return {
      vehicleId: data.vehicleId || data.vehicle_id || '',
      vehicle_id: data.vehicleId || data.vehicle_id || '',
      basePrice: this.toNumber(data.basePrice || data.base_price),
      pricePerKm: this.toNumber(data.pricePerKm || data.price_per_km),
      pickupPrice: this.toNumber(data.pickupPrice || data.pickup_price),
      dropPrice: this.toNumber(data.dropPrice || data.drop_price),
      tier1Price: this.toNumber(data.tier1Price || data.tier1_price),
      tier2Price: this.toNumber(data.tier2Price || data.tier2_price),
      tier3Price: this.toNumber(data.tier3Price || data.tier3_price),
      tier4Price: this.toNumber(data.tier4Price || data.tier4_price),
      extraKmCharge: this.toNumber(data.extraKmCharge || data.extra_km_charge)
    };
  }
  
  /**
   * Normalize outstation fare data
   */
  private normalizeOutstationFare(data: any): OutstationFare {
    // Convert values to numbers and handle different property formats
    return {
      vehicleId: data.vehicleId || data.vehicle_id || '',
      vehicle_id: data.vehicleId || data.vehicle_id || '',
      basePrice: this.toNumber(data.basePrice || data.base_price),
      pricePerKm: this.toNumber(data.pricePerKm || data.price_per_km),
      nightHaltCharge: this.toNumber(data.nightHaltCharge || data.night_halt_charge),
      driverAllowance: this.toNumber(data.driverAllowance || data.driver_allowance),
      roundTripBasePrice: this.toNumber(data.roundTripBasePrice || data.roundtrip_base_price),
      roundTripPricePerKm: this.toNumber(data.roundTripPricePerKm || data.roundtrip_price_per_km)
    };
  }
  
  /**
   * Convert a value to a number
   */
  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }
}

// Create and export a singleton instance
const fareStateManager = new FareStateManager();
export default fareStateManager;
