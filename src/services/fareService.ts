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

  // New method for forced request configuration
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

  // New method for bypass headers
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
      
      // Try to update via the direct-fare-update.php endpoint first (preferred)
      try {
        console.log("Attempting to update fare via direct-fare-update.php");
        
        const directEndpoint = `${this.apiBaseUrl}/api/direct-fare-update.php?_t=${timestamp}`;
        
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        const response = await fetch(directEndpoint, {
          method: 'POST',
          body: formData,
          headers: {
            ...this.getBypassHeaders()
          }
        });
        
        if (response.ok) {
          const responseData = await response.json();
          console.log("Direct fare update response:", responseData);
          
          if (responseData.status === 'success') {
            successfulResponse = responseData;
          } else {
            console.warn("Direct fare update returned non-success status:", responseData);
          }
        } else {
          console.error(`Direct fare update returned non-OK status: ${response.status}`);
          
          // If server error, try to initialize the database
          if (response.status === 500) {
            console.log("Server error detected, trying to initialize database...");
            
            try {
              const initResponse = await fetch(`${this.apiBaseUrl}/api/init-database.php?_t=${timestamp}`, {
                method: 'GET',
                headers: this.getBypassHeaders()
              });
              
              if (initResponse.ok) {
                const initData = await initResponse.json();
                console.log("Database initialization response:", initData);
                
                if (initData.status === 'success') {
                  console.log("Database successfully initialized, retrying fare update...");
                  
                  // Try the update again
                  const retryResponse = await fetch(directEndpoint, {
                    method: 'POST',
                    body: formData,
                    headers: {
                      ...this.getBypassHeaders()
                    }
                  });
                  
                  if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    console.log("Retry fare update response:", retryData);
                    
                    if (retryData.status === 'success') {
                      successfulResponse = retryData;
                    }
                  }
                }
              }
            } catch (initError) {
              console.error("Error initializing database:", initError);
            }
          }
        }
      } catch (directError) {
        console.error("Error using direct fare update:", directError);
      }
      
      // If direct endpoint failed, fall back to type-specific endpoints
      if (!successfulResponse) {
        fallbackAttempted = true;
        console.log("Direct fare update failed, trying type-specific endpoint");
        
        let endpoint = '';
        if (tripType === 'local') {
          endpoint = `${this.apiBaseUrl}/api/admin/local-fares-update.php`;
        } else if (tripType === 'outstation') {
          endpoint = `${this.apiBaseUrl}/api/admin/outstation-fares-update.php`;
        } else if (tripType === 'airport') {
          endpoint = `${this.apiBaseUrl}/api/admin/airport-fares-update.php`;
        } else {
          endpoint = `${this.apiBaseUrl}/api/admin/fares-update.php`;
        }
        
        // Add timestamp for cache busting
        endpoint = `${endpoint}?_t=${timestamp}`;
        
        console.log(`Updating ${tripType} fares for vehicle ${vehicleId} at endpoint: ${endpoint}`);
        console.log("Data being sent:", data);
        
        try {
          const formData = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
          
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
              ...this.getBypassHeaders()
            }
          });
          
          if (response.ok) {
            const responseData = await response.json();
            console.log(`Fallback ${tripType} fares update response:`, responseData);
            
            if (responseData.status === 'success') {
              successfulResponse = responseData;
            }
          } else {
            console.error(`Fallback fare update failed with status: ${response.status}`);
          }
        } catch (fallbackError) {
          console.error(`Error in fallback ${tripType} fare update:`, fallbackError);
        }
      }
      
      // If any request format was successful, clear cache and return the response
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
        timestamp: Date.now()
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
          toast.error('Failed to initialize database tables');
          return false;
        }
      } else {
        console.error('Database initialization failed with status:', response.status);
        toast.error(`Database initialization failed with status: ${response.status}`);
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
