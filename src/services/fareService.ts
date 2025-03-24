import axios from 'axios';
import { toast } from 'sonner';
import { OutstationFare, LocalFare, AirportFare } from '@/types/cab';

class FareService {
  private cacheEnabled = true;
  private apiVersion: string;
  private apiBaseUrl: string;
  private useDirectApiAccess: boolean;
  
  constructor() {
    // Load environment variables
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    this.apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';
    
    // Check environment variable for direct API access
    this.useDirectApiAccess = import.meta.env.VITE_USE_DIRECT_API === 'true';
    
    // Check if we should force disable cache
    const forceCacheRefresh = localStorage.getItem('forceCacheRefresh');
    if (forceCacheRefresh === 'true') {
      this.cacheEnabled = false;
      console.log('Cache disabled due to forceCacheRefresh flag');
      // Clear the flag after reading it
      localStorage.removeItem('forceCacheRefresh');
    }
    
    // Attach event listener for cache clear events
    window.addEventListener('fare-cache-cleared', () => {
      console.log('Fare cache cleared event received');
      this.cacheEnabled = false;
    });
  }

  // Method for forced request configuration
  getForcedRequestConfig() {
    const timestamp = Date.now();
    
    return {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-API-Version': this.apiVersion,
        'X-Force-Refresh': 'true',
        'X-Custom-Timestamp': timestamp.toString()
      },
      params: {
        _t: timestamp
      }
    };
  }

  // Method for bypass headers
  getBypassHeaders() {
    const timestamp = Date.now();
    
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-API-Version': this.apiVersion,
      'X-Force-Refresh': 'true',
      'X-Bypass-Cache': 'true',
      'X-Custom-Timestamp': timestamp.toString()
    };
  }
  
  // Get tour fares
  async getTourFares() {
    // Check if we have cached data
    if (this.cacheEnabled) {
      const cachedData = localStorage.getItem('tourFares');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
            console.log('Using cached tour fares');
            return parsedData;
          }
        } catch (error) {
          console.error('Error parsing cached tour fares:', error);
          localStorage.removeItem('tourFares');
        }
      }
    }
    
    // If no cached data or cache disabled, fetch from API
    try {
      const timestamp = Date.now();
      
      const response = await axios.get(`${this.apiBaseUrl}/api/fares/tours.php?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': this.apiVersion
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Cache the data
        localStorage.setItem('tourFares', JSON.stringify(response.data));
        return response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Handle alternative response format
        localStorage.setItem('tourFares', JSON.stringify(response.data.data));
        return response.data.data;
      } else {
        console.error('Invalid tour fares data:', response.data);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      throw error;
    }
  }
  
  // Get outstation fares for a vehicle
  async getOutstationFaresForVehicle(vehicleId: string): Promise<OutstationFare> {
    // Load from localStorage if available
    if (this.cacheEnabled) {
      const cachedData = localStorage.getItem('cabFares');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (parsedData && parsedData.outstation && parsedData.outstation[vehicleId]) {
            console.log(`Using cached outstation fares for ${vehicleId}`);
            return parsedData.outstation[vehicleId];
          }
        } catch (error) {
          console.error('Error parsing cached fares:', error);
          localStorage.removeItem('cabFares');
        }
      }
    }
    
    // Try to fetch from direct API endpoint
    try {
      const timestamp = Date.now();
      const endpoint = `${this.apiBaseUrl}/api/direct-outstation-fares.php?vehicleId=${vehicleId}&_t=${timestamp}`;
      
      console.log(`Fetching outstation fares for ${vehicleId} from API: ${endpoint}`);
      
      const response = await axios.get(endpoint, this.getForcedRequestConfig());
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        console.log(`Successfully fetched outstation fares for ${vehicleId}:`, response.data.data);
        
        // Cache this new data
        try {
          const cabFaresStr = localStorage.getItem('cabFares');
          let cabFares = cabFaresStr ? JSON.parse(cabFaresStr) : {};
          
          if (!cabFares.outstation) {
            cabFares.outstation = {};
          }
          
          cabFares.outstation[vehicleId] = response.data.data;
          localStorage.setItem('cabFares', JSON.stringify(cabFares));
          console.log(`Cached outstation fares for ${vehicleId}`);
        } catch (e) {
          console.error('Error caching outstation fares:', e);
        }
        
        return response.data.data;
      }
    } catch (error) {
      console.error(`Failed to fetch outstation fares for ${vehicleId} from API:`, error);
    }
    
    // Fallback to default values
    return {
      basePrice: 0,
      pricePerKm: 0,
      driverAllowance: 0,
      nightHalt: 0,
      roundTripBasePrice: 0,
      roundTripPricePerKm: 0
    };
  }
  
  // Get local fares for a vehicle
  async getLocalFaresForVehicle(vehicleId: string): Promise<LocalFare> {
    // Load from localStorage if available
    if (this.cacheEnabled) {
      const cachedData = localStorage.getItem('cabFares');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (parsedData && parsedData.local && parsedData.local[vehicleId]) {
            console.log(`Using cached local fares for ${vehicleId}`);
            return parsedData.local[vehicleId];
          }
        } catch (error) {
          console.error('Error parsing cached fares:', error);
          localStorage.removeItem('cabFares');
        }
      }
    }
    
    // Fallback to default values
    return {
      package4hr40km: 0,
      package8hr80km: 0,
      package10hr100km: 0,
      extraKmRate: 0,
      extraHourRate: 0
    };
  }
  
  // Get airport fares for a vehicle
  async getAirportFaresForVehicle(vehicleId: string): Promise<AirportFare> {
    // Load from localStorage if available
    if (this.cacheEnabled) {
      const cachedData = localStorage.getItem('cabFares');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (parsedData && parsedData.airport && parsedData.airport[vehicleId]) {
            console.log(`Using cached airport fares for ${vehicleId}`);
            return parsedData.airport[vehicleId];
          }
        } catch (error) {
          console.error('Error parsing cached fares:', error);
          localStorage.removeItem('cabFares');
        }
      }
    }
    
    // If no cached data or cache is disabled, try to fetch from API
    try {
      const timestamp = Date.now();
      const endpoint = `${this.apiBaseUrl}/api/fares/airport.php?vehicleId=${vehicleId}&_t=${timestamp}`;
      
      console.log(`Fetching airport fares for ${vehicleId} from API: ${endpoint}`);
      
      const response = await axios.get(endpoint, this.getForcedRequestConfig());
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        console.log(`Successfully fetched airport fares for ${vehicleId}:`, response.data.data);
        return response.data.data;
      }
    } catch (error) {
      console.error(`Failed to fetch airport fares for ${vehicleId} from API:`, error);
    }
    
    // Fallback to default values
    return {
      basePrice: 0,
      pricePerKm: 0,
      dropPrice: 0,
      pickupPrice: 0,
      tier1Price: 0,
      tier2Price: 0,
      tier3Price: 0,
      tier4Price: 0,
      extraKmCharge: 0
    };
  }
  
  // Update tour fare
  async updateTourFare(updateData: any) {
    try {
      const timestamp = Date.now();
      const response = await axios.post(`${this.apiBaseUrl}/api/admin/fares-update.php?_t=${timestamp}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': this.apiVersion,
          'X-Force-Refresh': 'true',
          'X-Custom-Timestamp': timestamp.toString()
        }
      });
      
      if (response.data && response.data.status === 'success') {
        // Clear cache to ensure fresh data is fetched
        this.clearCache();
        return response.data;
      } else {
        console.error('Error updating tour fare:', response.data);
        throw new Error(response.data.message || 'Failed to update tour fare');
      }
    } catch (error) {
      console.error('Error updating tour fare:', error);
      throw error;
    }
  }
  
  // Enhanced outstation fare updater with multiple fallback approaches
  async updateOutstationFares(vehicleId: string, data: any): Promise<any> {
    console.log(`Starting updateOutstationFares for vehicle ID ${vehicleId}`, data);
    
    // Ensure consistent data format
    const fareData = {
      vehicleId: vehicleId,
      basePrice: data.basePrice || 0,
      pricePerKm: data.pricePerKm || 0,
      driverAllowance: data.driverAllowance || 0, 
      nightHalt: data.nightHalt || data.nightHaltCharge || 0,
      roundTripBasePrice: data.roundTripBasePrice || 0,
      roundTripPricePerKm: data.roundTripPricePerKm || 0,
      timestamp: Date.now()
    };
    
    // Initialize error tracking
    let lastError = null;
    let success = false;
    
    try {
      // Try to directly use directFareUpdate method first
      return await this.directFareUpdate('outstation', vehicleId, fareData);
    } catch (error) {
      console.error('Error in updateOutstationFares:', error);
      this.clearCache(); // Clear cache even on error to prevent stale data
      throw error;
    }
  }
  
  // Update local fares
  async updateLocalFares(vehicleId: string, data: any): Promise<any> {
    try {
      return await this.directFareUpdate('local', vehicleId, data);
    } catch (error) {
      console.error('Error updating local fares:', error);
      throw error;
    }
  }
  
  // Update airport fares
  async updateAirportFares(vehicleId: string, data: any): Promise<any> {
    try {
      return await this.directFareUpdate('airport', vehicleId, data);
    } catch (error) {
      console.error('Error updating airport fares:', error);
      throw error;
    }
  }
  
  // Direct fare update method - for all types of fares
  async directFareUpdate(tripType: string, vehicleId: string, data: any): Promise<any> {
    console.log(`directFareUpdate for ${tripType} with vehicle ID ${vehicleId}`, data);
    
    // Initialize error tracking
    let lastError = null;
    let endpoints = [];
    
    // Create a more reliable request payload
    const requestData = {
      ...data,
      vehicleId: vehicleId,
      vehicle_id: vehicleId, // Add both formats for PHP
      tripType: tripType,
      trip_type: tripType, // Add both formats for PHP
      timestamp: Date.now()
    };
    
    // Define endpoints to try in order of preference
    if (tripType === 'outstation') {
      endpoints = [
        // Try the outstation-specific endpoint first (most reliable)
        {
          url: `${this.apiBaseUrl}/api/direct-outstation-fares.php`,
          method: 'post',
          useFormData: true
        },
        // Then try the general fare update endpoint
        {
          url: `${this.apiBaseUrl}/api/direct-fare-update.php`,
          method: 'post',
          useFormData: true
        },
        // Then try admin specific endpoints
        {
          url: `${this.apiBaseUrl}/api/admin/outstation-fares-update.php`,
          method: 'post', 
          useFormData: true
        },
        // Try direct PHP file access as last resort
        {
          url: `${this.apiBaseUrl}/api/admin/direct-outstation-fares.php`,
          method: 'post',
          useFormData: true
        }
      ];
    } else {
      // For local and airport, just use the direct-fare-update endpoint
      endpoints = [
        {
          url: `${this.apiBaseUrl}/api/direct-fare-update.php`,
          method: 'post',
          useFormData: true
        }
      ];
    }
    
    console.log(`Attempting to update ${tripType} fares with ${endpoints.length} different approaches`);
    
    // Try each endpoint in sequence until one works
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      try {
        console.log(`Attempt ${i + 1}/${endpoints.length}: Using ${endpoint.url}`);
        
        let response;
        
        if (endpoint.useFormData) {
          // Create FormData for more reliable PHP handling
          const formData = new FormData();
          
          // Add all fields to the form data
          Object.entries(requestData).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
          
          // Make the request
          response = await fetch(`${endpoint.url}?_t=${Date.now()}`, {
            method: endpoint.method,
            body: formData,
            headers: {
              ...this.getBypassHeaders()
            }
          });
        } else {
          // Use axios for JSON data
          response = await axios.post(endpoint.url, requestData, {
            headers: {
              'Content-Type': 'application/json',
              ...this.getBypassHeaders()
            },
            params: {
              _t: Date.now()
            }
          });
          
          // Convert axios response to match fetch API
          response = {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            json: async () => response.data
          };
        }
        
        if (!response.ok) {
          const errorText = typeof response.text === 'function' ? await response.text() : 'Server error';
          console.error(`Endpoint ${endpoint.url} failed with status:`, response.status, errorText);
          throw new Error(`Server error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`Response from ${endpoint.url}:`, data);
        
        if (data.status === 'success') {
          // Clear cache to ensure fresh data is fetched next time
          this.clearCache();
          
          // Dispatch events to refresh UI components
          window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
          window.dispatchEvent(new CustomEvent('trip-fares-updated', {
            detail: { 
              timestamp: Date.now(),
              vehicleId: vehicleId
            }
          }));
          
          console.log(`Successfully updated ${tripType} fares`);
          return data;
        } else {
          throw new Error(data.message || `Failed to update ${tripType} fares`);
        }
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        lastError = error;
        
        // Continue to the next endpoint
        continue;
      }
    }
    
    // If we reach here, all attempts failed
    console.error(`All ${endpoints.length} attempts to update ${tripType} fares failed`);
    
    // Try to initialize the database as a last resort
    try {
      await this.initializeDatabase();
      console.log("Database initialized successfully, attempting update one more time");
      
      // Try one more time with the first endpoint after DB initialization
      const firstEndpoint = endpoints[0];
      
      // Create FormData
      const formData = new FormData();
      Object.entries(requestData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      // Make the request
      const finalResponse = await fetch(`${firstEndpoint.url}?_t=${Date.now()}`, {
        method: firstEndpoint.method,
        body: formData,
        headers: {
          ...this.getBypassHeaders()
        }
      });
      
      if (!finalResponse.ok) {
        throw new Error(`Final attempt failed with status: ${finalResponse.status}`);
      }
      
      const finalData = await finalResponse.json();
      if (finalData.status === 'success') {
        this.clearCache();
        return finalData;
      } else {
        throw new Error(finalData.message || 'Final attempt failed');
      }
    } catch (finalError) {
      console.error("Final attempt after DB initialization also failed:", finalError);
      
      // Throw the last error from the original attempts
      throw lastError || new Error(`All attempts to update ${tripType} fares failed`);
    }
  }
  
  // Clear the fare cache
  clearCache(): void {
    try {
      console.log('Clearing fare cache...');
      
      // Set a flag in localStorage to indicate cache should be refreshed
      localStorage.setItem('forceCacheRefresh', 'true');
      localStorage.setItem('fareCacheLastCleared', Date.now().toString());
      
      // Clear any cached fare data
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      
      // Dispatch event for components to refresh
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { timestamp: Date.now() }
      }));
      
      console.log('Fare cache cleared successfully');
      
      // Reset cache flag after short delay
      setTimeout(() => {
        this.cacheEnabled = true;
      }, 5000);
    } catch (error) {
      console.error('Error clearing fare cache:', error);
    }
  }
  
  // Initialize database (helper method for recovery)
  async initializeDatabase(): Promise<any> {
    try {
      const timestamp = Date.now();
      
      // Try multiple endpoint variations for initialization
      const endpoints = [
        `${this.apiBaseUrl}/api/init-database?_t=${timestamp}`,
        `${this.apiBaseUrl}/api/init-database.php?_t=${timestamp}`,
        `${this.apiBaseUrl}/api/admin/init-database?_t=${timestamp}`,
        `${this.apiBaseUrl}/api/admin/init-database.php?_t=${timestamp}`
      ];
      
      console.log('Attempting to initialize database...');
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying database initialization endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: this.getBypassHeaders()
          });
          
          if (!response.ok) {
            console.error(`Endpoint ${endpoint} failed with status: ${response.status}`);
            continue;
          }
          
          try {
            const data = await response.json();
            console.log('Database initialization response:', data);
            
            if (data.status === 'success') {
              toast.success("Database tables initialized successfully");
              return data;
            } else {
              console.warn(`Endpoint ${endpoint} returned non-success status:`, data);
            }
          } catch (jsonError) {
            // If not JSON, check if it's a text success message
            const text = await response.text();
            if (text.includes('success') || text.includes('initialized')) {
              toast.success("Database tables initialized successfully");
              return { status: 'success', message: 'Database tables initialized successfully' };
            }
            console.warn(`Endpoint ${endpoint} returned non-JSON response:`, text);
          }
        } catch (endpointError) {
          console.error(`Error with endpoint ${endpoint}:`, endpointError);
        }
      }
      
      throw new Error('All database initialization attempts failed');
    } catch (error) {
      console.error('Error initializing database:', error);
      toast.error('Failed to initialize database tables');
      throw error;
    }
  }
}

export const fareService = new FareService();
