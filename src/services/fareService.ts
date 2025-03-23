
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
      const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.0';
      
      // Prepare the endpoint based on trip type
      let endpoint = `${apiBaseUrl}/api/admin/direct-fare-update.php`;
      if (tripType === 'local') {
        endpoint = `${apiBaseUrl}/api/admin/local-fares-update.php`;
      } else if (tripType === 'outstation') {
        endpoint = `${apiBaseUrl}/api/admin/outstation-fares-update.php`;
      } else if (tripType === 'airport') {
        endpoint = `${apiBaseUrl}/api/admin/airport-fares-update.php`;
      }
      
      // Add timestamp for cache busting
      const timestamp = Date.now();
      endpoint = `${endpoint}?_t=${timestamp}`;
      
      console.log(`Updating ${tripType} fares for vehicle ${vehicleId} at endpoint: ${endpoint}`);
      console.log("Data being sent:", data);
      
      // First try with JSON
      try {
        const response = await axios.post(endpoint, data, {
          headers: this.getBypassHeaders()
        });
        
        if (response.data && response.data.status === 'success') {
          // Clear cache to ensure fresh data is fetched
          this.clearCache();
          console.log(`Successfully updated ${tripType} fares via JSON:`, response.data);
          return response.data;
        } else {
          console.warn('API request successful but returned error status:', response.data);
          throw new Error(response.data.message || `Failed to update ${tripType} fare via JSON`);
        }
      } catch (error) {
        console.error(`JSON request failed for ${tripType} update:`, error);
        
        // Try with FormData as fallback
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        const response = await axios.post(endpoint, formData, {
          headers: this.getBypassHeaders()
        });
        
        if (response.data && response.data.status === 'success') {
          // Clear cache to ensure fresh data is fetched
          this.clearCache();
          console.log(`Successfully updated ${tripType} fares via FormData:`, response.data);
          return response.data;
        } else {
          console.error('FormData API request failed:', response.data);
          throw new Error(response.data.message || `Failed to update ${tripType} fare via FormData`);
        }
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
