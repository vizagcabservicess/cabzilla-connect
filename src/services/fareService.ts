
import { CabType, FareCalculationParams } from '@/types/cab';
import { calculateFare } from '@/lib/fareCalculationService';
import { differenceInDays } from 'date-fns';
import { TripType, TripMode } from '@/lib/tripTypes';
import { fareAPI } from '@/services/api';
import { toast } from 'sonner';
import axios from 'axios';

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
      
      // Clean vehicle IDs to ensure no item- prefixes
      const cleanVehicleId = (id: string | undefined): string => {
        if (!id) return '';
        
        // Remove 'item-' prefix if it exists
        if (id.startsWith('item-')) {
          return id.substring(5);
        }
        
        return id;
      };
      
      // Map the vehicles to CabType format with safe defaults for all fields
      const cabTypes: CabType[] = vehicleArray
        .filter(vehicle => vehicle && typeof vehicle === 'object')
        .map(vehicle => {
          const rawVehicleId = vehicle.id || vehicle.vehicleId || vehicle.vehicle_id || '';
          const cleanedId = cleanVehicleId(String(rawVehicleId));
          
          return {
            id: cleanedId,
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
            vehicleId: cleanedId, // Store the cleaned ID
            basePrice: Number(vehicle.basePrice || vehicle.price || vehicle.base_price) || 4200
          };
        })
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
      
      // Clean the vehicle ID
      const cleanVehicleId = (id: string | undefined): string => {
        if (!id) return '';
        
        // Remove 'item-' prefix if it exists
        if (id.startsWith('item-')) {
          return id.substring(5);
        }
        
        return id;
      };
      
      // Create a sanitized copy of the vehicle data with proper type conversions
      const sanitizedData = {
        vehicleId: cleanVehicleId(vehicleData.vehicleId || vehicleData.id || vehicleData.vehicleType),
        tripType: 'base',
        basePrice: parseFloat(vehicleData.basePrice),
        pricePerKm: parseFloat(vehicleData.pricePerKm),
        nightHaltCharge: parseFloat(vehicleData.nightHaltCharge || 0),
        driverAllowance: parseFloat(vehicleData.driverAllowance || 0)
      };
      
      // Try using vehicle-pricing.php endpoint first
      try {
        console.log("Trying to update using vehicle-pricing endpoint");
        const response = await fetch('/api/admin/vehicle-pricing.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          },
          body: JSON.stringify(sanitizedData)
        });
        
        const data = await response.json();
        console.log("Vehicle pricing update response:", data);
        
        if (data.status === 'success') {
          toast.success("Vehicle pricing updated successfully");
          return true;
        } else {
          console.warn("Failed to update vehicle pricing using primary endpoint:", data);
          // Continue to fallback method
        }
      } catch (error) {
        console.error("Error updating with primary endpoint:", error);
        // Continue to fallback method
      }
      
      // Fallback to fares-update.php endpoint
      try {
        console.log("Trying fallback endpoint for vehicle update");
        const fallbackData = {
          ...sanitizedData,
          vehicleType: sanitizedData.vehicleId,
          price: sanitizedData.basePrice
        };
        
        const response = await fetch('/api/admin/fares-update.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          },
          body: JSON.stringify(fallbackData)
        });
        
        const data = await response.json();
        console.log("Fallback update response:", data);
        
        if (data.status === 'success' || (typeof data === 'object' && data !== null)) {
          toast.success("Vehicle pricing updated using fallback method");
          return true;
        } else {
          console.warn("Failed to update vehicle pricing using fallback endpoint:", data);
          toast.error("Failed to update vehicle pricing");
          return false;
        }
      } catch (error) {
        console.error("Error updating with fallback endpoint:", error);
        toast.error("All update methods failed");
        return false;
      }
    } catch (error) {
      console.error("Error in vehicle pricing update:", error);
      toast.error("Failed to update vehicle pricing");
      return false;
    }
  }
  
  // Update trip fares in the backend with fallback logic
  public async updateTripFares(vehicleId: string, tripType: string, fareData: any): Promise<boolean> {
    try {
      if (!vehicleId || !tripType) {
        throw new Error("Vehicle ID and trip type are required");
      }
      
      console.log(`Updating ${tripType} fares for vehicle ${vehicleId}:`, fareData);
      
      // Clean the vehicle ID
      const cleanVehicleId = (id: string): string => {
        // Remove 'item-' prefix if it exists
        if (id.startsWith('item-')) {
          return id.substring(5);
        }
        return id;
      };
      
      const cleanedVehicleId = cleanVehicleId(vehicleId);
      
      // Prepare the request data based on trip type
      let requestData: any = {
        vehicleId: cleanedVehicleId,
        tripType: tripType.includes('-') ? tripType.split('-')[0] : tripType
      };
      
      // Add fare specific fields based on trip type
      if (tripType === 'outstation-one-way' || tripType === 'outstation-round-trip' || tripType === 'airport') {
        requestData = {
          ...requestData,
          basePrice: parseFloat(fareData.basePrice) || 0,
          pricePerKm: parseFloat(fareData.pricePerKm) || 0
        };
        
        if (tripType === 'airport' && fareData.airportFee !== undefined) {
          requestData.airportFee = parseFloat(fareData.airportFee) || 0;
        }
      } else if (tripType === 'local') {
        requestData = {
          ...requestData,
          price8hrs80km: parseFloat(fareData.hr8km80Price) || 0,
          price10hrs100km: parseFloat(fareData.hr10km100Price) || 0,
          priceExtraKm: parseFloat(fareData.extraKmRate) || 0,
          priceExtraHour: 0 // Default value
        };
      }
      
      console.log("Sending trip fare update request:", requestData);
      
      // Try first endpoint
      try {
        const response = await fetch('/api/admin/vehicle-pricing.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          },
          body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
          return true;
        } else {
          throw new Error(data.message || "Unknown API error");
        }
      } catch (primaryError) {
        console.error("Error with primary endpoint:", primaryError);
        
        // Try fallback endpoint
        try {
          console.log("Trying fallback endpoint for fare update");
          
          // Modify request data for fallback endpoint
          let fallbackData: any = {
            ...requestData,
            vehicleType: cleanedVehicleId
          };
          
          // Adjust keys for the fallback endpoint
          if (tripType === 'local') {
            fallbackData = {
              ...fallbackData,
              hr8km80Price: fallbackData.price8hrs80km,
              hr10km100Price: fallbackData.price10hrs100km,
              extraKmRate: fallbackData.priceExtraKm
            };
          }
          
          const fallbackResponse = await fetch('/api/admin/fares-update.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify(fallbackData)
          });
          
          const fallbackData2 = await fallbackResponse.json();
          
          if (fallbackData2.status === 'success' || (typeof fallbackData2 === 'object' && fallbackData2 !== null)) {
            return true;
          } else {
            throw new Error("Fallback endpoint also failed");
          }
        } catch (fallbackError) {
          console.error("Error with fallback endpoint:", fallbackError);
          throw new Error("All update methods failed");
        }
      }
    } catch (error: any) {
      console.error("Error updating trip fares:", error);
      toast.error(error.message || "Failed to update trip fares");
      return false;
    }
  }
}

// Export singleton instance
export const fareService = FareService.getInstance();
