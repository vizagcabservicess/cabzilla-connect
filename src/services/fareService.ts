
import { CabType, FareCalculationParams } from '@/types/cab';
import { calculateFare } from '@/lib/fareCalculationService';
import { differenceInDays } from 'date-fns';
import { TripType, TripMode } from '@/lib/tripTypes';
import { fareAPI } from '@/services/api';
import { toast } from 'sonner';

// In-memory cache for fare calculations
type FareCache = Map<string, { expire: number, fare: number }>;

// Define a type for API responses to handle different response formats
export type ApiResponse = {
  vehicles?: any[];
  data?: any[];
  [key: string]: any;
};

class FareService {
  private static instance: FareService;
  private fareCache: FareCache = new Map();
  private cacheExpiryMs: number = 15 * 60 * 1000; // 15 minutes
  private isRefreshing: boolean = false;
  
  private constructor() { 
    // Private constructor to enforce singleton
  }
  
  public static getInstance(): FareService {
    if (!FareService.instance) {
      FareService.instance = new FareService();
    }
    return FareService.instance;
  }
  
  // Generate a unique cache key based on fare parameters
  private generateCacheKey(params: FareCalculationParams): string {
    const { cabType, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate } = params;
    return `${cabType.id}_${distance}_${tripType}_${tripMode}_${hourlyPackage || ''}_${pickupDate?.getTime() || 0}_${returnDate?.getTime() || 0}`;
  }
  
  // Normalize API response to handle different formats
  private normalizeApiResponse(response: any): any[] {
    if (!response) return [];
    
    // If it's already an array, use it directly
    if (Array.isArray(response)) {
      return response;
    }
    
    // Check for nested arrays in common properties
    if (response.vehicles && Array.isArray(response.vehicles)) {
      return response.vehicles;
    }
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    // Last resort: try to extract any arrays found in the response
    const arrays = Object.values(response).filter(val => Array.isArray(val));
    if (arrays.length > 0) {
      // Return the first array found
      return arrays[0] as any[];
    }
    
    // If all else fails, try to convert to an array if it's an object
    if (typeof response === 'object' && response !== null) {
      const values = Object.values(response);
      if (values.length > 0) {
        return values.filter(v => v !== null && typeof v === 'object');
      }
    }
    
    // Return empty array if we couldn't extract anything useful
    return [];
  }
  
