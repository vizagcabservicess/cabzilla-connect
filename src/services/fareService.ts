import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Constants for API endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
const OUTSTATION_FARES_ENDPOINT = '/api/admin/outstation-fares-update';
const LOCAL_FARES_ENDPOINT = '/api/admin/local-fares-update';
const AIRPORT_FARES_ENDPOINT = '/api/admin/airport-fares-update';
const VEHICLE_PRICING_ENDPOINT = '/api/admin/direct-vehicle-pricing';

class FareService {
  private lastRequestTime: Record<string, number> = {};
  private requestThrottleMs = 2000; // Minimum time between identical requests

  constructor() {
    console.log('FareService initialized with base URL:', API_BASE_URL);
  }

  // Get headers that bypass caching
  getBypassHeaders() {
    const timestamp = Date.now();
    return {
      'X-Force-Refresh': 'true',
      'X-Custom-Timestamp': timestamp.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  // Get config for forced requests that bypass caching
  getForcedRequestConfig(): AxiosRequestConfig {
    return {
      headers: this.getBypassHeaders()
    };
  }

  // Clear all caches
  clearCache() {
    console.log('Clearing all fare caches');
    localStorage.removeItem('outstationFares');
    localStorage.removeItem('localFares');
    localStorage.removeItem('airportFares');
    localStorage.removeItem('vehiclePricing');
    localStorage.removeItem('fareCache');
    localStorage.removeItem('cabData');
    localStorage.removeItem('vehicles');
    
    // Set a flag to force refresh on next request
    localStorage.setItem('forceCacheRefresh', 'true');
    
    // Dispatch an event that the fare cache was cleared
    window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
      detail: { timestamp: Date.now() }
    }));
  }

  // Handle API errors
  handleApiError(error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('API Error:', axiosError.message, axiosError.response?.data);
      
      // Show toast notification for the error
      toast.error(`API Error: ${axiosError.message}`);
      
      // If it's a 500 error, suggest database initialization
      if (axiosError.response?.status === 500) {
        toast.error('Server error. Database tables may be missing.', {
          description: 'Try initializing the database from the admin panel.',
          duration: 5000
        });
      }
    } else {
      console.error('Unknown error:', error);
      toast.error('An unknown error occurred');
    }
  }

  // Initialize database tables
  async initializeDatabase(force: boolean = false): Promise<any> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const url = `${baseUrl}/api/admin/init-database`;
    
    // Create parameters with timestamp to bypass cache
    const params = new URLSearchParams();
    params.append('_t', Date.now().toString());
    if (force) {
      params.append('force', 'true');
    }
    params.append('verbose', 'true');
    
    console.log(`Initializing database at ${url}?${params.toString()}`);
    
    try {
      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: {
          ...this.getBypassHeaders(),
          'Accept': 'application/json'
        }
      });
      
      console.log('Database initialization response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error initializing database:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  // Throttle requests to prevent overloading the server
  private shouldThrottleRequest(endpoint: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestTime[endpoint] || 0;
    
    if (now - lastRequest < this.requestThrottleMs) {
      console.log(`Throttling request to ${endpoint} - too soon after last request`);
      return true;
    }
    
    this.lastRequestTime[endpoint] = now;
    return false;
  }

  // Update outstation fares
  async updateOutstationFares(fares: any): Promise<any> {
    if (this.shouldThrottleRequest(OUTSTATION_FARES_ENDPOINT)) {
      return Promise.reject(new Error('Request throttled. Please try again in a moment.'));
    }
    
    try {
      console.log('Updating outstation fares:', fares);
      const response = await axios.post(`${API_BASE_URL}${OUTSTATION_FARES_ENDPOINT}`, fares, this.getForcedRequestConfig());
      
      // Clear cache after successful update
      this.clearCache();
      
      // Dispatch an event that trip fares were updated
      window.dispatchEvent(new CustomEvent('trip-fares-updated', {
        detail: { timestamp: Date.now(), tripType: 'outstation' }
      }));
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  // Update local package fares
  async updateLocalFares(fares: any): Promise<any> {
    if (this.shouldThrottleRequest(LOCAL_FARES_ENDPOINT)) {
      return Promise.reject(new Error('Request throttled. Please try again in a moment.'));
    }
    
    try {
      console.log('Updating local package fares:', fares);
      const response = await axios.post(`${API_BASE_URL}${LOCAL_FARES_ENDPOINT}`, fares, this.getForcedRequestConfig());
      
      // Clear cache after successful update
      this.clearCache();
      
      // Dispatch an event that local fares were updated
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  // Update airport transfer fares
  async updateAirportFares(fares: any): Promise<any> {
    if (this.shouldThrottleRequest(AIRPORT_FARES_ENDPOINT)) {
      return Promise.reject(new Error('Request throttled. Please try again in a moment.'));
    }
    
    try {
      console.log('Updating airport transfer fares:', fares);
      const response = await axios.post(`${API_BASE_URL}${AIRPORT_FARES_ENDPOINT}`, fares, this.getForcedRequestConfig());
      
      // Clear cache after successful update
      this.clearCache();
      
      // Dispatch an event that airport fares were updated
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  // Update vehicle pricing
  async updateVehiclePricing(pricing: any): Promise<any> {
    if (this.shouldThrottleRequest(VEHICLE_PRICING_ENDPOINT)) {
      return Promise.reject(new Error('Request throttled. Please try again in a moment.'));
    }
    
    try {
      console.log('Updating vehicle pricing:', pricing);
      const response = await axios.post(`${API_BASE_URL}${VEHICLE_PRICING_ENDPOINT}`, pricing, this.getForcedRequestConfig());
      
      // Clear cache after successful update
      this.clearCache();
      
      // Dispatch an event that vehicle pricing was updated
      window.dispatchEvent(new CustomEvent('vehicle-pricing-updated', {
        detail: { timestamp: Date.now() }
      }));
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  // =============== ADD MISSING METHODS BELOW ===============

  // Method to get outstation fares for a specific vehicle
  async getOutstationFaresForVehicle(vehicleId: string): Promise<any> {
    try {
      console.log(`Fetching outstation fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/outstation-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
      console.log('Outstation fares response:', response.data);
      
      // Return empty object with default values if no data received
      if (!response.data || typeof response.data !== 'object') {
        console.warn(`No outstation fare data received for vehicle: ${vehicleId}`);
        return {
          basePrice: 0,
          pricePerKm: 0,
          driverAllowance: 0,
          nightHalt: 0,
          roundTripBasePrice: 0,
          roundTripPricePerKm: 0
        };
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching outstation fares for vehicle ${vehicleId}:`, error);
      // Return default values on error
      return {
        basePrice: 0,
        pricePerKm: 0,
        driverAllowance: 0,
        nightHalt: 0,
        roundTripBasePrice: 0,
        roundTripPricePerKm: 0
      };
    }
  }

  // Method to get local package fares for a specific vehicle
  async getLocalFaresForVehicle(vehicleId: string): Promise<any> {
    try {
      console.log(`Fetching local package fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/local-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
      console.log('Local package fares response:', response.data);
      
      // Return empty object with default values if no data received
      if (!response.data || typeof response.data !== 'object') {
        console.warn(`No local fare data received for vehicle: ${vehicleId}`);
        return {
          package4hr40km: 0,
          package8hr80km: 0,
          package10hr100km: 0,
          extraKmRate: 0,
          extraHourRate: 0
        };
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching local fares for vehicle ${vehicleId}:`, error);
      // Return default values on error
      return {
        package4hr40km: 0,
        package8hr80km: 0,
        package10hr100km: 0,
        extraKmRate: 0,
        extraHourRate: 0
      };
    }
  }

  // Method to get airport transfer fares for a specific vehicle
  async getAirportFaresForVehicle(vehicleId: string): Promise<any> {
    try {
      console.log(`Fetching airport transfer fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/airport-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      // Try direct endpoint first
      try {
        const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
        console.log('Airport transfer fares response:', response.data);
        
        if (response.data && typeof response.data === 'object') {
          return response.data;
        }
      } catch (directError) {
        console.warn(`Direct endpoint failed for airport fares: ${directError.message}`, directError);
        // Continue to fallback - don't throw yet
      }
      
      // Fallback: Try to get data from vehicle_pricing table
      try {
        const pricingUrl = `${API_BASE_URL}/api/admin/vehicle-pricing`;
        const pricingParams = new URLSearchParams();
        pricingParams.append('vehicle_id', vehicleId);
        pricingParams.append('_t', Date.now().toString());
        
        const pricingResponse = await axios.get(`${pricingUrl}?${pricingParams.toString()}`, this.getForcedRequestConfig());
        console.log('Vehicle pricing response for airport:', pricingResponse.data);
        
        if (pricingResponse.data && typeof pricingResponse.data === 'object') {
          // Extract airport-specific data from vehicle pricing
          return {
            basePrice: pricingResponse.data.airport_base_price || 0,
            pricePerKm: pricingResponse.data.airport_price_per_km || 0,
            dropPrice: pricingResponse.data.airport_drop_price || 0,
            pickupPrice: pricingResponse.data.airport_pickup_price || 0,
            tier1Price: pricingResponse.data.airport_tier1_price || 0,
            tier2Price: pricingResponse.data.airport_tier2_price || 0,
            tier3Price: pricingResponse.data.airport_tier3_price || 0,
            tier4Price: pricingResponse.data.airport_tier4_price || 0,
            extraKmCharge: pricingResponse.data.airport_extra_km_charge || 0
          };
        }
      } catch (pricingError) {
        console.warn(`Vehicle pricing fallback failed for airport fares: ${pricingError.message}`);
        // Continue to default values - don't throw yet
      }
      
      // If we get here, we need to use default values based on vehicle type
      console.log(`No airport fare data received for vehicle: ${vehicleId}, using defaults`);
      return this.getDefaultAirportFares(vehicleId);
    } catch (error) {
      console.error(`Error fetching airport fares for vehicle ${vehicleId}:`, error);
      // Return default values on error
      return this.getDefaultAirportFares(vehicleId);
    }
  }
  
  // Helper method to generate default airport fares based on vehicle type
  private getDefaultAirportFares(vehicleId: string): any {
    const cabNameLower = vehicleId.toLowerCase();
    
    // Base default values
    let defaults = {
      basePrice: 1000,
      pricePerKm: 14,
      dropPrice: 1200,
      pickupPrice: 1500,
      tier1Price: 800,
      tier2Price: 1200,
      tier3Price: 1800,
      tier4Price: 2500,
      extraKmCharge: 14
    };
    
    // Adjust based on vehicle type
    if (cabNameLower.includes('sedan') || cabNameLower.includes('swift') || 
        cabNameLower.includes('dzire') || cabNameLower.includes('etios') || 
        cabNameLower.includes('luxury')) {
      defaults = {
        basePrice: 1200,
        pricePerKm: 14,
        dropPrice: 1200,
        pickupPrice: 1500,
        tier1Price: 800,
        tier2Price: 1200,
        tier3Price: 1800,
        tier4Price: 2500,
        extraKmCharge: 14
      };
    } else if (cabNameLower.includes('ertiga') || cabNameLower.includes('suv')) {
      defaults = {
        basePrice: 1500,
        pricePerKm: 16,
        dropPrice: 1500,
        pickupPrice: 1800,
        tier1Price: 1000,
        tier2Price: 1500,
        tier3Price: 2000,
        tier4Price: 2800,
        extraKmCharge: 16
      };
    } else if (cabNameLower.includes('innova')) {
      defaults = {
        basePrice: 1800,
        pricePerKm: 18,
        dropPrice: 1800,
        pickupPrice: 2100,
        tier1Price: 1200,
        tier2Price: 1800,
        tier3Price: 2400,
        tier4Price: 3200,
        extraKmCharge: 18
      };
    } else if (cabNameLower.includes('tempo') || cabNameLower.includes('traveller')) {
      defaults = {
        basePrice: 2500,
        pricePerKm: 22,
        dropPrice: 2500,
        pickupPrice: 3000,
        tier1Price: 1800,
        tier2Price: 2500,
        tier3Price: 3200,
        tier4Price: 4000,
        extraKmCharge: 22
      };
    }
    
    console.log(`Generated default airport fares for ${cabNameLower}:`, defaults);
    return defaults;
  }

  // General method to update fares directly for any trip type
  async directFareUpdate(tripType: string, vehicleId: string, data: any): Promise<any> {
    try {
      console.log(`Direct fare update for ${tripType} vehicle ${vehicleId}:`, data);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      
      // Create a FormData object to send
      const formData = new FormData();
      
      // Add vehicle ID with multiple keys to ensure compatibility
      formData.append('vehicleId', vehicleId);
      formData.append('vehicle_id', vehicleId);
      formData.append('cab_id', vehicleId);
      
      // Add trip type with multiple keys
      formData.append('tripType', tripType);
      formData.append('trip_type', tripType);
      
      // Add all data fields from the data object
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      // Send the request
      const response = await fetch(`${baseUrl}/api/admin/direct-fare-update.php`, {
        method: 'POST',
        body: formData,
        headers: {
          ...this.getBypassHeaders()
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`Direct fare update result for ${tripType}:`, result);
      
      // Clear cache after update
      this.clearCache();
      
      // Dispatch an event that fares were updated
      window.dispatchEvent(new CustomEvent(`${tripType}-fares-updated`, {
        detail: { 
          timestamp: Date.now(),
          vehicleId: vehicleId
        }
      }));
      
      return result;
    } catch (error) {
      console.error(`Error in direct fare update for ${tripType}:`, error);
      this.handleApiError(error);
      throw error;
    }
  }
}

export const fareService = new FareService();
