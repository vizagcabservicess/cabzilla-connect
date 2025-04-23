import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { getLocalFaresForVehicle, getOutstationFaresForVehicle } from '@/services/fareService';
import { normalizeVehicleId } from '@/utils/safeStringUtils';
import { CabType } from '@/types/cab';
import { cabTypes } from '@/lib/cabData';
import { debounce } from '@/lib/utils';

interface FareBreakdown {
  basePrice?: number;
  driverAllowance?: number;
  nightCharges?: number;
  extraDistanceFare?: number;
  packageLabel?: string;
  extraKmCharge?: number;
  extraHourCharge?: number;
}

interface FareData {
  totalPrice: number;
  basePrice: number;
  breakdown: FareBreakdown;
  source?: string;
  timestamp?: number;
}

export function useFare(
  cabId: string, 
  tripType: string, 
  distance: number, 
  packageType: string = '',
  pickupDate?: Date
) {
  console.log(`useFare: Called for ${cabId} with package ${packageType}`);
  
  const [fareData, setFareData] = useState<FareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const storeFareData = (key: string, fare: number, source: string, breakdown: FareBreakdown) => {
    try {
      const fareData = {
        fare,
        source,
        breakdown,
        packageType,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(fareData));
      console.log(`Stored fare data in localStorage: ${key} = ${fare} (source: ${source}, package: ${packageType})`);
    } catch (e) {
      console.error('Error storing fare in localStorage:', e);
    }
  };

  const clearStaleFares = () => {
    try {
      const now = Date.now();
      const thirtyMinutesAgo = now - 30 * 60 * 1000;
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('fare_')) {
          const fareJson = localStorage.getItem(key);
          if (fareJson) {
            try {
              const fareObj = JSON.parse(fareJson);
              if (fareObj.timestamp && fareObj.timestamp < thirtyMinutesAgo) {
                localStorage.removeItem(key);
                console.log(`Cleared stale fare data: ${key}`);
              }
            } catch (e) {
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (e) {
      console.error('Error clearing stale fares:', e);
    }
  };

  const getStoredFare = (key: string): { fare: number, source: string, breakdown: FareBreakdown } | null => {
    try {
      const fareJson = localStorage.getItem(key);
      if (fareJson) {
        try {
          const fareObj = JSON.parse(fareJson);
          
          if (typeof fareObj.fare === 'number' && fareObj.fare > 0) {
            return {
              fare: fareObj.fare,
              source: fareObj.source || 'stored',
              breakdown: fareObj.breakdown || { basePrice: fareObj.fare }
            };
          }
        } catch (e) {
          console.error('Error parsing stored fare:', e);
          localStorage.removeItem(key);
        }
      }
      return null;
    } catch (e) {
      console.error('Error retrieving fare from localStorage:', e);
      return null;
    }
  };

  const validateFareAmount = (fare: number, cabId: string, tripType: string): boolean => {
    if (isNaN(fare) || fare <= 0) return false;
    
    let minFare = 500;
    let maxFare = 20000;
    
    const normalizedId = normalizeVehicleId(cabId);
    
    if (normalizedId.includes('sedan')) {
      minFare = tripType === 'local' ? 1000 : 2000;
      maxFare = 8000;
    } else if (normalizedId.includes('ertiga') || normalizedId.includes('suv')) {
      minFare = tripType === 'local' ? 1500 : 2500;
      maxFare = 12000;
    } else if (normalizedId.includes('innova') || normalizedId.includes('crysta') || normalizedId.includes('mpv')) {
      minFare = tripType === 'local' ? 2000 : 3000;
      maxFare = 15000;
    } else if (normalizedId.includes('luxury')) {
      minFare = tripType === 'local' ? 3000 : 4000;
      maxFare = 20000;
    }
    
    if (fare < minFare) {
      console.warn(`Fare value too low: ${fare} for ${cabId} (${tripType}). Minimum expected: ${minFare}`);
      return false;
    }
    
    if (fare > maxFare) {
      console.warn(`Fare value too high: ${fare} for ${cabId} (${tripType}). Maximum expected: ${maxFare}`);
      return false;
    }
    
    return true;
  };

  const debouncedDispatchEvent = debounce((detail: any) => {
    window.dispatchEvent(new CustomEvent('fare-calculated', { detail }));
  }, 100);

  useEffect(() => {
    clearStaleFares();
    
    const calculateFareData = async () => {
      if (!cabId) return;

      setIsLoading(true);
      setError(null);

      const normalizedCabId = normalizeVehicleId(cabId);
      const fareKey = `fare_${tripType}_${normalizedCabId}_${packageType}`;

      try {
        let fare: number = 0;
        let breakdown: FareBreakdown = {};
        let source = 'calculated';
        let databaseFareFound = false;

        if (tripType === 'outstation') {
          try {
            const outstationFares = await getOutstationFaresForVehicle(normalizedCabId);
            const baseKms = 300;
            let basePrice = outstationFares.basePrice || 0;
            let pricePerKm = outstationFares.pricePerKm || 0;
            let driverAllowance = outstationFares.driverAllowance ?? 250;
            let nightCharges = 0;
            let effectiveDistance = distance;

            if (packageType === 'one-way') {
              effectiveDistance = Math.max(distance * 2, baseKms);
              basePrice = outstationFares.basePrice || 0;
              pricePerKm = outstationFares.pricePerKm || 0;
            } else if (packageType === 'round-trip') {
              pricePerKm = outstationFares.roundTripPricePerKm || pricePerKm;
              basePrice = outstationFares.roundTripBasePrice || basePrice;
              effectiveDistance = Math.max(distance * 2, baseKms);
            } else {
              effectiveDistance = Math.max(distance * 2, baseKms);
            }

            let extraDistanceFare = 0;
            if (effectiveDistance > baseKms) {
              const extraKms = effectiveDistance - baseKms;
              extraDistanceFare = extraKms * pricePerKm;
            }

            fare = basePrice + extraDistanceFare + driverAllowance;

            if (
              pickupDate &&
              (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)
            ) {
              nightCharges = Math.round(basePrice * 0.1);
              fare += nightCharges;
            }

            breakdown = {
              basePrice,
              driverAllowance,
              nightCharges,
              extraDistanceFare,
              extraKmCharge: pricePerKm,
            };
            source = 'database';
            databaseFareFound = true;

            console.log(
              `[Outstation Calculation - ONE WAY] packageType=${packageType}, basePrice: ${basePrice}, effectiveDistance: ${effectiveDistance}, extraDistanceFare: ${extraDistanceFare}, driverAllowance: ${driverAllowance}, nightCharges: ${nightCharges}, TOTAL: ${fare}`
            );

            storeFareData(fareKey, fare, source, breakdown);
          } catch (e) {
            console.error('Error fetching outstation fares:', e);
          }
        } else if (tripType === 'local') {
          try {
            const localFares = await getLocalFaresForVehicle(normalizedCabId);
            
            const packageMap: Record<string, string> = {
              '8hrs-80km': 'price8hrs80km',
              '4hrs-40km': 'price4hrs40km',
              '10hrs-100km': 'price10hrs100km'
            };
            
            const key = packageMap[packageType];
            if (key && localFares[key] > 0) {
              const dbFare = localFares[key];
              console.log(`Found local package fare for ${cabId}: ${dbFare}`);
              
              if (validateFareAmount(dbFare, cabId, tripType)) {
                fare = dbFare;
                source = 'database';
                databaseFareFound = true;
                breakdown = {
                  basePrice: fare,
                  packageLabel: packageType,
                  extraDistanceFare: 0,
                  extraKmCharge: localFares.priceExtraKm || localFares.extra_km_charge || 0,
                  extraHourCharge: localFares.priceExtraHour || localFares.extra_hour_charge || 0
                };
                
                localStorage.removeItem(fareKey);
                
                storeFareData(fareKey, fare, source, breakdown);
              } else {
                console.warn(`Invalid database fare value for ${cabId}: ${dbFare}, will try calculation instead`);
              }
            }
          } catch (e) {
            console.error('Error fetching real-time local fares:', e);
          }
          
          if (!databaseFareFound) {
            const storedFare = getStoredFare(fareKey);
            if (storedFare && validateFareAmount(storedFare.fare, cabId, tripType)) {
              console.log(`Using stored fare for ${cabId}: ${storedFare.fare} (source: ${storedFare.source})`);
              fare = storedFare.fare;
              source = storedFare.source;
              breakdown = storedFare.breakdown;
            } else {
              console.log(`No valid stored fare for ${cabId}, calculating default`);
              if (normalizedCabId.includes('sedan')) fare = 2400;
              else if (normalizedCabId.includes('ertiga') || normalizedCabId.includes('suv')) fare = 3000;
              else if (normalizedCabId.includes('innova') || normalizedCabId.includes('crysta') || normalizedCabId.includes('mpv')) fare = 4000;
              else if (normalizedCabId.includes('luxury')) fare = 5000;
              else fare = 3000;
              
              source = 'default';
              breakdown = { basePrice: fare };
              
              storeFareData(fareKey, fare, source, breakdown);
            }
          }
        } else if (tripType === 'airport') {
          try {
            
          } catch (e) {
            console.error('Error fetching real-time airport fares:', e);
          }
        } else if (tripType === 'tour') {
          try {
            if (normalizedCabId.includes('sedan')) fare = 3500;
            else if (normalizedCabId.includes('ertiga') || normalizedCabId.includes('suv')) fare = 4500;
            else if (normalizedCabId.includes('innova') || normalizedCabId.includes('crysta') || normalizedCabId.includes('mpv')) fare = 5500;
            else fare = 4000;
            
            source = 'default';
            breakdown = { basePrice: fare };
            
            storeFareData(fareKey, fare, source, breakdown);
          } catch (e) {
            console.error('Error fetching real-time tour fares:', e);
          }
        } else {
          const fullCabType = cabTypes.find(cab => normalizeVehicleId(cab.id) === normalizedCabId);
          
          if (!fullCabType) {
            console.warn(`Could not find full cab type for ID: ${cabId}, creating minimal object`);
            const minimalCabType: CabType = {
              id: cabId,
              name: cabId,
              capacity: 4,
              luggageCapacity: 2,
              image: "/cars/sedan.png",
              amenities: ["AC"],
              description: "Default vehicle",
              ac: true
            };
            
            const params = {
              cabType: minimalCabType,
              tripType,
              distance
            };
            
            const result = await calculateFare(params);
            
            if (typeof result === 'number') {
              fare = result;
              breakdown = { basePrice: fare };
            } else {
              fare = result;
              breakdown = { basePrice: fare };
            }
            source = 'api';
          } else {
            console.log(`Found full cab type for ${cabId}:`, fullCabType.name);
            const params = {
              cabType: fullCabType,
              tripType,
              distance
            };
            
            const result = await calculateFare(params);
            
            if (typeof result === 'number') {
              fare = result;
              breakdown = { basePrice: fare };
            } else {
              fare = result;
              breakdown = { basePrice: fare };
            }
            source = 'api';
          }
          
          if (validateFareAmount(fare, cabId, tripType)) {
            storeFareData(fareKey, fare, source, breakdown);
          }
        }

        setFareData({
          totalPrice: fare,
          basePrice: breakdown.basePrice || fare,
          breakdown,
          source,
          timestamp: Date.now()
        });

        debouncedDispatchEvent({
          cabId: normalizedCabId,
          tripType,
          calculated: true,
          fare: fare,
          source,
          timestamp: Date.now()
        });

      } catch (err) {
        console.error(`Fare calculation error for ${cabId}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to calculate fare'));
      } finally {
        setIsLoading(false);
      }
    };

    calculateFareData();
  }, [cabId, tripType, distance, packageType, pickupDate, toast]);

  return { fareData, isLoading, error };
}
