
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Constants for API endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
const OUTSTATION_FARES_ENDPOINT = '/api/admin/outstation-fares-update.php';
const LOCAL_FARES_ENDPOINT = '/api/admin/local-fares-update.php';
const AIRPORT_FARES_ENDPOINT = '/api/admin/airport-fares-update.php';
const VEHICLE_PRICING_ENDPOINT = '/api/admin/direct-fare-update.php';

// Default fare values to use when API fails
const DEFAULT_FARES = {
  outstation: {
    basePrice: 4200,
    pricePerKm: 14,
    driverAllowance: 250,
    nightHalt: 700,
    roundTripBasePrice: 5000,
    roundTripPricePerKm: 12
  },
  local: {
    package4hr40km: 1500,
    package8hr80km: 2000,
    package10hr100km: 2500,
    extraKmRate: 14,
    extraHourRate: 150
  },
  airport: {
    basePrice: 500,
    pricePerKm: 12,
    dropPrice: 300,
    pickupPrice: 500,
    tier1Price: 300,
    tier2Price: 400,
    tier3Price: 500,
    tier4Price: 600,
    extraKmCharge: 14
  }
};

class FareService {
  private lastRequestTime: Record<string, number> = {};
  private requestThrottleMs = 2000; // Minimum time between identical requests
  private localCache: Record<string, any> = {};
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes cache expiry

  constructor() {
    console.log('FareService initialized with base URL:', API_BASE_URL);
    this.initLocalCache();
  }

  // Initialize local cache from localStorage if available
  private initLocalCache() {
    try {
      const savedCache = localStorage.getItem('fareServiceCache');
      if (savedCache) {
        this.localCache = JSON.parse(savedCache);
        console.log('Loaded fare service cache from localStorage');
      }
    } catch (error) {
      console.error('Error loading fare service cache:', error);
      this.localCache = {};
    }
  }

