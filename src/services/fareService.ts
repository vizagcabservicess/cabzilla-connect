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
}

export const fareService = new FareService();
