import { CabType, FareCalculationParams } from '@/types/cab';
import { calculateFare } from '@/lib/fareCalculationService';
import { differenceInDays } from 'date-fns';
import { TripType, TripMode } from '@/lib/tripTypes';
import { fareAPI } from '@/services/api';
import { toast } from 'sonner';

// In-memory cache for fare calculations
type FareCache = Map<string, { expire: number, fare: number }>;

// Define a type for API responses to handle different response formats
type ApiResponse = {
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
  
  // Refresh cab types from the backend
  public async refreshCabTypes(): Promise<CabType[]> {
    try {
      console.log("Refreshing cab types from the API");
      
      // First try to get data from vehicles.php endpoint
      let vehiclesResponse;
      try {
        vehiclesResponse = await fareAPI.getVehicles() as ApiResponse | any[];
        console.log("Raw vehicles API response:", typeof vehiclesResponse === 'string' ? vehiclesResponse.substring(0, 200) + '...' : vehiclesResponse);
      } catch (error) {
        console.error("Error fetching from vehicles.php, trying getAllVehicleData:", error);
        // Use getAllVehicleData instead of getVehiclesData
        vehiclesResponse = await fareAPI.getAllVehicleData() as any[] | ApiResponse;
      }
      
      // Add extra type safety to prevent errors
      if (!vehiclesResponse) {
        console.warn('No vehicles returned from API');
        throw new Error('Failed to load vehicles from server');
      }
      
      // Ensure we have an array of vehicles
      let vehicleArray: any[] = [];
      
      if (Array.isArray(vehiclesResponse)) {
        vehicleArray = vehiclesResponse;
      } else if (typeof vehiclesResponse === 'object') {
        // Try to extract vehicles from various properties
        if (vehiclesResponse.vehicles && Array.isArray(vehiclesResponse.vehicles)) {
          vehicleArray = vehiclesResponse.vehicles;
        } else if (vehiclesResponse.data && Array.isArray(vehiclesResponse.data)) {
          vehicleArray = vehiclesResponse.data;
        } else {
          // Try to extract vehicle objects from the response
          const extractedVehicles = Object.values(vehiclesResponse).filter(
            val => val && typeof val === 'object' && !Array.isArray(val)
          );
          
          if (extractedVehicles.length > 0) {
            vehicleArray = extractedVehicles;
          }
        }
      }
      
      if (vehicleArray.length === 0) {
        console.warn('No vehicles found in API response');
        throw new Error('No vehicles found in server response');
      }
      
      console.log(`Successfully loaded ${vehicleArray.length} vehicles from API`);
      
      // Clear fare cache when vehicles are refreshed
      this.clearCache();
      
      // Map the vehicles to CabType format
      const cabTypes: CabType[] = vehicleArray
        .map(vehicle => ({
          id: vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || '',
          name: vehicle.name || '',
          capacity: vehicle.capacity || 4,
          luggageCapacity: vehicle.luggageCapacity || vehicle.luggage_capacity || 2,
          price: vehicle.basePrice || vehicle.price || vehicle.base_price || 0,
          pricePerKm: vehicle.pricePerKm || vehicle.price_per_km || 0,
          image: vehicle.image || '/cars/sedan.png',
          amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
          description: vehicle.description || '',
          ac: vehicle.ac !== undefined ? vehicle.ac : true,
          nightHaltCharge: vehicle.nightHaltCharge || vehicle.night_halt_charge || 0,
          driverAllowance: vehicle.driverAllowance || vehicle.driver_allowance || 0,
          isActive: vehicle.isActive !== undefined ? vehicle.isActive : 
                    (vehicle.is_active !== undefined ? vehicle.is_active : true)
        }))
        .filter(cab => cab.isActive && cab.id); // Only return active cabs with valid IDs
      
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
    const fare = await calculateFare(params);
    
    // Store in cache
    this.fareCache.set(cacheKey, {
      expire: Date.now() + this.cacheExpiryMs,
      fare
    });
    
    return fare;
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
        return { id: cab.id, fare: 0 };
      }
    });
    
    const results = await Promise.all(farePromises);
    
    results.forEach(result => {
      fares[result.id] = result.fare;
    });
    
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
      const requiredFields = ['vehicleId', 'name', 'basePrice', 'pricePerKm'];
      const missingFields = requiredFields.filter(field => !vehicleData[field]);
      
      if (missingFields.length > 0) {
        console.error(`Missing required fields: ${missingFields.join(', ')}`);
        toast.error(`Cannot update: Missing ${missingFields.join(', ')}`);
        return false;
      }
      
      // Create a sanitized copy of the vehicle data
      const sanitizedData = {
        vehicleId: vehicleData.vehicleId || vehicleData.id,
        name: vehicleData.name,
        capacity: parseInt(vehicleData.capacity) || 4,
        luggageCapacity: parseInt(vehicleData.luggageCapacity) || 2,
        ac: vehicleData.ac !== undefined ? vehicleData.ac : true,
        image: vehicleData.image || '/cars/sedan.png',
        amenities: Array.isArray(vehicleData.amenities) ? vehicleData.amenities : [],
        description: vehicleData.description || '',
        isActive: vehicleData.isActive !== undefined ? vehicleData.isActive : true,
        basePrice: parseFloat(vehicleData.basePrice) || 0,
        pricePerKm: parseFloat(vehicleData.pricePerKm) || 0,
        nightHaltCharge: parseFloat(vehicleData.nightHaltCharge) || 0,
        driverAllowance: parseFloat(vehicleData.driverAllowance) || 0,
      };
      
      // Try using both endpoints for better compatibility
      try {
        await fareAPI.updateVehicle(sanitizedData);
      } catch (error) {
        console.error("Error with primary endpoint, trying alternative endpoint:", error);
        // Use updateVehicle again instead of adminUpdateVehicle which doesn't exist
        await fareAPI.updateVehicle(sanitizedData);
      }
      
      // Clear cache to ensure fresh data on next fetch
      this.clearCache();
      
      // Also clear cached data in localStorage/sessionStorage
      localStorage.removeItem('cabFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('calculatedFares');
      
      // Return success
      return true;
    } catch (error) {
      console.error('Error updating vehicle pricing:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const fareService = FareService.getInstance();
