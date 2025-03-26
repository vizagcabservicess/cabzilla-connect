
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Constants for API endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
const OUTSTATION_FARES_ENDPOINT = '/api/admin/outstation-fares-update.php';
const LOCAL_FARES_ENDPOINT = '/api/admin/local-fares-update.php';
const AIRPORT_FARES_ENDPOINT = '/api/admin/airport-fares-update.php';
const VEHICLE_PRICING_ENDPOINT = '/api/admin/direct-fare-update.php';

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
    const url = `${baseUrl}/api/admin/init-database.php`;
    
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
      
      // Create FormData for more reliable transport
      const formData = new FormData();
      for (const key in fares) {
        formData.append(key, fares[key].toString());
      }
      
      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      const response = await axios.post(`${API_BASE_URL}${OUTSTATION_FARES_ENDPOINT}`, formData, {
        headers: {
          ...this.getBypassHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
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
      
      // Create FormData for more reliable transport
      const formData = new FormData();
      for (const key in fares) {
        formData.append(key, fares[key].toString());
      }
      
      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      const response = await axios.post(`${API_BASE_URL}${LOCAL_FARES_ENDPOINT}`, formData, {
        headers: {
          ...this.getBypassHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
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
      
      // Create FormData for more reliable transport
      const formData = new FormData();
      for (const key in fares) {
        formData.append(key, fares[key].toString());
      }
      
      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      const response = await axios.post(`${API_BASE_URL}${AIRPORT_FARES_ENDPOINT}`, formData, {
        headers: {
          ...this.getBypassHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
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
      
      // Create FormData for more reliable transport
      const formData = new FormData();
      for (const key in pricing) {
        formData.append(key, pricing[key].toString());
      }
      
      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      const response = await axios.post(`${API_BASE_URL}${VEHICLE_PRICING_ENDPOINT}`, formData, {
        headers: {
          ...this.getBypassHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
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

  // Direct fare update for any trip type
  async directFareUpdate(tripType: string, vehicleId: string, data: any): Promise<any> {
    try {
      console.log(`Direct fare update for ${tripType}, vehicle ${vehicleId}:`, data);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('tripType', tripType);
      formData.append('vehicleId', vehicleId);
      
      // Add all data fields to formData
      for (const key in data) {
        if (data[key] !== undefined) {
          formData.append(key, data[key].toString());
        }
      }
      
      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      const response = await axios.post(`${API_BASE_URL}${VEHICLE_PRICING_ENDPOINT}`, formData, {
        headers: {
          ...this.getBypassHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Direct fare update response:', response.data);
      
      if (response.data && response.data.status === 'success') {
        // Clear cache and dispatch appropriate event
        this.clearCache();
        
        const eventName = tripType === 'local' ? 'local-fares-updated' :
                         tripType === 'outstation' ? 'trip-fares-updated' :
                         tripType === 'airport' ? 'airport-fares-updated' : 'fare-cache-cleared';
        
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { timestamp: Date.now(), vehicleId }
        }));
        
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Unknown error in fare update');
      }
    } catch (error) {
      console.error('Error in directFareUpdate:', error);
      
      // Try alternative endpoint based on trip type
      try {
        let endpoint = '';
        
        if (tripType === 'outstation') {
          endpoint = '/api/admin/direct-outstation-fares.php';
        } else if (tripType === 'local') {
          endpoint = '/api/admin/local-fares-update.php';
        } else if (tripType === 'airport') {
          endpoint = '/api/admin/airport-fares-update.php';
        } else {
          throw new Error(`No fallback endpoint for trip type: ${tripType}`);
        }
        
        const formData = new FormData();
        formData.append('vehicleId', vehicleId);
        
        for (const key in data) {
          if (data[key] !== undefined) {
            formData.append(key, data[key].toString());
          }
        }
        
        formData.append('_t', Date.now().toString());
        
        console.log(`Trying fallback endpoint for ${tripType}:`, `${API_BASE_URL}${endpoint}`);
        
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
          headers: {
            ...this.getBypassHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('Fallback endpoint response:', response.data);
        
        if (response.data) {
          this.clearCache();
          return response.data;
        }
      } catch (fallbackError) {
        console.error('Fallback endpoint also failed:', fallbackError);
      }
      
      this.handleApiError(error);
      throw error;
    }
  }

  // Get outstation fares for a specific vehicle
  async getOutstationFaresForVehicle(vehicleId: string): Promise<any> {
    try {
      console.log(`Fetching outstation fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/outstation-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
      console.log('Outstation fares response:', response.data);
      
      if (response.data && typeof response.data === 'object') {
        return response.data;
      }
      
      // Return default values if no valid data
      return {
        basePrice: 4200,
        pricePerKm: 14,
        driverAllowance: 250,
        nightHalt: 700,
        roundTripBasePrice: 5000,
        roundTripPricePerKm: 12
      };
    } catch (error) {
      console.error('Error fetching outstation fares:', error);
      // Return default values
      return {
        basePrice: 4200,
        pricePerKm: 14,
        driverAllowance: 250,
        nightHalt: 700,
        roundTripBasePrice: 5000,
        roundTripPricePerKm: 12
      };
    }
  }

  // Get local fares for a specific vehicle
  async getLocalFaresForVehicle(vehicleId: string): Promise<any> {
    try {
      console.log(`Fetching local package fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/local-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
      console.log('Local fares response:', response.data);
      
      if (response.data && typeof response.data === 'object') {
        return response.data;
      }
      
      // Return default values if no valid data
      return {
        package4hr40km: 1000,
        package8hr80km: 1800,
        package10hr100km: 2200,
        extraKmRate: 14,
        extraHourRate: 150
      };
    } catch (error) {
      console.error('Error fetching local fares:', error);
      // Return default values
      return {
        package4hr40km: 1000,
        package8hr80km: 1800,
        package10hr100km: 2200,
        extraKmRate: 14,
        extraHourRate: 150
      };
    }
  }

  // Get airport fares for a specific vehicle
  async getAirportFaresForVehicle(vehicleId: string): Promise<any> {
    try {
      console.log(`Fetching airport fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/airport-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
      console.log('Airport fares response:', response.data);
      
      if (response.data && typeof response.data === 'object') {
        return response.data;
      }
      
      // Return default values if no valid data
      return {
        basePrice: 1000,
        pricePerKm: 14,
        dropPrice: 1200,
        pickupPrice: 1500,
        airportFee: 150,
        tier1Price: 800,
        tier2Price: 1200,
        tier3Price: 1800,
        tier4Price: 2500,
        extraKmRate: 14
      };
    } catch (error) {
      console.error('Error fetching airport fares:', error);
      // Return default values
      return {
        basePrice: 1000,
        pricePerKm: 14,
        dropPrice: 1200,
        pickupPrice: 1500,
        airportFee: 150,
        tier1Price: 800,
        tier2Price: 1200,
        tier3Price: 1800,
        tier4Price: 2500,
        extraKmRate: 14
      };
    }
  }
}

// Export a singleton instance
export const fareService = new FareService();