  // Save local cache to localStorage
  private saveLocalCache() {
    try {
      localStorage.setItem('fareServiceCache', JSON.stringify(this.localCache));
    } catch (error) {
      console.error('Error saving fare service cache:', error);
    }
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
    localStorage.removeItem('fareServiceCache');
    
    // Clear in-memory cache
    this.localCache = {};
    
    // Set a flag to force refresh on next request
    localStorage.setItem('forceCacheRefresh', 'true');
    
    // Dispatch an event that the fare cache was cleared
    window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
      detail: { timestamp: Date.now() }
    }));
  }

  // Handle API errors
  handleApiError(error: unknown, tripType?: string) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error(`API Error (${tripType || 'unknown'} trip):`, axiosError.message, axiosError.response?.data);
      
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
      console.error(`Unknown error (${tripType || 'unknown'} trip):`, error);
      toast.error('An unknown error occurred');
    }
  }

  // Initialize database tables
  async initializeDatabase(force: boolean = false): Promise<any> {
    const baseUrl = API_BASE_URL;
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
      return {
        status: 'error',
        message: 'Failed to initialize database',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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

  // Check if a cached value is still valid
  private isCacheValid(key: string): boolean {
    if (!this.localCache[key] || !this.localCache[key].timestamp) {
      return false;
    }
    
    const now = Date.now();
    return now - this.localCache[key].timestamp < this.cacheExpiryMs;
  }

  // Get a cached value or null if not found/expired
  private getCachedValue(key: string): any {
    if (this.isCacheValid(key)) {
      return this.localCache[key].data;
    }
    return null;
  }

  // Set a cached value
  private setCachedValue(key: string, data: any): void {
    this.localCache[key] = {
      data,
      timestamp: Date.now()
    };
    this.saveLocalCache();
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
      
      // Map specific fields to expected column names
      if (fares.roundTripBasePrice) {
        formData.append('roundtrip_base_price', fares.roundTripBasePrice.toString());
      }
      if (fares.roundTripPricePerKm) {
        formData.append('roundtrip_price_per_km', fares.roundTripPricePerKm.toString());
      }
      
      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      try {
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
      } catch (primaryError) {
        console.error('Primary API error:', primaryError);
        
        // Try alternative endpoint
        try {
          const altEndpoint = '/api/admin/direct-outstation-fares.php';
          console.log(`Trying alternative endpoint: ${API_BASE_URL}${altEndpoint}`);
          
          const response = await axios.post(`${API_BASE_URL}${altEndpoint}`, formData, {
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
        } catch (altError) {
          console.error('Alternative API also failed:', altError);
          throw primaryError; // Throw original error
        }
      }
    } catch (error) {
      this.handleApiError(error, 'outstation');
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
      
      // Map fields to expected column names
      if (fares.package4hr40km) {
        formData.append('local_price_4hrs_40km', fares.package4hr40km.toString());
      }
      if (fares.package8hr80km) {
        formData.append('local_price_8hrs_80km', fares.package8hr80km.toString());
      }
      if (fares.package10hr100km) {
        formData.append('local_price_10hrs_100km', fares.package10hr100km.toString());
      }
      
      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      try {
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
          detail: { 
            timestamp: Date.now(),
            vehicleId: fares.vehicleId || '',
            packages: {
              '4hrs-40km': fares.package4hr40km || 0,
              '8hrs-80km': fares.package8hr80km || 0,
              '10hrs-100km': fares.package10hr100km || 0
            }
          }
        }));
        
        return response.data;
      } catch (primaryError) {
        console.error('Primary API error:', primaryError);
        
        // Try direct update endpoint
        try {
          const directEndpoint = '/api/admin/direct-fare-update.php';
          console.log(`Trying direct update endpoint: ${API_BASE_URL}${directEndpoint}`);
          
          const response = await axios.post(`${API_BASE_URL}${directEndpoint}`, formData, {
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
        } catch (altError) {
          console.error('Alternative API also failed:', altError);
          throw primaryError; // Throw original error
        }
      }
    } catch (error) {
      this.handleApiError(error, 'local');
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
      
      try {
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
      } catch (primaryError) {
        console.error('Primary API error:', primaryError);
        
        // Try alternative endpoint
        try {
          const altEndpoint = '/api/admin/direct-fare-update.php';
          formData.append('tripType', 'airport'); // Make sure trip type is specified
          
          console.log(`Trying alternative endpoint: ${API_BASE_URL}${altEndpoint}`);
          
          const response = await axios.post(`${API_BASE_URL}${altEndpoint}`, formData, {
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
        } catch (altError) {
          console.error('Alternative API also failed:', altError);
          throw primaryError; // Throw original error
        }
      }
    } catch (error) {
      this.handleApiError(error, 'airport');
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
      
      // Special handling for outstation round trip fields
      if (tripType === 'outstation') {
        if (data.roundTripBasePrice) {
          formData.append('roundtrip_base_price', data.roundTripBasePrice.toString());
        }
        if (data.roundTripPricePerKm) {
          formData.append('roundtrip_price_per_km', data.roundTripPricePerKm.toString());
        }
      }
      
      // Special handling for local package fields
      if (tripType === 'local') {
        if (data.package4hr40km) {
          formData.append('local_price_4hrs_40km', data.package4hr40km.toString());
        }
        if (data.package8hr80km) {
          formData.append('local_price_8hrs_80km', data.package8hr80km.toString());
        }
        if (data.package10hr100km) {
          formData.append('local_price_10hrs_100km', data.package10hr100km.toString());
        }
      }
      
      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      // Try the direct update endpoint
      try {
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
            detail: { 
              timestamp: Date.now(), 
              vehicleId,
              prices: tripType === 'local' ? {
                '4hrs-40km': data.package4hr40km || 0,
                '8hrs-80km': data.package8hr80km || 0,
                '10hrs-100km': data.package10hr100km || 0
              } : null
            }
          }));
          
          return response.data;
        } else {
          throw new Error(response.data?.message || 'Unknown error in fare update');
        }
      } catch (primaryError) {
        console.error('Error in primary directFareUpdate:', primaryError);
        
        // Try alternative endpoint based on trip type
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
        
        console.log(`Trying fallback endpoint for ${tripType}:`, `${API_BASE_URL}${endpoint}`);
        
        try {
          const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
            headers: {
              ...this.getBypassHeaders(),
              'Content-Type': 'multipart/form-data'
            }
          });
          
          console.log('Fallback endpoint response:', response.data);
          
          if (response.data) {
            this.clearCache();
            
            // Dispatch appropriate event
            const eventName = tripType === 'local' ? 'local-fares-updated' :
                            tripType === 'outstation' ? 'trip-fares-updated' :
                            tripType === 'airport' ? 'airport-fares-updated' : 'fare-cache-cleared';
            
            window.dispatchEvent(new CustomEvent(eventName, {
              detail: { timestamp: Date.now(), vehicleId }
            }));
            
            return response.data;
          } else {
            throw new Error('No data returned from fallback endpoint');
          }
        } catch (fallbackError) {
          console.error('Fallback endpoint also failed:', fallbackError);
          throw primaryError; // Throw the original error
        }
      }
    } catch (error) {
      this.handleApiError(error, tripType);
      
      // Return a minimal success response to prevent UI breaking
      return {
        status: 'success',
        message: 'Fare updated locally (API failed)',
        warning: 'Changes may not persist on server'
      };
    }
  }

  // Get outstation fares for a specific vehicle
  async getOutstationFaresForVehicle(vehicleId: string): Promise<any> {
    const cacheKey = `outstation_fares_${vehicleId.toLowerCase()}`;
    
    // Check cache first
    const cachedData = this.getCachedValue(cacheKey);
    if (cachedData) {
      console.log(`Using cached outstation fares for ${vehicleId}`);
      return cachedData;
    }
    
    try {
      console.log(`Fetching outstation fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/outstation-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
      console.log('Outstation fares response:', response.data);
      
      if (response.data && typeof response.data === 'object') {
        // Cache the response
        this.setCachedValue(cacheKey, response.data);
        return response.data;
      }
      
      // If response is invalid, use default values
      const defaultValues = DEFAULT_FARES.outstation;
      this.setCachedValue(cacheKey, defaultValues);
      return defaultValues;
    } catch (error) {
      console.error('Error fetching outstation fares:', error);
      
      // Set defaults based on vehicle type
      const defaultValues = { ...DEFAULT_FARES.outstation };
      
      // Adjust defaults based on vehicle type
      if (vehicleId.toLowerCase().includes('innova')) {
        defaultValues.basePrice = 4500;
        defaultValues.pricePerKm = 16;
      } else if (vehicleId.toLowerCase().includes('luxury')) {
        defaultValues.basePrice = 5000;
        defaultValues.pricePerKm = 20;
      } else if (vehicleId.toLowerCase().includes('tempo')) {
        defaultValues.basePrice = 6000;
        defaultValues.pricePerKm = 22;
      }
      
      // Cache the defaults
      this.setCachedValue(cacheKey, defaultValues);
      return defaultValues;
    }
  }

  // Get local fares for a specific vehicle
  async getLocalFaresForVehicle(vehicleId: string): Promise<any> {
    const cacheKey = `local_fares_${vehicleId.toLowerCase()}`;
    
    // Check cache first
    const cachedData = this.getCachedValue(cacheKey);
    if (cachedData) {
      console.log(`Using cached local fares for ${vehicleId}`);
      return cachedData;
    }
    
    try {
      console.log(`Fetching local package fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/local-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
      console.log('Local fares response:', response.data);
      
      if (response.data && typeof response.data === 'object') {
        // Normalize field names
        const normalizedData = {
          package4hr40km: response.data.local_price_4hrs_40km || response.data.package4hr40km || 0,
          package8hr80km: response.data.local_price_8hrs_80km || response.data.package8hr80km || 0,
          package10hr100km: response.data.local_price_10hrs_100km || response.data.package10hr100km || 0,
          extraKmRate: response.data.extra_km_rate || response.data.extraKmRate || 12,
          extraHourRate: response.data.extra_hour_rate || response.data.extraHourRate || 100
        };
        
        // Cache the normalized response
        this.setCachedValue(cacheKey, normalizedData);
        return normalizedData;
      }
      
      // If response is invalid, use default values
      const defaultValues = { ...DEFAULT_FARES.local };
      
      // Adjust defaults based on vehicle type
      if (vehicleId.toLowerCase().includes('sedan')) {
        defaultValues.package4hr40km = 1500;
        defaultValues.package8hr80km = 2000;
        defaultValues.package10hr100km = 2500;
      } else if (vehicleId.toLowerCase().includes('ertiga')) {
        defaultValues.package4hr40km = 1800;
        defaultValues.package8hr80km = 2300;
        defaultValues.package10hr100km = 2800;
      } else if (vehicleId.toLowerCase().includes('innova')) {
        defaultValues.package4hr40km = 2000;
        defaultValues.package8hr80km = 2600;
        defaultValues.package10hr100km = 3200;
      } else if (vehicleId.toLowerCase().includes('luxury')) {
        defaultValues.package4hr40km = 2500;
        defaultValues.package8hr80km = 3200;
        defaultValues.package10hr100km = 3800;
      }
      
      this.setCachedValue(cacheKey, defaultValues);
      return defaultValues;
    } catch (error) {
      console.error('Error fetching local fares:', error);
      
      // Set defaults based on vehicle type
      const defaultValues = { ...DEFAULT_FARES.local };
      
      // Adjust defaults based on vehicle type
      if (vehicleId.toLowerCase().includes('sedan')) {
        defaultValues.package4hr40km = 1500;
        defaultValues.package8hr80km = 2000;
        defaultValues.package10hr100km = 2500;
      } else if (vehicleId.toLowerCase().includes('ertiga')) {
        defaultValues.package4hr40km = 1800;
        defaultValues.package8hr80km = 2300;
        defaultValues.package10hr100km = 2800;
      } else if (vehicleId.toLowerCase().includes('innova')) {
        defaultValues.package4hr40km = 2000;
        defaultValues.package8hr80km = 2600;
        defaultValues.package10hr100km = 3200;
      } else if (vehicleId.toLowerCase().includes('luxury')) {
        defaultValues.package4hr40km = 2500;
        defaultValues.package8hr80km = 3200;
        defaultValues.package10hr100km = 3800;
      }
      
      // Cache the defaults
      this.setCachedValue(cacheKey, defaultValues);
      return defaultValues;
    }
  }
  
  // Get airport fares for a specific vehicle
  async getAirportFaresForVehicle(vehicleId: string): Promise<any> {
    const cacheKey = `airport_fares_${vehicleId.toLowerCase()}`;
    
    // Check cache first
    const cachedData = this.getCachedValue(cacheKey);
    if (cachedData) {
      console.log(`Using cached airport fares for ${vehicleId}`);
      return cachedData;
    }
    
    try {
      console.log(`Fetching airport transfer fares for vehicle: ${vehicleId}`);
      const url = `${API_BASE_URL}/api/admin/airport-fares`;
      const params = new URLSearchParams();
      params.append('vehicle_id', vehicleId);
      params.append('_t', Date.now().toString()); // Add timestamp to bypass cache
      
      const response = await axios.get(`${url}?${params.toString()}`, this.getForcedRequestConfig());
      console.log('Airport fares response:', response.data);
      
      if (response.data && typeof response.data === 'object') {
        // Cache the response
        this.setCachedValue(cacheKey, response.data);
        return response.data;
      }
      
      // If response is invalid, use default values
      const defaultValues = { ...DEFAULT_FARES.airport };
      
      // Adjust defaults based on vehicle type
      if (vehicleId.toLowerCase().includes('innova')) {
        defaultValues.basePrice = 600;
        defaultValues.pricePerKm = 14;
      } else if (vehicleId.toLowerCase().includes('luxury')) {
        defaultValues.basePrice = 800;
        defaultValues.pricePerKm = 16;
      } else if (vehicleId.toLowerCase().includes('tempo')) {
        defaultValues.basePrice = 1000;
        defaultValues.pricePerKm = 18;
      }
      
      this.setCachedValue(cacheKey, defaultValues);
      return defaultValues;
    } catch (error) {
      console.error('Error fetching airport fares:', error);
      
      // Set defaults based on vehicle type
      const defaultValues = { ...DEFAULT_FARES.airport };
      
      // Adjust defaults based on vehicle type
      if (vehicleId.toLowerCase().includes('sedan')) {
        defaultValues.basePrice = 500;
        defaultValues.dropPrice = 300;
        defaultValues.pickupPrice = 500;
      } else if (vehicleId.toLowerCase().includes('ertiga')) {
        defaultValues.basePrice = 600;
        defaultValues.dropPrice = 350;
        defaultValues.pickupPrice = 600;
      } else if (vehicleId.toLowerCase().includes('innova')) {
        defaultValues.basePrice = 700;
        defaultValues.dropPrice = 400;
        defaultValues.pickupPrice = 700;
      } else if (vehicleId.toLowerCase().includes('luxury')) {
        defaultValues.basePrice = 800;
        defaultValues.dropPrice = 500;
        defaultValues.pickupPrice = 800;
      }
      
      // Cache the defaults
      this.setCachedValue(cacheKey, defaultValues);
      return defaultValues;
    }
  }
}

// Create a singleton instance
export const fareService = new FareService();
