
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
      console.log("Refreshing cab types from the API");
      
      // First try to get data from vehicles.php endpoint
      let vehiclesResponse;
      try {
        vehiclesResponse = await fareAPI.getVehicles();
        console.log("Raw vehicles API response:", typeof vehiclesResponse === 'string' ? vehiclesResponse.substring(0, 200) + '...' : vehiclesResponse);
      } catch (error) {
        console.error("Error fetching from vehicles.php, trying getAllVehicleData:", error);
        // Use getAllVehicleData as backup
        vehiclesResponse = await fareAPI.getAllVehicleData();
      }
      
      // Add extra type safety to prevent errors
      if (!vehiclesResponse) {
        console.warn('No vehicles returned from API');
        throw new Error('Failed to load vehicles from server');
      }
      
      // Normalize the response to ensure we get an array
      const vehicleArray = this.normalizeApiResponse(vehiclesResponse);
      
      if (vehicleArray.length === 0) {
        console.warn('No vehicles found in API response');
        throw new Error('No vehicles found in server response');
      }
      
      console.log(`Successfully loaded ${vehicleArray.length} vehicles from API`);
      
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
      
      return cabTypes;
    } catch (error) {
      console.error('Error refreshing cab types:', error);
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
  
  // Update vehicle pricing in the backend
  public async updateVehiclePricing(vehicleData: any): Promise<boolean> {
    try {
      console.log("Updating vehicle pricing:", vehicleData);
      
      // Ensure all required fields are present
      const requiredFields = ['vehicleType', 'basePrice', 'pricePerKm'];
      const missingFields = requiredFields.filter(field => {
        // Handle special case for vehicleType which might be in vehicleId
        if (field === 'vehicleType' && vehicleData.vehicleId) {
          return false;
        }
        return vehicleData[field] === undefined || vehicleData[field] === null;
      });
      
      if (missingFields.length > 0) {
        console.error(`Missing required fields: ${missingFields.join(', ')}`);
        toast.error(`Cannot update: Missing ${missingFields.join(', ')}`);
        return false;
      }
      
      // Create a sanitized copy of the vehicle data with proper type conversions
      const sanitizedData = {
        vehicleId: String(vehicleData.vehicleId || vehicleData.id || vehicleData.vehicleType || ''),
        name: String(vehicleData.name || vehicleData.vehicleType || ''),
        capacity: Number(vehicleData.capacity) || 4,
        luggageCapacity: Number(vehicleData.luggageCapacity) || 2,
        ac: Boolean(vehicleData.ac !== undefined ? vehicleData.ac : true),
        image: String(vehicleData.image || '/cars/sedan.png'),
        amenities: Array.isArray(vehicleData.amenities) ? vehicleData.amenities : [],
        description: String(vehicleData.description || ''),
        isActive: Boolean(vehicleData.isActive !== undefined ? vehicleData.isActive : true),
        basePrice: Number(vehicleData.basePrice) || 0,
        pricePerKm: Number(vehicleData.pricePerKm) || 0,
        nightHaltCharge: Number(vehicleData.nightHaltCharge) || 0,
        driverAllowance: Number(vehicleData.driverAllowance) || 0,
        id: String(vehicleData.vehicleId || vehicleData.id || vehicleData.vehicleType || '') // Include id for compatibility
      };
      
      console.log("Sending sanitized data to API:", sanitizedData);
      
      // Try with updateVehicle endpoint
      let success = false;
      let error = null;
      
      try {
        await fareAPI.updateVehicle(sanitizedData);
        success = true;
      } catch (err) {
        error = err;
        console.error("Error with vehicle update endpoint:", err);
        success = false;
      }
      
      // If first attempt failed, try again with a slight delay
      if (!success) {
        // Wait a brief moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          console.log("Retrying vehicle update with the same endpoint");
          await fareAPI.updateVehicle(sanitizedData);
          success = true;
        } catch (retryErr) {
          error = retryErr;
          console.error("Error with retry attempt:", retryErr);
          
          // Show the specific error to help with debugging
          if (retryErr instanceof Error) {
            toast.error(`API Error: ${retryErr.message}`, { duration: 5000 });
          } else {
            toast.error("Failed to update vehicle: Server error", { duration: 5000 });
          }
          
          return false;
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
