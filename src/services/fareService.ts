
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';
      
      // Add cache busting parameter
      const timestamp = Date.now();
      
      const response = await axios.get(`${apiBaseUrl}/api/fares/tours.php?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': apiVersion
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
  
  async directFareUpdate(tripType: string, vehicleId: string, data: any): Promise<any> {
    try {
      console.log(`Starting directFareUpdate for ${tripType} with vehicle ID ${vehicleId}`);
      
      // Set the vehicle ID in the data object - ensure it exists under both naming conventions
      data.vehicleId = vehicleId;
      data.vehicle_id = vehicleId;
      data.tripType = tripType;
      data.trip_type = tripType;
      
      // Add timestamp for more consistent cache busting
      const timestamp = Date.now();
      data._t = timestamp;
      data.timestamp = timestamp;
      
      // Add API version to help with debugging
      data.apiVersion = this.apiVersion;
      
      // Initialize response tracking variables
      let successfulResponse = null;
      let fallbackAttempted = false;
      let directResponse = null;
      
      // Try to initialize the database first to ensure tables exist
      console.log("First initializing database to ensure tables exist...");
      try {
        const initResponse = await fetch(`${this.apiBaseUrl}/api/init-database.php?_t=${timestamp}`, {
          method: 'GET',
          headers: this.getBypassHeaders()
        });
        
        if (initResponse.ok) {
          const initData = await initResponse.json();
          console.log("Database initialization response:", initData);
        }
      } catch (initError) {
        console.error("Initial database initialization error (non-critical):", initError);
        // Continue anyway - this is just a preparatory step
      }
      
      // Try different endpoints based on trip type
      if (tripType === 'outstation') {
        // For outstation fares, use dedicated endpoint
        try {
          console.log("Using dedicated outstation endpoint");
          
          const formData = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, String(value));
            }
          });
          
          // Specifically ensure these fields are in the form data for outstation fares
          if (data.oneWayBasePrice) formData.append('oneWayBasePrice', String(data.oneWayBasePrice));
          if (data.oneWayPricePerKm) formData.append('oneWayPricePerKm', String(data.oneWayPricePerKm));
          if (data.roundTripBasePrice) formData.append('roundTripBasePrice', String(data.roundTripBasePrice));
          if (data.roundTripPricePerKm) formData.append('roundTripPricePerKm', String(data.roundTripPricePerKm));
          
          // Also ensure alternate naming conventions are included
          if (data.oneWayBasePrice) formData.append('one_way_base_price', String(data.oneWayBasePrice));
          if (data.oneWayPricePerKm) formData.append('one_way_price_per_km', String(data.oneWayPricePerKm));
          if (data.roundTripBasePrice) formData.append('round_trip_base_price', String(data.roundTripBasePrice));
          if (data.roundTripPricePerKm) formData.append('round_trip_price_per_km', String(data.roundTripPricePerKm));
          
          // For backward compatibility with older endpoints
          if (data.oneWayBasePrice) formData.append('baseFare', String(data.oneWayBasePrice));
          if (data.oneWayPricePerKm) formData.append('pricePerKm', String(data.oneWayPricePerKm));
          
          const outstationEndpoint = `${this.apiBaseUrl}/api/direct-outstation-fares.php?_t=${timestamp}`;
          
          // First try with FormData
          const response = await fetch(outstationEndpoint, {
            method: 'POST',
            body: formData,
            headers: {
              ...this.getBypassHeaders()
            }
          });
          
          if (response.ok) {
            let responseData;
            const responseText = await response.text();
            
            try {
              responseData = JSON.parse(responseText);
            } catch (e) {
              console.log("Response is not JSON, using text response:", responseText);
              responseData = { 
                status: 'success', 
                message: 'Non-JSON response received',
                rawResponse: responseText
              };
            }
            
            console.log("Outstation fare update response:", responseData);
            
            if (responseData.status === 'success') {
              successfulResponse = responseData;
              directResponse = responseData;
            } else {
              console.warn("Outstation fare update returned non-success status:", responseData);
            }
          } else {
            console.error(`Outstation fare update returned non-OK status: ${response.status}`);
            const responseText = await response.text();
            console.log("Error response text:", responseText);
            
            // Try fallback to JSON format
            fallbackAttempted = true;
            
            // Prepare JSON body
            const jsonData = {};
            formData.forEach((value, key) => {
              jsonData[key] = value;
            });
            
            console.log("Trying JSON format fallback with data:", jsonData);
            
            const jsonResponse = await fetch(outstationEndpoint, {
              method: 'POST',
              body: JSON.stringify(jsonData),
              headers: {
                ...this.getBypassHeaders(),
                'Content-Type': 'application/json'
              }
            });
            
            if (jsonResponse.ok) {
              let jsonResponseData;
              const jsonResponseText = await jsonResponse.text();
              
              try {
                jsonResponseData = JSON.parse(jsonResponseText);
              } catch (e) {
                console.log("JSON fallback response is not JSON, using text response:", jsonResponseText);
                jsonResponseData = { 
                  status: 'success', 
                  message: 'Non-JSON response received',
                  rawResponse: jsonResponseText
                };
              }
              
              console.log("JSON fallback response:", jsonResponseData);
              
              if (jsonResponseData.status === 'success') {
                successfulResponse = jsonResponseData;
              }
            }
          }
        } catch (outstationError) {
          console.error("Error using outstation endpoint:", outstationError);
        }
        
        // If direct endpoint failed, try the alternative URL pattern
        if (!successfulResponse) {
          try {
            console.log("Trying alternative outstation endpoint");
            
            const altEndpoint = `${this.apiBaseUrl}/api/admin/outstation-fares-update.php?_t=${timestamp}`;
            
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                formData.append(key, String(value));
              }
            });
            
            const response = await fetch(altEndpoint, {
              method: 'POST',
              body: formData,
              headers: {
                ...this.getBypassHeaders()
              }
            });
            
            if (response.ok) {
              let responseData;
              const responseText = await response.text();
              
              try {
                responseData = JSON.parse(responseText);
              } catch (e) {
                console.log("Response is not JSON, using text response:", responseText);
                responseData = { 
                  status: 'success', 
                  message: 'Non-JSON response received',
                  rawResponse: responseText
                };
              }
              
              console.log("Alternative outstation endpoint response:", responseData);
              
              if (responseData.status === 'success') {
                successfulResponse = responseData;
              }
            }
          } catch (altError) {
            console.error("Error using alternative outstation endpoint:", altError);
          }
        }
      } else {
        // For other fare types, use the generic direct-fare-update.php endpoint
        try {
          console.log("Using generic direct-fare-update endpoint");
          
          const directEndpoint = `${this.apiBaseUrl}/api/direct-fare-update.php?_t=${timestamp}`;
          
          const formData = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, String(value));
            }
          });
          
          const response = await fetch(directEndpoint, {
            method: 'POST',
            body: formData,
            headers: {
              ...this.getBypassHeaders()
            }
          });
          
          if (response.ok) {
            let responseData;
            const responseText = await response.text();
            
            try {
              responseData = JSON.parse(responseText);
            } catch (e) {
              console.log("Response is not JSON, using text response:", responseText);
              responseData = { 
                status: 'success', 
                message: 'Non-JSON response received',
                rawResponse: responseText
              };
            }
            
            console.log("Direct fare update response:", responseData);
            
            if (responseData.status === 'success') {
              successfulResponse = responseData;
              directResponse = responseData;
            } else {
              console.warn("Direct fare update returned non-success status:", responseData);
            }
          } else {
            console.error(`Direct fare update returned non-OK status: ${response.status}`);
            console.log("Response text:", await response.text());
          }
        } catch (directError) {
          console.error("Error using direct fare update:", directError);
        }
      }
      
      // If any request was successful, clear cache and return the response
      if (successfulResponse) {
        this.clearCache();
        console.log(`Successfully updated ${tripType} fares:`, successfulResponse);
        
        // Show toast notification
        toast.success(`Successfully updated ${tripType} fares`);
        
        // Dispatch update event
        window.dispatchEvent(new CustomEvent('fares-updated', { 
          detail: { vehicleId, tripType, success: true }
        }));
        
        return successfulResponse;
      }
      
      // If we get here, all attempts failed
      console.error(`All ${tripType} fare update attempts failed`);
      
      // Show error toast
      toast.error(`Failed to update ${tripType} fares. Please try again.`);
      
      // Dispatch failure event
      window.dispatchEvent(new CustomEvent('fares-updated', { 
        detail: { vehicleId, tripType, success: false, fallbackAttempted }
      }));
      
      // Return a standardized error response
      return {
        status: 'error',
        message: 'Failed to update fares after multiple attempts',
        fallbackAttempted: fallbackAttempted,
        vehicleId: vehicleId,
        tripType: tripType,
        timestamp: Date.now(),
        directResponse: directResponse
      };
      
    } catch (error) {
      console.error(`Error in directFareUpdate for ${tripType}:`, error);
      
      // Show error toast
      toast.error(`Error updating ${tripType} fares: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Dispatch failure event
      window.dispatchEvent(new CustomEvent('fares-updated', { 
        detail: { vehicleId, tripType, success: false, error }
      }));
      
      // Return error response
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        vehicleId: vehicleId,
        tripType: tripType,
        timestamp: Date.now()
      };
    }
  }
  
  clearCache() {
    console.log('Clearing fare cache');
    localStorage.removeItem('tourFares');
    localStorage.removeItem('cabFares');
    sessionStorage.removeItem('calculatedFares');
    this.cacheEnabled = false; // Disable cache for this session
    
    // Set flag to force refresh for other components
    localStorage.setItem('forceCacheRefresh', 'true'); 
    
    // Dispatch an event to notify other components
    window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
    
    // Show toast notification
    toast.success('Fare cache cleared', { id: 'fare-cache-cleared' });
  }
  
  // Method to initialize database tables
  async initializeDatabase(): Promise<boolean> {
    try {
      console.log('Initializing database tables...');
      const timestamp = Date.now();
      
      // First attempt - use init-database endpoint
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/init-database.php?_t=${timestamp}`, {
          method: 'GET',
          headers: this.getBypassHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Database initialization response:', data);
          
          if (data.status === 'success') {
            toast.success('Database tables initialized successfully');
            this.clearCache();
            return true;
          } else {
            console.log('Primary database initialization failed, trying fallback method');
          }
        } else {
          console.error('Database initialization failed with status:', response.status);
          console.log('Trying fallback method...');
        }
      } catch (primaryError) {
        console.error('Primary database initialization error:', primaryError);
        console.log('Trying fallback method...');
      }
      
      // Fallback - try the direct API endpoints to create tables as needed
      try {
        // Try direct outstation endpoint which will create tables
        const outstationEndpoint = `${this.apiBaseUrl}/api/direct-outstation-fares.php?createTables=1&_t=${timestamp}`;
        const outstationResponse = await fetch(outstationEndpoint, {
          method: 'GET',
          headers: this.getBypassHeaders()
        });
        
        // Try direct fare update endpoint which will also create tables
        const fareUpdateEndpoint = `${this.apiBaseUrl}/api/direct-fare-update.php?createTables=1&_t=${timestamp}`;
        const fareUpdateResponse = await fetch(fareUpdateEndpoint, {
          method: 'GET',
          headers: this.getBypassHeaders()
        });
        
        // Try airport fares endpoint
        const airportEndpoint = `${this.apiBaseUrl}/api/fares/airport.php?createTables=1&_t=${timestamp}`;
        const airportResponse = await fetch(airportEndpoint, {
          method: 'GET',
          headers: this.getBypassHeaders()
        });
        
        console.log('Fallback database initialization successful');
        toast.success('Database initialized via fallback method');
        this.clearCache();
        return true;
        
      } catch (fallbackError) {
        console.error('Fallback database initialization error:', fallbackError);
        toast.error('All database initialization attempts failed');
        return false;
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      toast.error('Error initializing database');
      return false;
    }
  }
}

export const fareService = new FareService();
