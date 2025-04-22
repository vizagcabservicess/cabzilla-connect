import { useState, useCallback } from 'react';
import axios from 'axios';

type FareBreakdown = Record<string, number>;

interface FareData {
  basePrice: number;
  totalPrice: number;
  breakdown: FareBreakdown;
}

interface FareResponse {
  fareData: FareData;
  calculatedFare: number;
  normalizedId: string;
  tripType: string;
  packageType?: string;
}

/**
 * Normalize vehicle ID to match database format
 * Converts to lowercase and replaces non-alphanumeric with underscore
 */
const normalizeVehicleId = (id: string): string => {
  if (!id) return '';
  return id.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

/**
 * Hook to fetch and calculate fares based on trip type and vehicle
 */
export function useFare() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch Local Trip Fares
   */
  const getLocalFaresForVehicle = useCallback(async (vehicleId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching local fares for vehicle ${vehicleId} with timestamp: ${Date.now()}`);
      const normalizedId = normalizeVehicleId(vehicleId);
      
      const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const url = `${domain}/api/admin/direct-local-fares.php?vehicle_id=${normalizedId}&_t=${Date.now()}`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      const data = response.data;
      
      console.log(`Local fares for vehicle ${normalizedId}:`, data);
      
      if (data?.source) {
        console.log(`Source table: ${data.source}`);
      } else {
        console.log(`Source not specified in response`);
      }
      
      if (data && data.fares && data.fares.length > 0) {
        // Find the matching fare entry for this vehicle
        const matchingFare = data.fares.find((fare: any) => 
          normalizeVehicleId(fare.vehicleId) === normalizedId
        );
        
        if (matchingFare) {
          console.log(`Found local package fare for ${normalizedId}: ${matchingFare.price8hrs80km}`);
          return matchingFare;
        } else {
          console.log(`No matching fare found in response for ${normalizedId}`);
        }
      } else {
        console.log(`No fares array in response or empty fares array`);
      }
      
      return {
        price4hrs40km: 0,
        price8hrs80km: 0,
        price10hrs100km: 0
      };
    } catch (err) {
      console.error('Error fetching local fares:', err);
      setError('Failed to fetch local fares');
      return {
        price4hrs40km: 0,
        price8hrs80km: 0,
        price10hrs100km: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch Outstation Trip Fares
   */
  const getOutstationFaresForVehicle = useCallback(async (vehicleId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const normalizedId = normalizeVehicleId(vehicleId);
      
      const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const url = `${domain}/api/direct-outstation-fares.php?vehicle_id=${normalizedId}&_t=${Date.now()}`;
      
      const response = await axios.get(url);
      const data = response.data;
      
      console.log(`Outstation fares for vehicle ${normalizedId}:`, data);
      
      if (data && data.fare) {
        return data.fare;
      }
      
      return {
        base_price: 0,
        price_per_km: 0,
        driver_allowance: 0
      };
    } catch (err) {
      console.error('Error fetching outstation fares:', err);
      setError('Failed to fetch outstation fares');
      return {
        base_price: 0,
        price_per_km: 0,
        driver_allowance: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch Airport Trip Fares
   */
  const getAirportFaresForVehicle = useCallback(async (vehicleId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const normalizedId = normalizeVehicleId(vehicleId);
      
      const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const url = `${domain}/api/direct-airport-fares.php?vehicle_id=${normalizedId}&_t=${Date.now()}`;
      
      const response = await axios.get(url);
      const data = response.data;
      
      console.log(`Airport fares for vehicle ${normalizedId}:`, data);
      
      if (data && data.fare) {
        return data.fare;
      }
      
      return {
        base_price: 0,
        pickup_price: 0,
        drop_price: 0
      };
    } catch (err) {
      console.error('Error fetching airport fares:', err);
      setError('Failed to fetch airport fares');
      return {
        base_price: 0,
        pickup_price: 0,
        drop_price: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Main fare calculation function that calls the appropriate API based on trip type
   */
  const fetchFare = useCallback(async (
    vehicleId: string,
    tripType: string,
    distance: number = 0,
    packageType: string = '8hrs-80km'
  ): Promise<FareResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const normalizedId = normalizeVehicleId(vehicleId);
      let fareData: FareData = {
        basePrice: 0,
        totalPrice: 0,
        breakdown: {}
      };

      if (tripType === 'local') {
        const localFare = await getLocalFaresForVehicle(vehicleId);
        
        // Determine which package to use
        let packagePrice = 0;
        if (packageType.includes('4hrs') || packageType.includes('4hr') || packageType.includes('04hrs')) {
          packagePrice = localFare.price4hrs40km || 0;
          fareData.breakdown = {
            packageLabel: 1, 
            basePrice: packagePrice,
            extraDistanceFare: 0,
            extraKmCharge: localFare.priceExtraKm || 14,
            extraHourCharge: localFare.priceExtraHour || 300
          };
        } else if (packageType.includes('10hrs') || packageType.includes('10hr')) {
          packagePrice = localFare.price10hrs100km || 0;
          fareData.breakdown = {
            packageLabel: 2, 
            basePrice: packagePrice,
            extraDistanceFare: 0,
            extraKmCharge: localFare.priceExtraKm || 14,
            extraHourCharge: localFare.priceExtraHour || 300
          };
        } else {
          // Default to 8hrs-80km
          packagePrice = localFare.price8hrs80km || 0;
          fareData.breakdown = {
            packageLabel: 3, 
            basePrice: packagePrice,
            extraDistanceFare: 0,
            extraKmCharge: localFare.priceExtraKm || 14,
            extraHourCharge: localFare.priceExtraHour || 300
          };
        }
        
        // Use totalPrice from API if available, else use the package price
        fareData.basePrice = packagePrice;
        fareData.totalPrice = localFare.totalPrice ? Number(localFare.totalPrice) : packagePrice;
        
        console.log(`Using local package fare for ${vehicleId}: ₹${fareData.totalPrice}`);
      } else if (tripType === 'outstation') {
        const outstationFare = await getOutstationFaresForVehicle(vehicleId);
        
        // Calculate total if not provided directly
        const baseFare = outstationFare.base_price || 0;
        const pricePerKm = outstationFare.price_per_km || 0;
        const driverAllowance = outstationFare.driver_allowance || 0;
        
        let totalPrice = outstationFare.total_price ? Number(outstationFare.total_price) : 0;
        if (!totalPrice && distance > 0) {
          totalPrice = baseFare + (distance * pricePerKm) + driverAllowance;
        }
        
        fareData = {
          basePrice: baseFare,
          totalPrice: totalPrice,
          breakdown: {
            basePrice: baseFare,
            pricePerKm: pricePerKm,
            distanceCharge: distance * pricePerKm,
            driverAllowance: driverAllowance
          }
        };
        
        console.log(`Using outstation fare for ${vehicleId}: ₹${fareData.totalPrice}`);
      } else if (tripType === 'airport') {
        const airportFare = await getAirportFaresForVehicle(vehicleId);
        
        // Calculate total if not provided directly
        const basePrice = airportFare.base_price || 0;
        const pickupPrice = airportFare.pickup_price || 0;
        const dropPrice = airportFare.drop_price || 0;
        
        let totalPrice = airportFare.total_price ? Number(airportFare.total_price) : 0;
        if (!totalPrice) {
          totalPrice = basePrice + pickupPrice + dropPrice;
        }
        
        fareData = {
          basePrice: basePrice,
          totalPrice: totalPrice,
          breakdown: {
            basePrice: basePrice,
            pickupPrice: pickupPrice,
            dropPrice: dropPrice
          }
        };
        
        console.log(`Using airport fare for ${vehicleId}: ₹${fareData.totalPrice}`);
      }

      console.log(`Fare for ${vehicleId}:`, { fareData, calculatedFare: fareData.totalPrice, normalizedId, tripType, packageType });
      
      // Trigger an event to notify that a fare has been calculated
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: vehicleId,
          tripType: tripType,
          fare: fareData.totalPrice,
          calculated: true,
          timestamp: Date.now()
        }
      }));
      
      return {
        fareData,
        calculatedFare: fareData.totalPrice,
        normalizedId,
        tripType,
        packageType
      };
    } catch (error) {
      console.error(`Error calculating fare for ${vehicleId}:`, error);
      setError('Failed to calculate fare');
      
      return {
        fareData: {
          basePrice: 0,
          totalPrice: 0,
          breakdown: {}
        },
        calculatedFare: 0,
        normalizedId: normalizeVehicleId(vehicleId),
        tripType,
        packageType
      };
    } finally {
      setIsLoading(false);
    }
  }, [getLocalFaresForVehicle, getOutstationFaresForVehicle, getAirportFaresForVehicle]);

  return {
    fetchFare,
    getLocalFaresForVehicle,
    getOutstationFaresForVehicle,
    getAirportFaresForVehicle,
    isLoading,
    error,
    normalizeVehicleId
  };
}