  // Refresh cab types from the backend
  public async refreshCabTypes(): Promise<CabType[]> {
    try {
      // Prevent concurrent refreshes
      if (this.isRefreshing) {
        console.log("Already refreshing cab types, skipping concurrent request");
        return [];
      }
      
      this.isRefreshing = true;
      console.log("Refreshing cab types from the API");
      
      // First try to get data from vehicles.php endpoint
      let vehiclesResponse;
      let vehicleArray: any[] = [];
      let apiSuccess = false;
      
      try {
        // Try the main vehicles endpoint
        vehiclesResponse = await fareAPI.getVehicles();
        console.log("Raw vehicles API response:", typeof vehiclesResponse === 'string' ? vehiclesResponse.substring(0, 200) + '...' : vehiclesResponse);
        
        // Check if response is valid
        if (vehiclesResponse && (Array.isArray(vehiclesResponse) || (typeof vehiclesResponse === 'object' && vehiclesResponse !== null))) {
          // Extract vehicles array
          vehicleArray = this.normalizeApiResponse(vehiclesResponse);
          if (vehicleArray.length > 0) {
            apiSuccess = true;
            console.log(`Successfully got ${vehicleArray.length} vehicles from primary endpoint`);
          }
        }
      } catch (error) {
        console.error("Error fetching from vehicles.php:", error);
      }
      
      // If first attempt failed, try the backup endpoint
      if (!apiSuccess) {
        try {
          console.log("Using getAllVehicleData as backup");
          vehiclesResponse = await fareAPI.getAllVehicleData();
          
          // Check if response is valid
          if (vehiclesResponse && (Array.isArray(vehiclesResponse) || (typeof vehiclesResponse === 'object' && vehiclesResponse !== null))) {
            // Extract vehicles array
            vehicleArray = this.normalizeApiResponse(vehiclesResponse);
            if (vehicleArray.length > 0) {
              apiSuccess = true;
              console.log(`Successfully got ${vehicleArray.length} vehicles from backup endpoint`);
            }
          }
        } catch (error) {
          console.error("Error fetching from backup endpoint:", error);
        }
      }
      
      // If both API calls failed, try one more endpoint
      if (!apiSuccess) {
        try {
          console.log("Using direct database query as last resort");
          const directDbResponse = await fetch('/api/vehicles-data.php?_t=' + Date.now(), {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          const responseData = await directDbResponse.json();
          
          if (responseData && (Array.isArray(responseData) || (typeof responseData === 'object' && responseData !== null))) {
            vehicleArray = this.normalizeApiResponse(responseData);
            if (vehicleArray.length > 0) {
              apiSuccess = true;
              console.log(`Successfully got ${vehicleArray.length} vehicles from direct db endpoint`);
            }
          }
        } catch (error) {
          console.error("Error with direct db query:", error);
        }
      }
      
      // If we still have no vehicles, use hardcoded defaults
      if (vehicleArray.length === 0) {
        console.warn('No vehicles found in any API response, using defaults');
        const defaultVehicles = [
          {
            id: 'sedan',
            name: 'Sedan',
            capacity: 4,
            luggageCapacity: 2,
            price: 4200,
            pricePerKm: 14,
            image: '/cars/sedan.png',
            amenities: ['AC', 'Bottle Water', 'Music System'],
            description: 'Comfortable sedan suitable for 4 passengers.',
            ac: true,
            nightHaltCharge: 700,
            driverAllowance: 250,
            isActive: true,
            vehicleId: 'sedan'
          },
          {
            id: 'ertiga',
            name: 'Ertiga',
            capacity: 6,
            luggageCapacity: 3,
            price: 5400,
            pricePerKm: 18,
            image: '/cars/ertiga.png',
            amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
            description: 'Spacious SUV suitable for 6 passengers.',
            ac: true,
            nightHaltCharge: 1000,
            driverAllowance: 250,
            isActive: true,
            vehicleId: 'ertiga'
          },
          {
            id: 'innova_crysta',
            name: 'Innova Crysta',
            capacity: 7,
            luggageCapacity: 4,
            price: 6000,
            pricePerKm: 20,
            image: '/cars/innova.png',
            amenities: ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
            description: 'Premium SUV with ample space for 7 passengers.',
            ac: true,
            nightHaltCharge: 1000,
            driverAllowance: 250,
            isActive: true,
            vehicleId: 'innova_crysta'
          }
        ];
        
        // Update vehicleArray with default vehicles
        vehicleArray = defaultVehicles;
        toast.warning("Using default vehicle data - API connections failed", {
          id: "vehicle-api-error",
          duration: 4000
        });
      }
      
      // Clear fare cache when vehicles are refreshed
      this.clearCache();
      
      // Map the vehicles to CabType format with safe defaults for all fields
      const cabTypes: CabType[] = vehicleArray
        .filter(vehicle => vehicle && typeof vehicle === 'object')
        .map(vehicle => ({
          id: String(vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || Math.random().toString(36).substring(2, 9)),
          name: String(vehicle.name || 'Unnamed Vehicle'),
          capacity: Number(vehicle.capacity) || 4,
          luggageCapacity: Number(vehicle.luggageCapacity || vehicle.luggage_capacity) || 2,
          price: Number(vehicle.basePrice || vehicle.price || vehicle.base_price) || 4200,
          pricePerKm: Number(vehicle.pricePerKm || vehicle.price_per_km) || 14,
          image: String(vehicle.image || '/cars/sedan.png'),
          amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
          description: String(vehicle.description || ''),
          ac: vehicle.ac !== undefined ? Boolean(vehicle.ac) : true,
          nightHaltCharge: Number(vehicle.nightHaltCharge || vehicle.night_halt_charge) || 700,
          driverAllowance: Number(vehicle.driverAllowance || vehicle.driver_allowance) || 250,
          isActive: vehicle.isActive !== undefined ? Boolean(vehicle.isActive) : 
                   (vehicle.is_active !== undefined ? Boolean(vehicle.is_active) : true),
          vehicleId: String(vehicle.vehicleId || vehicle.id || vehicle.vehicle_id || Math.random().toString(36).substring(2, 9)),
          basePrice: Number(vehicle.basePrice || vehicle.price || vehicle.base_price) || 4200
        }))
        .filter(cab => cab.isActive !== false && cab.id); // Only return active cabs with valid IDs
      
      this.isRefreshing = false;
      console.log(`Returning ${cabTypes.length} processed cab types`);
      return cabTypes;
    } catch (error) {
      console.error('Error refreshing cab types:', error);
      this.isRefreshing = false;
      toast.error('Failed to refresh vehicle data');
      throw error;
    }
  }
  
  // Get fare from cache or calculate new fare
  public async getFare(params: FareCalculationParams): Promise<number> {
    const cacheKey = this.generateCacheKey(params);
    
    // Check if we have a valid cached result
    const cachedResult = this.fareCache.get(cacheKey);
    if (cachedResult && cachedResult.expire > Date.now()) {
      console.log(`Using cached fare calculation: ₹${cachedResult.fare}`);
      return cachedResult.fare;
    }
    
    // Calculate new fare
    console.log(`Calculating new fare for ${params.tripType} trip with ${params.cabType.name}`);
    
    try {
      const fare = await calculateFare(params);
      
      // Store in cache
      this.fareCache.set(cacheKey, {
        expire: Date.now() + this.cacheExpiryMs,
        fare
      });
      
      return fare;
    } catch (error) {
      console.error(`Error calculating fare:`, error);
      // Return a default minimum fare if calculation fails
      return params.cabType.basePrice || params.cabType.price || 4200;
    }
  }
  
  // Calculate fares for multiple cab types in parallel
  public async calculateFaresForCabs(
    cabTypes: CabType[], 
    distance: number,
    tripType: TripType,
    tripMode: TripMode,
    hourlyPackage?: string,
    pickupDate?: Date,
    returnDate?: Date
  ): Promise<Record<string, number>> {
    const fares: Record<string, number> = {};
    
    // First check if we have any cab types
    if (!cabTypes || cabTypes.length === 0) {
      console.warn('No cab types provided for fare calculation');
      return fares;
    }
    
    const farePromises = cabTypes.map(async (cab) => {
      try {
        const fare = await this.getFare({
          cabType: cab,
          distance,
          tripType,
          tripMode,
          hourlyPackage,
          pickupDate,
          returnDate
        });
        
        return { id: cab.id, fare };
      } catch (error) {
        console.error(`Error calculating fare for ${cab.name}:`, error);
        return { id: cab.id, fare: cab.basePrice || cab.price || 0 };
      }
    });
    
    try {
      const results = await Promise.all(farePromises);
      
      results.forEach(result => {
        fares[result.id] = result.fare;
      });
    } catch (error) {
      console.error('Error calculating fares for multiple cabs:', error);
      // Provide default fares based on cab base prices if parallel calculation fails
      cabTypes.forEach(cab => {
        fares[cab.id] = cab.basePrice || cab.price || 0;
      });
    }
    
    return fares;
  }
  
  // Generate fare explanation text for user display
  public getFareExplanation(
    distance: number, 
    tripType: TripType, 
    tripMode: TripMode, 
    hourlyPackage?: string,
    pickupDate?: Date,
    returnDate?: Date
  ): string {
    if (tripType === 'airport') {
      return "Airport transfer";
    } else if (tripType === 'local' && hourlyPackage) {
      const packageInfo = hourlyPackage === '8hrs-80km' ? '8 hrs / 80 km' : '10 hrs / 100 km';
      return packageInfo;
    } else if (tripType === 'outstation') {
      const allocatedKm = 300;
      const extraKm = tripMode === 'one-way' 
        ? Math.max(0, distance - allocatedKm)
        : Math.max(0, distance - (allocatedKm * (returnDate && pickupDate ? 
            Math.max(1, differenceInDays(returnDate, pickupDate) + 1) : 1)));
            
      return tripMode === 'one-way' 
        ? `One way - ${distance}km (${extraKm > 0 ? extraKm + 'km extra' : 'within base km'})` 
        : `Round trip - ${distance}km total`;
    }
    
    return "";
  }
  
  // Clear the fare cache
  public clearCache(): void {
    this.fareCache.clear();
    console.log('Fare cache cleared');
  }
  
  // Update vehicle pricing in the backend with retry logic
  public async updateVehiclePricing(vehicleData: any): Promise<boolean> {
    try {
      console.log("Updating vehicle pricing:", vehicleData);
      
      // Ensure all required fields are present
      const requiredFields = ['vehicleId', 'basePrice', 'pricePerKm'];
      const missingFields = requiredFields.filter(field => {
        // Handle special case for vehicleId which might be in id or vehicleType
        if (field === 'vehicleId' && (vehicleData.id || vehicleData.vehicleType)) {
          return false;
        }
        return vehicleData[field] === undefined || vehicleData[field] === null || vehicleData[field] === '';
      });
      
      if (missingFields.length > 0) {
        console.error(`Missing required fields: ${missingFields.join(', ')}`);
        toast.error(`Cannot update: Missing ${missingFields.join(', ')}`);
        return false;
      }
      
      // Create a sanitized copy of the vehicle data with proper type conversions
      const sanitizedData = {
        vehicleId: String(vehicleData.vehicleId || vehicleData.id || vehicleData.vehicleType || '').trim(),
        name: String(vehicleData.name || vehicleData.vehicleType || '').trim() || 'Unnamed Vehicle',
        capacity: Number(vehicleData.capacity) || 4,
        luggageCapacity: Number(vehicleData.luggageCapacity) || 2,
        ac: Boolean(vehicleData.ac !== undefined ? vehicleData.ac : true),
        image: String(vehicleData.image || '/cars/sedan.png').trim(),
        amenities: Array.isArray(vehicleData.amenities) ? vehicleData.amenities.map(a => String(a).trim()) : 
                  (typeof vehicleData.amenities === 'string' ? vehicleData.amenities.split(',').map(a => a.trim()) : ['AC']),
        description: String(vehicleData.description || '').trim(),
        isActive: Boolean(vehicleData.isActive !== undefined ? vehicleData.isActive : true),
        basePrice: Number(vehicleData.basePrice) || 0,
        pricePerKm: Number(vehicleData.pricePerKm) || 0,
        nightHaltCharge: Number(vehicleData.nightHaltCharge) || 0,
        driverAllowance: Number(vehicleData.driverAllowance) || 0,
        id: String(vehicleData.vehicleId || vehicleData.id || vehicleData.vehicleType || '').trim() // Include id for compatibility
      };
      
      console.log("Sending sanitized data to API:", sanitizedData);
      
      // Try multiple update methods with retry logic
      let success = false;
      
      // Method 1: Using updateVehicle endpoint
      try {
        const response = await fareAPI.updateVehicle(sanitizedData);
        if (response) {
          console.log("Successfully updated vehicle using primary endpoint", response);
          success = true;
        }
      } catch (err) {
        console.error("Error with vehicle update endpoint:", err);
        // Continue to next method
      }
      
      // Method 2: Direct API call with different format if first method failed
      if (!success) {
        try {
          // Wait briefly before trying the next method
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const formData = new FormData();
          Object.entries(sanitizedData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              formData.append(key, JSON.stringify(value));
            } else if (typeof value === 'boolean') {
              formData.append(key, value ? '1' : '0');
            } else {
              formData.append(key, String(value));
            }
          });
          
          const response = await fetch('/api/admin/vehicles-update.php', {
            method: 'POST',
            body: formData,
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          
          const result = await response.json();
          console.log("Direct API response:", result);
          
          if (response.ok && result && result.status !== 'error') {
            console.log("Successfully updated vehicle using direct API call");
            success = true;
          } else {
            throw new Error(result?.message || 'Unknown error');
          }
        } catch (err) {
          console.error("Error with direct API call:", err);
          // Continue to next method
        }
      }
      
      // Method 3: Try the vehicles.php endpoint as a last resort
      if (!success) {
        try {
          // Wait briefly before trying the last method
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const response = await fetch('/api/fares/vehicles.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(sanitizedData)
          });
          
          const result = await response.json();
          console.log("vehicles.php endpoint response:", result);
          
          if (response.ok && result && result.status !== 'error') {
            console.log("Successfully updated vehicle using vehicles.php endpoint");
            success = true;
          } else {
            throw new Error(result?.message || 'Unknown error');
          }
        } catch (err) {
          console.error("Error with vehicles.php endpoint:", err);
          success = false;
          
          // Show detailed error to help with debugging
          if (err instanceof Error) {
            toast.error(`Failed to update: ${err.message}`, { duration: 5000 });
          } else {
            toast.error("Failed to update vehicle: Server error", { duration: 5000 });
          }
        }
      }
      
      // Clear cache to ensure fresh data on next fetch
      this.clearCache();
      
      // Also clear cached data in localStorage/sessionStorage
      localStorage.removeItem('cabFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('calculatedFares');
      
      if (success) {
        toast.success("Vehicle updated successfully");
      }
      
      // Return success
      return success;
    } catch (error) {
      console.error('Error updating vehicle pricing:', error);
      toast.error("Failed to update vehicle data");
      return false;
    }
  }
}

// Export a singleton instance
export const fareService = FareService.getInstance();
