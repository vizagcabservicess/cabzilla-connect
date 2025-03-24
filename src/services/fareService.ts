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
  
  // Enhanced outstation fare updater with a direct fetch approach
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
    
    // Use new directOutstationFareUpdate method
    try {
      return await this.directOutstationFareUpdate(vehicleId, fareData);
    } catch (error) {
      console.error('Error in updateOutstationFares:', error);
      this.clearCache(); // Clear cache even on error to prevent stale data
      throw error;
    }
  }
  
  // Direct outstation fare update method specifically for outstation fares
  async directOutstationFareUpdate(vehicleId: string, data: any): Promise<any> {
    console.log(`directOutstationFareUpdate for vehicle ID ${vehicleId}`, data);
    
    // Create a more reliable FormData payload
    const formData = new FormData();
    
    // Add all data fields with multiple naming patterns for compatibility
    formData.append('vehicleId', vehicleId);
    formData.append('vehicle_id', vehicleId); 
    
    // Base price with multiple possible field names
    formData.append('basePrice', data.basePrice.toString());
    formData.append('base_price', data.basePrice.toString());
    formData.append('oneway_base_price', data.basePrice.toString());
    
    // Price per km with multiple possible field names
    formData.append('pricePerKm', data.pricePerKm.toString());
    formData.append('price_per_km', data.pricePerKm.toString());
    formData.append('oneway_price_per_km', data.pricePerKm.toString());
    
    // Driver allowance
    formData.append('driverAllowance', data.driverAllowance.toString());
    formData.append('driver_allowance', data.driverAllowance.toString());
    
    // Night halt
    formData.append('nightHalt', data.nightHalt.toString());
    formData.append('nightHaltCharge', data.nightHalt.toString());
    formData.append('night_halt_charge', data.nightHalt.toString());
    
    // Round trip base price
    formData.append('roundTripBasePrice', data.roundTripBasePrice.toString());
    formData.append('roundtrip_base_price', data.roundTripBasePrice.toString());
    formData.append('round_trip_base_price', data.roundTripBasePrice.toString());
    
    // Round trip price per km
    formData.append('roundTripPricePerKm', data.roundTripPricePerKm.toString());
    formData.append('roundtrip_price_per_km', data.roundTripPricePerKm.toString());
    formData.append('round_trip_price_per_km', data.roundTripPricePerKm.toString());
    
    // Add trip type identifier
    formData.append('tripType', 'outstation');
    formData.append('trip_type', 'outstation');
    formData.append('type', 'outstation');
    
    // Add timestamp
    formData.append('timestamp', Date.now().toString());
    
    const timestamp = Date.now();
    
    // Define endpoints to try in order of preference
    const endpoints = [
      // Primary endpoint - direct PHP file access
      `${this.apiBaseUrl}/api/direct-outstation-fares.php?_t=${timestamp}`,
      
      // Alternative endpoints
      `${this.apiBaseUrl}/api/admin/direct-outstation-fares.php?_t=${timestamp}`,
      `${this.apiBaseUrl}/api/direct-fare-update.php?tripType=outstation&_t=${timestamp}`,
      `${this.apiBaseUrl}/api/admin/direct-fare-update.php?tripType=outstation&_t=${timestamp}`,
      `${this.apiBaseUrl}/api/admin/outstation-fares-update.php?_t=${timestamp}`,
      `${this.apiBaseUrl}/api/admin/vehicle-pricing.php?type=outstation&_t=${timestamp}`
    ];
    
    // Track all errors for detailed reporting
    const errors: Error[] = [];
    
    // Try each endpoint in sequence until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting to update outstation fares via: ${endpoint}`);
        
        // Use fetch with FormData for more reliable PHP handling
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            ...this.getBypassHeaders()
          }
        });
        
        // Check for non-2xx responses and capture details
        if (!response.ok) {
          const statusCode = response.status;
          const errorText = await response.text();
          console.error(`Endpoint ${endpoint} failed with status: ${statusCode}`, errorText);
          
          // Try to parse JSON error if possible
          try {
            const errorJson = JSON.parse(errorText);
            errors.push(new Error(`Server error (${statusCode}): ${errorJson.message || errorText}`));
          } catch {
            errors.push(new Error(`Server error (${statusCode}): ${errorText.substring(0, 100)}`));
          }
          
          // Continue to next endpoint
          continue;
        }
        
        // Try to parse the response as JSON
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.warn(`Response from ${endpoint} is not valid JSON.`);
          // If not JSON, see if it contains success indicators
          const text = await response.text();
          if (text.toLowerCase().includes('success')) {
            // Consider this a success
            data = { status: 'success', message: 'Update successful', data: text };
          } else {
            throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
          }
        }
        
        // Check if response indicates success
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
          
          console.log(`Successfully updated outstation fares via ${endpoint}`);
          return data;
        } else {
          // If we got here, the response was valid JSON but indicated an error
          console.error(`API error from ${endpoint}:`, data);
          errors.push(new Error(`API error: ${data.message || 'Unknown error'}`));
        }
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error);
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    // If we reach here, all endpoints failed
    console.error(`All ${endpoints.length} attempts to update outstation fares failed`);
    
    // Try database initialization as last resort
    try {
      await this.initializeDatabase();
      
      // After initialization, try the first endpoint one more time
      console.log("Database initialized successfully, attempting update once more");
      
      const finalEndpoint = endpoints[0]; // Use the primary endpoint
      
      const finalResponse = await fetch(finalEndpoint, {
        method: 'POST',
        body: formData,
        headers: this.getBypassHeaders()
      });
      
      if (finalResponse.ok) {
        try {
          const finalData = await finalResponse.json();
          
          if (finalData.status === 'success') {
            this.clearCache();
            
            // Dispatch events to refresh UI components
            window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
            window.dispatchEvent(new CustomEvent('trip-fares-updated', {
              detail: { 
                timestamp: Date.now(),
                vehicleId: vehicleId
              }
            }));
            
            console.log(`Successfully updated outstation fares after DB initialization`);
            return finalData;
          }
        } catch (e) {
          console.error("Error parsing final response:", e);
        }
      }
    } catch (finalError) {
      console.error("Final attempt after DB initialization also failed:", finalError);
      errors.push(finalError instanceof Error ? finalError : new Error(String(finalError)));
    }
    
    // Compile all errors for detailed reporting
    const errorMessage = errors.length > 0 
      ? `Multiple errors occurred: ${errors.map(e => e.message).join('; ')}`
      : 'All attempts to update outstation fares failed with unknown errors';
    
    throw new Error(errorMessage);
  }
  
  // Direct fare update method - for all types of fares
  async directFareUpdate(tripType: string, vehicleId: string, data: any): Promise<any> {
    if (tripType === 'outstation') {
      return this.directOutstationFareUpdate(vehicleId, data);
    }
    
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
    if (tripType === 'local') {
      endpoints = [
        // Try the general fare update endpoint
        {
          url: `${this.apiBaseUrl}/api/direct-fare-update.php`,
          method: 'post',
          useFormData: true
        },
        // Then try admin specific endpoints
        {
          url: `${this.apiBaseUrl}/api/admin/local-fares-update.php`,
          method: 'post', 
          useFormData: true
        }
      ];
    } else if (tripType === 'airport') {
      endpoints = [
        // Try the general fare update endpoint
        {
          url: `${this.apiBaseUrl}/api/direct-fare-update.php`,
          method: 'post',
          useFormData: true
        },
        // Then try admin specific endpoints
        {
          url: `${this.apiBaseUrl}/api/admin/airport-fares-update.php`,
          method: 'post', 
          useFormData: true
        },
        // Try direct PHP file access as last resort
        {
          url: `${this.apiBaseUrl}/api/admin/direct-airport-fares.php`,
          method: 'post',
          useFormData: true
        }
      ];
    } else {
      // For other types, just use the direct-fare-update endpoint
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
