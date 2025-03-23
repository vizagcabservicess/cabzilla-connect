import axios from 'axios';
import { toast } from 'sonner';
import { OutstationFare, LocalFare, AirportFare } from '@/types/cab';

class FareService {
  private cacheEnabled = true;
  
  constructor() {
    // Check if we should force disable cache
    const forceCacheRefresh = localStorage.getItem('forceCacheRefresh');
    if (forceCacheRefresh === 'true') {
      this.cacheEnabled = false;
      console.log('Cache disabled due to forceCacheRefresh flag');
      // Clear the flag after reading it
      localStorage.removeItem('forceCacheRefresh');
    }
  }

  // New method for forced request configuration
  getForcedRequestConfig() {
    const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';
    const timestamp = Date.now();
    
    return {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-API-Version': apiVersion,
        'X-Force-Refresh': 'true'
      },
      params: {
        _t: timestamp
      }
    };
  }

  // New method for bypass headers
  getBypassHeaders() {
    const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';
    
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-API-Version': apiVersion,
      'X-Force-Refresh': 'true',
      'X-Bypass-Cache': 'true'
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const timestamp = Date.now();
      const endpoint = `${apiBaseUrl}/api/fares/airport.php?vehicleId=${vehicleId}&_t=${timestamp}`;
      
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';
      
      // Prepare the request
      const timestamp = Date.now();
      const response = await axios.post(`${apiBaseUrl}/api/admin/fares-update.php?_t=${timestamp}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': apiVersion,
          'X-Force-Refresh': 'true'
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
  
  async directFareUpdate(tripType: string, vehicleId: string, data: any) {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      
      // Set the vehicle ID in the data object
      data.vehicleId = vehicleId;
      
      // Prepare the endpoint based on trip type - use new direct endpoints
      let endpoint = '';
      if (tripType === 'local') {
        endpoint = `${apiBaseUrl}/api/admin/direct-fare-update.php`;
      } else if (tripType === 'outstation') {
        endpoint = `${apiBaseUrl}/api/admin/direct-outstation-fares.php`;
      } else if (tripType === 'airport') {
        endpoint = `${apiBaseUrl}/api/admin/direct-airport-fares.php`;
      } else {
        endpoint = `${apiBaseUrl}/api/admin/direct-fare-update.php`;
      }
      
      // Add timestamp for cache busting
      const timestamp = Date.now();
      endpoint = `${endpoint}?_t=${timestamp}`;
      
      console.log(`Updating ${tripType} fares for vehicle ${vehicleId} at endpoint: ${endpoint}`);
      console.log("Data being sent:", data);
      
      // Try multiple request formats to maximize chance of success
      const attempts = [];
      
      // 1. First try with URL encoded form data
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      attempts.push(
        axios.post(endpoint, formData, {
          headers: {
            ...this.getBypassHeaders(),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }).catch(e => {
          console.log(`Form data attempt failed: ${e.message}`);
          return null;
        })
      );
      
      // 2. Try with JSON
      attempts.push(
        axios.post(endpoint, data, {
          headers: {
            ...this.getBypassHeaders(),
            'Content-Type': 'application/json'
          }
        }).catch(e => {
          console.log(`JSON attempt failed: ${e.message}`);
          return null;
        })
      );
      
      // 3. Try with URLSearchParams 
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      
      attempts.push(
        axios.post(endpoint, params, {
          headers: {
            ...this.getBypassHeaders(),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }).catch(e => {
          console.log(`URLSearchParams attempt failed: ${e.message}`);
          return null;
        })
      );
      
      // 4. Try with direct GET request
      const queryParams = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });
      
      attempts.push(
        axios.get(`${endpoint}&${queryParams.toString()}`, {
          headers: this.getBypassHeaders()
        }).catch(e => {
          console.log(`GET attempt failed: ${e.message}`);
          return null;
        })
      );
      
      // Try all request formats and use the first successful one
      const responses = await Promise.all(attempts);
      const successResponse = responses.find(r => r && r.data && r.data.status === 'success');
      
      if (successResponse) {
        // Clear cache to ensure fresh data is fetched
        this.clearCache();
        console.log(`Successfully updated ${tripType} fares:`, successResponse.data);
        return successResponse.data;
      }
      
      // If we get here, all attempts failed - try one more super simple approach
      try {
        // Direct fetch with minimal content
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams(data).toString()
        });
        
        const jsonResponse = await response.json();
        if (jsonResponse.status === 'success') {
          this.clearCache();
          console.log(`Successfully updated ${tripType} fares using fetch API:`, jsonResponse);
          return jsonResponse;
        }
        
        // If we reached here, everything failed
        throw new Error('All update attempts failed');
      } catch (fetchError) {
        console.error(`Final attempt using fetch API also failed:`, fetchError);
        throw new Error(`Could not update ${tripType} fares after multiple attempts`);
      }
    } catch (error) {
      console.error(`Error in directFareUpdate for ${tripType}:`, error);
      throw error;
    }
  }
  
  clearCache() {
    console.log('Clearing fare cache');
    localStorage.removeItem('tourFares');
    localStorage.removeItem('cabFares');
    sessionStorage.removeItem('calculatedFares');
    this.cacheEnabled = false; // Disable cache for this session
    localStorage.setItem('forceCacheRefresh', 'true'); // Set flag to force refresh for other components
    
    // Dispatch an event to notify other components
    window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
  }
}

export const fareService = new FareService();

