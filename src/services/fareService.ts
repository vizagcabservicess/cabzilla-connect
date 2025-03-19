
import { CabType, FareCalculationParams } from '@/types/cab';
import { calculateFare } from '@/lib/fareCalculationService';
import { differenceInDays } from 'date-fns';
import { TripType, TripMode } from '@/lib/tripTypes';

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
}

// Export a singleton instance
export const fareService = FareService.getInstance();
