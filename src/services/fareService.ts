
import axios from 'axios';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { getVehiclePricingUrls, getVehicleUpdateUrls } from '@/lib/apiEndpoints';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_VERSION = import.meta.env.VITE_API_VERSION || '1.0.0';
const USE_DIRECT_API_PATH = import.meta.env.VITE_USE_DIRECT_API_PATH === 'true';

// Clean vehicle ID by removing prefixes
const cleanVehicleId = (id: string): string => {
  if (id.startsWith('item-')) {
    return id.substring(5);
  }
  return id;
};

class FareService {
  private fareCacheKey = 'cabFares';
  private fareExplanationCache: Record<string, string> = {};
  private fetchAbortControllers: Record<string, AbortController> = {};
  private requestTimeout = 15000; // 15 seconds timeout
  private maxRetries = 3;
  
  clearCache(): void {
    localStorage.removeItem(this.fareCacheKey);
    sessionStorage.removeItem('calculatedFares');
    this.fareExplanationCache = {};
    
    // Cancel any pending requests
    Object.values(this.fetchAbortControllers).forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        // Ignore errors when aborting
      }
    });
    this.fetchAbortControllers = {};
  }
  
  async fetchWithRetry(endpoint: string, options: any, retries = this.maxRetries): Promise<any> {
    const requestId = `${endpoint}-${Date.now()}`;
    
    // Create abort controller for this request
    this.fetchAbortControllers[requestId] = new AbortController();
    
    try {
      // Add signal to options
      const requestOptions = {
        ...options,
        signal: this.fetchAbortControllers[requestId].signal,
        timeout: this.requestTimeout
      };
      
      console.log(`Attempting to fetch (${retries} retries left): ${endpoint}`);
      
      // Add cache busting timestamp
      const timeStamp = Date.now();
      const urlWithTimestamp = endpoint.includes('?') 
        ? `${endpoint}&_t=${timeStamp}` 
        : `${endpoint}?_t=${timeStamp}`;
      
      const response = await axios(urlWithTimestamp, requestOptions);
      
      // Clean up controller
      delete this.fetchAbortControllers[requestId];
      
      return response.data;
    } catch (error: any) {
      // Clean up controller
      delete this.fetchAbortControllers[requestId];
      
      // Handle various error types
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        console.log(`Request timeout for ${endpoint}`);
        if (retries > 0) {
          console.log(`Retrying ${endpoint}...`);
          return this.fetchWithRetry(endpoint, options, retries - 1);
        }
      }
      
      if (error.response?.status >= 500 && retries > 0) {
        console.log(`Server error (${error.response.status}), retrying ${endpoint}...`);
        
        // Add exponential backoff delay
        const delay = Math.pow(2, this.maxRetries - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.fetchWithRetry(endpoint, options, retries - 1);
      }
      
      throw error;
    }
  }
  
  async calculateFaresForCabs(
    cabTypes: CabType[], 
    distance: number, 
    tripType: TripType, 
    tripMode: TripMode,
    hourlyPackage?: string,
    pickupDate?: Date,
    returnDate?: Date
  ): Promise<Record<string, number>> {
    console.log(`Calculating fares for ${cabTypes.length} cabs`);
    
    // Generate a cache key for the current calculation parameters
    const cacheKey = `${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.getTime() || 0}-${returnDate?.getTime() || 0}`;
    
    // Prepare results object
    const fares: Record<string, number> = {};
    
    // Calculate the actual fare for each cab type
    for (const cab of cabTypes) {
      if (!cab || !cab.id) continue;
      
      try {
        // Calculate basic fare based on type
        let baseFare = 0;
        
        if (tripType === 'local' && hourlyPackage) {
          // Local package pricing
          if (hourlyPackage === '8hr_80km') {
            baseFare = cab.hr8km80Price || 0;
          } else if (hourlyPackage === '10hr_100km') {
            baseFare = cab.hr10km100Price || 0;
          }
        } else if (tripType === 'airport') {
          // Airport transfer pricing
          baseFare = cab.price || cab.basePrice || 0;
          
          if (cab.pricePerKm && distance > 0) {
            baseFare += cab.pricePerKm * distance;
          }
          
          // Add airport fee if applicable
          if (cab.airportFee) {
            baseFare += cab.airportFee;
          }
        } else {
          // Outstation pricing
          baseFare = cab.price || cab.basePrice || 0;
          
          if (cab.pricePerKm && distance > 0) {
            baseFare += cab.pricePerKm * distance;
          }
          
          // Add night halt charges for round trips with multiple days
          if (tripMode === 'round-trip' && pickupDate && returnDate) {
            const nights = Math.max(0, differenceInDays(returnDate, pickupDate));
            if (nights > 0 && cab.nightHaltCharge) {
              baseFare += nights * cab.nightHaltCharge;
            }
            
            // Add driver allowance for multiple days
            if (cab.driverAllowance) {
              baseFare += (nights + 1) * cab.driverAllowance; // +1 for the first day
            }
          }
        }
        
        // Store the calculated fare
        fares[cab.id] = Math.round(baseFare);
      } catch (error) {
        console.error(`Error calculating fare for ${cab.name}:`, error);
        fares[cab.id] = 0;
      }
    }
    
    // Cache the results
    sessionStorage.setItem('calculatedFares', JSON.stringify({ 
      cacheKey, 
      fares, 
      timestamp: Date.now() 
    }));
    
    return fares;
  }
  
  getFareExplanation(
    distance: number,
    tripType: TripType,
    tripMode: TripMode,
    hourlyPackage?: string,
    pickupDate?: Date,
    returnDate?: Date
  ): string {
    // Generate a cache key
    const cacheKey = `${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.getTime() || 0}-${returnDate?.getTime() || 0}`;
    
    // Return from cache if available
    if (this.fareExplanationCache[cacheKey]) {
      return this.fareExplanationCache[cacheKey];
    }
    
    let explanation = '';
    
    if (tripType === 'local' && hourlyPackage) {
      if (hourlyPackage === '8hr_80km') {
        explanation = '8 hours and 80 km package. Extra charges may apply for additional hours or distance.';
      } else if (hourlyPackage === '10hr_100km') {
        explanation = '10 hours and 100 km package. Extra charges may apply for additional hours or distance.';
      }
    } else if (tripType === 'airport') {
      explanation = `Airport transfer for ${distance} km.`;
      explanation += ' The fare includes base price plus per km charges.';
    } else {
      // Outstation
      explanation = `${tripMode === 'round-trip' ? 'Round trip' : 'One way'} fare for ${distance} km.`;
      explanation += ' The fare includes base price plus per km charges.';
      
      if (tripMode === 'round-trip' && pickupDate && returnDate) {
        const nights = Math.max(0, differenceInDays(returnDate, pickupDate));
        if (nights > 0) {
          explanation += ` Includes ${nights} night${nights > 1 ? 's' : ''} halt charges.`;
        }
      }
    }
    
    // Cache the explanation
    this.fareExplanationCache[cacheKey] = explanation;
    
    return explanation;
  }
  
  async updateTripFares(
    vehicleId: string, 
    tripType: string, 
    fareData: Record<string, any>,
    forceDirectPath: boolean = false
  ): Promise<boolean> {
    // Validate inputs
    if (!vehicleId || !tripType) {
      console.error('Invalid inputs for updateTripFares:', { vehicleId, tripType });
      toast.error('Missing required vehicle or trip type information');
      return false;
    }
    
    // Clean the vehicle ID
    const cleanedVehicleId = cleanVehicleId(vehicleId);
    console.log(`Updating ${tripType} fares for vehicle ${cleanedVehicleId}:`, fareData);
    
    // Create payload combining vehicle ID, trip type, and fare data
    const payload = {
      vehicleId: cleanedVehicleId,
      tripType,
      ...fareData,
      name: fareData.name || vehicleId,
      _t: Date.now() // Add timestamp to bust cache
    };
    
    // Create an abort controller for the request
    const controller = new AbortController();
    
    try {
      // Get endpoints from apiEndpoints service
      const pricingEndpoints = getVehiclePricingUrls(true);
      const updateEndpoints = getVehicleUpdateUrls(true);
      
      // Add direct endpoints for more robustness
      const directEndpoints = [
        `${API_BASE_URL}/api/admin/vehicle-pricing.php?_t=${Date.now()}`,
        `${API_BASE_URL}/api/fares/vehicles.php?_t=${Date.now()}`,
        `/api/admin/vehicle-pricing?_t=${Date.now()}`,
        `/api/fares/vehicles?_t=${Date.now()}`
      ];
      
      // Use direct endpoints if forced or if using direct API path
      const endpoints = forceDirectPath || USE_DIRECT_API_PATH 
        ? [...directEndpoints, ...pricingEndpoints, ...updateEndpoints]
        : [...pricingEndpoints, ...updateEndpoints, ...directEndpoints];
      
      console.log(`Sending vehicle pricing update to ${endpoints.length} potential endpoints`);
      
      // Create common request config
      const requestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': API_VERSION,
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        signal: controller.signal,
        timeout: 20000 // 20 seconds
      };
      
      // Try each endpoint sequentially until one works
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        try {
          console.log(`Trying endpoint ${i+1}/${endpoints.length}: ${endpoint}`);
          
          const response = await axios.post(endpoint, payload, requestConfig);
          
          if (response.status === 200 || response.status === 201) {
            console.log(`Endpoint ${i+1} (${endpoint}) successful:`, response.data);
            
            // Clear caches
            this.clearCache();
            localStorage.removeItem('cabTypes');
            
            return true;
          }
        } catch (error: any) {
          console.warn(`Endpoint ${i+1} (${endpoint}) failed:`, error.message);
          // Continue to the next endpoint
        }
      }
      
      // If we've tried all endpoints and none worked
      throw new Error('All API endpoints failed');
    } catch (error: any) {
      console.error('Error updating trip fares:', error.response?.data || error);
      
      // Show a better error message to the user
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Unknown error updating fares';
                          
      toast.error(`Failed to update fares: ${errorMessage}`);
      return false;
    } finally {
      // Clean up abort controller
      controller.abort();
    }
  }
}

export const fareService = new FareService();
