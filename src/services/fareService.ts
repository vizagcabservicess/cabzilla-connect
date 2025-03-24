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
      // ATTEMPT 1: Try direct outstation fares endpoint - most reliable method
      console.log(`Attempting to update via direct-outstation-fares.php endpoint`);
      try {
        const directResponse = await this.updateDirectOutstationFares(vehicleId, fareData);
        
        if (directResponse && directResponse.status === 'success') {
          console.log('Outstation fares updated successfully via direct endpoint');
          this.clearCache();
          return directResponse;
        }
      } catch (error) {
        console.error('Direct outstation fares update failed:', error);
        lastError = error;
      }
      
      // ATTEMPT 2: Try direct-fare-update.php endpoint as fallback
      console.log(`Attempting to update via direct-fare-update.php endpoint`);
      try {
        const directFareUpdateResponse = await this.updateDirectFareUpdate(vehicleId, fareData);
        
        if (directFareUpdateResponse && directFareUpdateResponse.status === 'success') {
          console.log('Outstation fares updated successfully via direct-fare-update.php');
          this.clearCache();
          return directFareUpdateResponse;
        }
      } catch (error) {
        console.error('Direct fare update failed:', error);
        lastError = error;
        
        // If we get a 500 error, try to initialize the database
        const errorResponse = error.response;
        if (errorResponse && errorResponse.status === 500) {
          console.log('Server error detected, trying to initialize database...');
          try {
            const dbInitResponse = await this.initializeDatabase();
            if (dbInitResponse && dbInitResponse.status === 'success') {
              console.log('Database successfully initialized, retrying fare update...');
              
              // Try again with direct endpoint after DB initialization
              try {
                const retryResponse = await this.updateDirectOutstationFares(vehicleId, fareData);
                if (retryResponse && retryResponse.status === 'success') {
                  console.log('Outstation fares updated successfully after DB initialization');
                  this.clearCache();
                  return retryResponse;
                }
              } catch (retryError) {
                console.error('Retry after DB initialization failed:', retryError);
                lastError = retryError;
              }
            }
          } catch (dbError) {
            console.error('Database initialization failed:', dbError);
          }
        }
      }
      
      // ATTEMPT 3: Use the type-specific outstation-fares-update.php endpoint
      console.log(`Attempting to update via outstation-fares-update.php endpoint`);
      try {
        const typeSpecificResponse = await this.updateTypeSpecificOutstationFares(vehicleId, {
          vehicleId: vehicleId,
          oneWayBasePrice: fareData.basePrice,
          oneWayPricePerKm: fareData.pricePerKm,
          roundTripBasePrice: fareData.roundTripBasePrice,
          roundTripPricePerKm: fareData.roundTripPricePerKm,
          driverAllowance: fareData.driverAllowance,
          nightHalt: fareData.nightHalt
        });
        
        if (typeSpecificResponse && typeSpecificResponse.status === 'success') {
          console.log('Outstation fares updated successfully via type-specific endpoint');
          this.clearCache();
          return typeSpecificResponse;
        }
      } catch (error) {
        console.error('Type-specific outstation update failed:', error);
        lastError = error;
      }
      
      // If all attempts failed, throw the last error
      throw lastError || new Error('All outstation fare update attempts failed');
    } catch (error) {
      console.error('All outstation fare update attempts failed:', error);
      this.clearCache(); // Clear cache even on error to prevent stale data
      throw error;
    }
  }
  
  // Direct outstation fares update method
  private async updateDirectOutstationFares(vehicleId: string, data: any): Promise<any> {
    console.log(`directOutstationUpdate for vehicle ID ${vehicleId}`, data);
    
    const timestamp = Date.now();
    const endpoint = `${this.apiBaseUrl}/api/direct-outstation-fares`;
    
    const response = await axios.post(endpoint, data, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getBypassHeaders()
      },
      params: {
        _t: timestamp
      }
    });
    
    return response.data;
  }
  
  // Direct fare update method
  private async updateDirectFareUpdate(vehicleId: string, data: any): Promise<any> {
    console.log(`directFareUpdate for outstation with vehicle ID ${vehicleId}`, data);
    
    const timestamp = Date.now();
    const endpoint = `${this.apiBaseUrl}/api/direct-fare-update.php`;
    
    // Include tripType to ensure it's processed as outstation
    const requestData = {
      ...data,
      vehicleId: vehicleId,
      tripType: 'outstation'
    };
    
    const response = await axios.post(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getBypassHeaders()
      },
      params: {
        _t: timestamp
      }
    });
    
    return response.data;
  }
  
  // Type-specific outstation fares update
  private async updateTypeSpecificOutstationFares(vehicleId: string, data: any): Promise<any> {
    console.log(`Updating outstation fares for vehicle ${vehicleId} at endpoint: outstation-fares-update.php`, data);
    
    const timestamp = Date.now();
    const endpoint = `${this.apiBaseUrl}/api/admin/outstation-fares-update.php`;
    
    const response = await axios.post(endpoint, data, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getBypassHeaders()
      },
      params: {
        _t: timestamp
      }
    });
    
    return response.data;
  }
  
  // Update local fares
  async updateLocalFares(vehicleId: string, data: any): Promise<any> {
    try {
      console.log(`Updating local fares for vehicle ${vehicleId}`, data);
      
      const timestamp = Date.now();
      const endpoint = `${this.apiBaseUrl}/api/direct-fare-update.php`;
      
      // Ensure tripType is 'local'
      const requestData = {
        ...data,
        vehicleId: vehicleId,
        tripType: 'local'
      };
      
      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          ...this.getBypassHeaders()
        },
        params: {
          _t: timestamp
        }
      });
      
      if (response.data && response.data.status === 'success') {
        this.clearCache();
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Failed to update local fares');
      }
    } catch (error) {
      console.error('Error updating local fares:', error);
      throw error;
    }
  }
  
  // Update airport fares
  async updateAirportFares(vehicleId: string, data: any): Promise<any> {
    try {
      console.log(`Updating airport fares for vehicle ${vehicleId}`, data);
      
      const timestamp = Date.now();
      const endpoint = `${this.apiBaseUrl}/api/direct-fare-update.php`;
      
      // Ensure tripType is 'airport'
      const requestData = {
        ...data,
        vehicleId: vehicleId,
        tripType: 'airport'
      };
      
      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          ...this.getBypassHeaders()
        },
        params: {
          _t: timestamp
        }
      });
      
      if (response.data && response.data.status === 'success') {
        this.clearCache();
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Failed to update airport fares');
      }
    } catch (error) {
      console.error('Error updating airport fares:', error);
      throw error;
    }
  }
  
  // Direct fare update method - for all types of fares
  async directFareUpdate(tripType: string, vehicleId: string, data: any): Promise<any> {
    console.log(`directFareUpdate for ${tripType} with vehicle ID ${vehicleId}`, data);
    
    try {
      const timestamp = Date.now();
      const endpoint = `${this.apiBaseUrl}/api/direct-fare-update.php`;
      
      // Include tripType to ensure it's processed correctly
      const requestData = {
        ...data,
        vehicleId: vehicleId,
        vehicle_id: vehicleId, // Add both formats for PHP
        tripType: tripType,
        trip_type: tripType, // Add both formats for PHP
        timestamp: timestamp
      };
      
      console.log('Sending direct fare update request:', requestData);
      
      // Try FormData approach (most reliable)
      const formData = new FormData();
      Object.entries(requestData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...this.getBypassHeaders()
        },
        params: {
          _t: timestamp
        }
      });
      
      if (response.data && response.data.status === 'success') {
        console.log(`${tripType} fares updated successfully:`, response.data);
        this.clearCache();
        return response.data;
      } else {
        console.error(`Failed to update ${tripType} fares:`, response.data);
        throw new Error(response.data?.message || `Failed to update ${tripType} fares`);
      }
    } catch (error) {
      console.error(`Error in directFareUpdate for ${tripType}:`, error);
      throw error;
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
      const endpoint = `${this.apiBaseUrl}/api/init-database`;
      
      console.log('Attempting to initialize database...');
      
      const response = await axios.get(endpoint, {
        headers: this.getBypassHeaders(),
        params: { _t: timestamp }
      });
      
      console.log('Database initialization response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
}

export const fareService = new FareService();
