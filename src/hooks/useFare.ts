
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { getLocalFaresForVehicle, getOutstationFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
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
  airportFee?: number;
}

interface FareData {
  totalPrice: number;
  basePrice: number;
  breakdown: FareBreakdown;
  source?: string;
  timestamp?: number;
  version?: string;
  checksum?: string;
}

// Minimum fare amounts to prevent invalid values
const MIN_FARES = {
  airport: 800,
  local: 1000,
  outstation: 2000,
  default: 500
};

// Current fare version - increment when calculation logic changes
const FARE_VERSION = '1.0.2';

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

  // Generate a checksum for fare data to detect tampering
  const generateFareChecksum = (cabId: string, tripType: string, fare: number): string => {
    const input = `${cabId}-${tripType}-${fare}-${FARE_VERSION}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  };

  const storeFareData = (key: string, fare: number, source: string, breakdown: FareBreakdown) => {
    if (!validateFareAmount(fare, cabId, tripType)) {
      console.warn(`Invalid fare value prevented from storage: ${fare} for ${cabId} (${tripType})`);
      return false;
    }

    try {
      const checksum = generateFareChecksum(cabId, tripType, fare);
      const fareData = {
        fare,
        source,
        breakdown,
        packageType,
        timestamp: Date.now(),
        version: FARE_VERSION,
        checksum
      };
      
      // Store in both storage mechanisms for redundancy
      localStorage.setItem(key, JSON.stringify(fareData));
      sessionStorage.setItem(key, JSON.stringify(fareData));
      
      console.log(`Stored fare data in localStorage: ${key} = ${fare} (source: ${source}, package: ${packageType})`);
      
      // Also store in alternative format for critical trip types
      if (tripType === 'airport' || tripType === 'outstation') {
        const backupKey = `${tripType}_fare_${normalizeVehicleId(cabId)}`;
        localStorage.setItem(backupKey, JSON.stringify(fareData));
      }
      
      return true;
    } catch (e) {
      console.error('Error storing fare in localStorage:', e);
      return false;
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
      // Try both storage mechanisms
      const fareJson = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (fareJson) {
        try {
          const fareObj = JSON.parse(fareJson);
          
          // Verify version and checksum if available
          if (fareObj.version && fareObj.version !== FARE_VERSION) {
            console.log(`Fare version mismatch: ${fareObj.version} vs ${FARE_VERSION}, recalculating`);
            return null;
          }
          
          if (fareObj.checksum) {
            const expectedChecksum = generateFareChecksum(cabId, tripType, fareObj.fare);
            if (fareObj.checksum !== expectedChecksum) {
              console.warn('Fare checksum mismatch, possible tampering detected');
              return null;
            }
          }
          
          if (typeof fareObj.fare === 'number' && fareObj.fare > 0 && validateFareAmount(fareObj.fare, cabId, tripType)) {
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
      
      // Try alternative storage format
      const backupKey = `${tripType}_fare_${normalizeVehicleId(cabId)}`;
      const backupJson = localStorage.getItem(backupKey);
      if (backupJson) {
        try {
          const backupObj = JSON.parse(backupJson);
          if (typeof backupObj.fare === 'number' && backupObj.fare > 0 && 
              validateFareAmount(backupObj.fare, cabId, tripType)) {
            return {
              fare: backupObj.fare,
              source: backupObj.source || 'backup',
              breakdown: backupObj.breakdown || { basePrice: backupObj.fare }
            };
          }
        } catch (e) {
          console.error('Error parsing backup fare:', e);
        }
      }
      
      return null;
    } catch (e) {
      console.error('Error retrieving fare from storage:', e);
      return null;
    }
  };

  const validateFareAmount = (fare: number, cabId: string, tripType: string): boolean => {
    if (isNaN(fare) || fare <= 0) return false;
    
    // Get minimum fare based on trip type
    let minFare = MIN_FARES[tripType as keyof typeof MIN_FARES] || MIN_FARES.default;
    let maxFare = 20000;
    
    const normalizedId = normalizeVehicleId(cabId);
    
    // Adjust min/max fares based on cab type
    if (normalizedId.includes('sedan')) {
      minFare = tripType === 'local' ? 1000 : (tripType === 'airport' ? 800 : 2000);
      maxFare = 8000;
    } else if (normalizedId.includes('ertiga') || normalizedId.includes('suv')) {
      minFare = tripType === 'local' ? 1500 : (tripType === 'airport' ? 1000 : 2500);
      maxFare = 12000;
    } else if (normalizedId.includes('innova') || normalizedId.includes('crysta') || normalizedId.includes('mpv')) {
      minFare = tripType === 'local' ? 2000 : (tripType === 'airport' ? 1200 : 3000);
      maxFare = 15000;
    } else if (normalizedId.includes('luxury')) {
      minFare = tripType === 'local' ? 3000 : (tripType === 'airport' ? 2000 : 4000);
      maxFare = 20000;
    }
    
    // Log warning if fare is outside acceptable range
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

  const getFareKey = (tripType: string, cabId: string, packageType?: string) => {
    const normalizedId = normalizeVehicleId(cabId);
    
    if (tripType === "outstation") {
      return `fare_outstation_${normalizedId}`;
    }
    if (tripType === "local") {
      return `fare_local_${normalizedId}_${packageType || ''}`;
    }
    if (tripType === "airport") {
      return `fare_airport_${normalizedId}`;
    }
    return `fare_${tripType}_${normalizedId}`;
  };

  const cleanWrongOutstationKeys = (normId: string) => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`fare_outstation_${normId}_`)) {
        localStorage.removeItem(key);
      }
    });
  };

  useEffect(() => {
    clearStaleFares();
    
    const calculateFareData = async () => {
      if (!cabId) return;

      setIsLoading(true);
      setError(null);

      const normalizedCabId = normalizeVehicleId(cabId);
      const fareKey = getFareKey(tripType, normalizedCabId, tripType === "local" ? packageType : undefined);

      if (tripType === "outstation") {
        cleanWrongOutstationKeys(normalizedCabId);
      }

      try {
        let fare: number = 0;
        let breakdown: FareBreakdown = {};
        let source = 'calculated';
        let databaseFareFound = false;
        
        // First try to get stored fare
        const storedFare = getStoredFare(fareKey);
        if (storedFare && validateFareAmount(storedFare.fare, cabId, tripType)) {
          console.log(`Using stored fare for ${cabId}: ${storedFare.fare} (source: ${storedFare.source})`);
          
          setFareData({
            totalPrice: storedFare.fare,
            basePrice: storedFare.breakdown.basePrice || storedFare.fare,
            breakdown: storedFare.breakdown,
            source: storedFare.source,
            timestamp: Date.now()
          });
          
          debouncedDispatchEvent({
            cabId: normalizedCabId,
            tripType,
            calculated: false,
            fare: storedFare.fare,
            source: storedFare.source,
            timestamp: Date.now()
          });
          
          setIsLoading(false);
          return; // Exit early if we found a valid stored fare
        }

        if (tripType === "airport") {
          try {
            const airportFares = await getAirportFaresForVehicle(normalizedCabId);
            console.log(`Retrieved airport fares for ${cabId}:`, airportFares);

            let basePrice = 0;
            const airportFee = 40; // Updated airport fee to Rs 40

            // Enforce minimum base price by distance tiers
            if (distance <= 10) {
              basePrice = Math.max(airportFares.tier1Price || 1200, 800);
            } else if (distance <= 20) {
              basePrice = Math.max(airportFares.tier2Price || 1800, 1000);
            } else if (distance <= 30) {
              basePrice = Math.max(airportFares.tier3Price || 2400, 1200);
            } else {
              basePrice = Math.max(airportFares.tier3Price || 2400, 1200);
              const extraKm = distance - 30;
              const extraKmCharge = airportFares.extraKmCharge || 14;
              const extraDistanceFare = extraKm * extraKmCharge;
              fare = basePrice + extraDistanceFare;
            }

            if (distance <= 30) {
              fare = basePrice;
            }

            fare += airportFee;
            
            // Ensure minimum fare for airport transfers
            fare = Math.max(fare, MIN_FARES.airport);

            breakdown = {
              basePrice: basePrice,
              airportFee: airportFee,
              extraDistanceFare: distance > 30 ? ((distance - 30) * (airportFares.extraKmCharge || 14)) : 0,
              extraKmCharge: airportFares.extraKmCharge || 14
            };

            source = 'database';
            
            if (validateFareAmount(fare, cabId, tripType)) {
              storeFareData(fareKey, fare, source, breakdown);
              
              debouncedDispatchEvent({
                cabId: normalizedCabId,
                tripType,
                calculated: true,
                fare: fare,
                source,
                timestamp: Date.now()
              });
            } else {
              // If invalid fare, use minimum valid fare
              fare = MIN_FARES.airport;
              source = 'minimum';
              
              storeFareData(fareKey, fare, source, {
                basePrice: fare - 40,
                airportFee: 40
              });
            }

          } catch (e) {
            console.error('Error calculating airport fare:', e);
            
            // Fallback calculation for airport transfer
            let basePrice = 0;
            const airportFee = 40;
            
            // Set fallback fares based on cab type and distance
            const cabTypeNormalized = normalizeVehicleId(cabId);
            if (cabTypeNormalized.includes('sedan')) {
              basePrice = 1000;
            } else if (cabTypeNormalized.includes('ertiga') || cabTypeNormalized.includes('suv')) {
              basePrice = 1200;
            } else if (cabTypeNormalized.includes('innova') || cabTypeNormalized.includes('crysta')) {
              basePrice = 1500;
            } else if (cabTypeNormalized.includes('tempo') || cabTypeNormalized.includes('traveller')) {
              basePrice = 2000;
            } else {
              basePrice = 1200;
            }
            
            // Add distance surcharge
            if (distance > 10) {
              const extraDistance = Math.min(distance - 10, 20);
              const farFactor = Math.max(0, distance - 30) * 0.2;
              basePrice += extraDistance * 25 + farFactor;
            }
            
            fare = basePrice + airportFee;
            
            // Ensure minimum fare
            fare = Math.max(fare, MIN_FARES.airport);

            breakdown = {
              basePrice: basePrice,
              airportFee: airportFee,
              extraDistanceFare: distance > 30 ? ((distance - 30) * 14) : 0,
              extraKmCharge: 14
            };

            source = 'fallback';
            
            storeFareData(fareKey, fare, source, breakdown);
          }
        } else if (tripType === "outstation") {
          try {
            const outstationFares = await getOutstationFaresForVehicle(normalizedCabId);
            console.log(`Retrieved outstation fares for ${cabId}:`, outstationFares);
            
            const baseKms = 300;
            let basePrice = outstationFares.basePrice || 0;
            let pricePerKm = outstationFares.pricePerKm || 0;
            let driverAllowance = outstationFares.driverAllowance ?? 250;
            let nightCharges = 0;

            let effectiveDistance = distance * 2;
            if (packageType === "round-trip") {
              pricePerKm = outstationFares.roundTripPricePerKm || pricePerKm;
              basePrice = outstationFares.roundTripBasePrice || basePrice;
              effectiveDistance = Math.max(distance * 2, baseKms);
            }
            if (effectiveDistance < baseKms) {
              effectiveDistance = baseKms;
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
            
            // Ensure minimum fare for outstation trips
            fare = Math.max(fare, MIN_FARES.outstation);

            breakdown = {
              basePrice,
              driverAllowance,
              nightCharges,
              extraDistanceFare,
              extraKmCharge: pricePerKm,
            };

            source = 'database';

            storeFareData(fareKey, fare, source, breakdown);

            debouncedDispatchEvent({
              cabId: normalizedCabId,
              tripType,
              calculated: true,
              fare: fare,
              source,
              timestamp: Date.now()
            });

          } catch (e) {
            console.error('Error calculating outstation fare:', e);
            
            // Fallback calculation for outstation
            const cabTypeNormalized = normalizeVehicleId(cabId);
            const baseKms = 300;
            
            let pricePerKm = 12; // Default
            if (cabTypeNormalized.includes('sedan')) pricePerKm = 12;
            else if (cabTypeNormalized.includes('ertiga') || cabTypeNormalized.includes('suv')) pricePerKm = 14;
            else if (cabTypeNormalized.includes('innova')) pricePerKm = 16;
            else if (cabTypeNormalized.includes('tempo') || cabTypeNormalized.includes('traveller')) pricePerKm = 18;
            
            const basePrice = baseKms * pricePerKm;
            const driverAllowance = 250;
            let effectiveDistance = distance * 2;
            let extraDistanceFare = 0;
            
            if (effectiveDistance > baseKms) {
              extraDistanceFare = (effectiveDistance - baseKms) * pricePerKm;
            }
            
            fare = basePrice + driverAllowance + extraDistanceFare;
            fare = Math.max(fare, MIN_FARES.outstation);
            
            breakdown = {
              basePrice,
              driverAllowance,
              extraDistanceFare,
              extraKmCharge: pricePerKm
            };
            
            source = 'fallback';
            
            storeFareData(fareKey, fare, source, breakdown);
          }
        } else if (tripType === "local") {
          try {
            const localFares = await getLocalFaresForVehicle(normalizedCabId);
            console.log(`Retrieved local fares for ${cabId}:`, localFares);
            
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
                console.warn(`Invalid database fare value for ${cabId}: ${dbFare}, will use minimum instead`);
                fare = MIN_FARES.local;
                source = 'minimum';
                breakdown = {
                  basePrice: fare,
                  packageLabel: packageType
                };
                
                storeFareData(fareKey, fare, source, breakdown);
              }
            } else {
              console.warn(`No valid package price found for ${packageType}, using fallback`);
              
              // Use fallback values based on cab type
              if (normalizedCabId.includes('sedan')) fare = 2400;
              else if (normalizedCabId.includes('ertiga') || normalizedCabId.includes('suv')) fare = 3000;
              else if (normalizedCabId.includes('innova') || normalizedCabId.includes('crysta') || normalizedCabId.includes('mpv')) fare = 4000;
              else if (normalizedCabId.includes('luxury')) fare = 5000;
              else fare = 3000;
              
              source = 'fallback';
              breakdown = { 
                basePrice: fare,
                packageLabel: packageType
              };
              
              storeFareData(fareKey, fare, source, breakdown);
            }
          } catch (e) {
            console.error('Error fetching real-time local fares:', e);
            
            // Use fallback values based on cab type
            if (normalizedCabId.includes('sedan')) fare = 2400;
            else if (normalizedCabId.includes('ertiga') || normalizedCabId.includes('suv')) fare = 3000;
            else if (normalizedCabId.includes('innova') || normalizedCabId.includes('crysta') || normalizedCabId.includes('mpv')) fare = 4000;
            else if (normalizedCabId.includes('luxury')) fare = 5000;
            else fare = 3000;
            
            source = 'fallback';
            breakdown = { basePrice: fare };
            
            storeFareData(fareKey, fare, source, breakdown);
          }
        } else if (tripType === "tour") {
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
          // For any other trip type, use the general calculateFare function
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
          } else {
            // Use minimum fare if invalid
            const minFare = MIN_FARES[tripType as keyof typeof MIN_FARES] || MIN_FARES.default;
            console.warn(`Invalid calculated fare: ${fare}, using minimum: ${minFare}`);
            fare = minFare;
            source = 'minimum';
            storeFareData(fareKey, fare, source, { basePrice: fare });
          }
        }

        setFareData({
          totalPrice: fare,
          basePrice: breakdown.basePrice || fare,
          breakdown,
          source,
          timestamp: Date.now(),
          version: FARE_VERSION
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
        
        // Use fallback minimum fare in case of error
        const minFare = MIN_FARES[tripType as keyof typeof MIN_FARES] || MIN_FARES.default;
        
        setFareData({
          totalPrice: minFare,
          basePrice: minFare,
          breakdown: { basePrice: minFare },
          source: 'error_fallback',
          timestamp: Date.now()
        });
        
        storeFareData(fareKey, minFare, 'error_fallback', { basePrice: minFare });
        
        debouncedDispatchEvent({
          cabId: normalizedCabId,
          tripType,
          calculated: false,
          fare: minFare,
          source: 'error_fallback',
          timestamp: Date.now(),
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    calculateFareData();
  }, [cabId, tripType, distance, packageType, pickupDate, toast]);

  return { fareData, isLoading, error };
}
