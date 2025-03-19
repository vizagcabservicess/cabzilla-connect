
import { CabType, FareCalculationParams } from '@/types/cab';
import { calculateFare } from '@/lib/fareCalculationService';
import { differenceInDays } from 'date-fns';
import { TripType, TripMode } from '@/lib/tripTypes';
import { fareAPI } from '@/services/api';
import { toast } from 'sonner';

// In-memory cache for fare calculations
type FareCache = Map<string, { expire: number, fare: number }>;

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
      const vehicles = await fareAPI.getVehicles();
      
      // Add extra type safety to prevent errors
      if (!vehicles) {
        console.warn('No vehicles returned from API');
        throw new Error('Failed to load vehicles from server');
      }
      
      // Ensure we have an array of vehicles
      let vehicleArray: any[] = [];
      
      if (Array.isArray(vehicles)) {
        vehicleArray = vehicles;
      } else if (typeof vehicles === 'object') {
        // Try to extract vehicles from various properties
        if (vehicles.vehicles && Array.isArray(vehicles.vehicles)) {
          vehicleArray = vehicles.vehicles;
        } else if (vehicles.data && Array.isArray(vehicles.data)) {
          vehicleArray = vehicles.data;
        } else {
          // Try to extract vehicle objects from the response
          const extractedVehicles = Object.values(vehicles).filter(
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
          id: vehicle.id || vehicle.vehicleId || '',
          name: vehicle.name || '',
          capacity: vehicle.capacity || 4,
          luggageCapacity: vehicle.luggageCapacity || vehicle.luggage_capacity || 2,
          price: vehicle.basePrice || vehicle.price || 0,
          pricePerKm: vehicle.pricePerKm || 0,
          image: vehicle.image || '/cars/sedan.png',
          amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
          description: vehicle.description || '',
          ac: vehicle.ac !== undefined ? vehicle.ac : true,
          nightHaltCharge: vehicle.nightHaltCharge || 0,
          driverAllowance: vehicle.driverAllowance || 0,
          isActive: vehicle.isActive !== undefined ? vehicle.isActive : true
        }))
        .filter(cab => cab.isActive); // Only return active cabs
      
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
      // Send updated pricing to backend
      await fareAPI.updateVehicle(vehicleData);
      
      // Clear cache to ensure fresh data on next fetch
      this.clearCache();
      
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
