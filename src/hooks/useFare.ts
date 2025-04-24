import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { getLocalFaresForVehicle, getOutstationFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
import { normalizeVehicleId } from '@/utils/safeStringUtils';
import { CabType } from '@/types/cab';
import { cabTypes } from '@/lib/cabData';
import { debounce } from '@/lib/utils';
import { validateFare, getValidatedFare, storeFareWithValidation } from '@/utils/fareValidator';

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
  
  const normalizedCabId = normalizeVehicleId(cabId);

  const getValidatedCabFare = () => {
    const validFare = getValidatedFare(normalizedCabId, tripType);
    
    if (validFare) {
      console.log(`Found validated fare for ${normalizedCabId} (${tripType}): ${validFare}`);
      return {
        fare: validFare,
        source: 'validated',
        breakdown: { basePrice: validFare }
      };
    }
    
    return null;
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

  const getStoredFare = (key: string) => {
    try {
      const validatedFare = getValidatedCabFare();
      if (validatedFare) {
        return validatedFare;
      }
      
      const sessionFare = sessionStorage.getItem(key);
      if (sessionFare) {
        try {
          const parsed = JSON.parse(sessionFare);
          if (typeof parsed.fare === 'number' && parsed.fare > 0 && 
              parsed.timestamp && Date.now() - parsed.timestamp < 15 * 60 * 1000) {
            if (validateFare(parsed.fare, cabId, tripType)) {
              return {
                fare: parsed.fare,
                source: parsed.source || 'stored',
                breakdown: parsed.breakdown || { basePrice: parsed.fare }
              };
            }
          }
        } catch (e) {
          console.error('Error parsing session fare:', e);
        }
      }
      
      const localFare = localStorage.getItem(key);
      if (localFare) {
        try {
          const parsed = JSON.parse(localFare);
          if (typeof parsed.fare === 'number' && parsed.fare > 0 && 
              parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            if (validateFare(parsed.fare, cabId, tripType)) {
              return {
                fare: parsed.fare,
                source: parsed.source || 'stored',
                breakdown: parsed.breakdown || { basePrice: parsed.fare }
              };
            }
          }
        } catch (e) {
          console.error('Error parsing local fare:', e);
        }
      }
      
      return null;
    } catch (e) {
      console.error('Error retrieving fare from storage:', e);
      return null;
    }
  };

  const debouncedDispatchEvent = debounce((detail: any) => {
    window.dispatchEvent(new CustomEvent('fare-calculated', { detail }));
  }, 100);

  const getFareKey = (tripType: string, cabId: string, packageType?: string) => {
    if (tripType === "outstation") {
      return `fare_outstation_${normalizeVehicleId(cabId)}`;
    }
    if (tripType === "local") {
      return `fare_local_${normalizeVehicleId(cabId)}_${packageType || ''}`;
    }
    if (tripType === "airport") {
      return `fare_airport_${normalizeVehicleId(cabId)}`;
    }
    return `fare_${tripType}_${normalizeVehicleId(cabId)}`;
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

      const fareKey = getFareKey(tripType, normalizedCabId, tripType === "local" ? packageType : undefined);

      if (tripType === "outstation") {
        cleanWrongOutstationKeys(normalizedCabId);
      }

      try {
        const validatedFareObject = getValidatedCabFare();
        
        if (validatedFareObject) {
          console.log(`Using validated fare: ${validatedFareObject.fare}`);
          
          setFareData({
            totalPrice: validatedFareObject.fare,
            basePrice: validatedFareObject.breakdown.basePrice || validatedFareObject.fare,
            breakdown: validatedFareObject.breakdown,
            source: validatedFareObject.source,
            timestamp: Date.now()
          });
          
          debouncedDispatchEvent({
            cabId: normalizedCabId,
            tripType,
            calculated: true,
            fare: validatedFareObject.fare,
            source: validatedFareObject.source,
            timestamp: Date.now()
          });
          
          setIsLoading(false);
          return;
        }
        
        let fare: number = 0;
        let breakdown: FareBreakdown = {};
        let source = 'calculated';
        let databaseFareFound = false;

        if (tripType === "airport") {
          try {
            const airportFares = await getAirportFaresForVehicle(normalizedCabId);
            console.log(`Retrieved airport fares for ${cabId}:`, airportFares);

            let basePrice = 0;
            const airportFee = 40; // Updated airport fee to Rs 40

            if (distance <= 10) {
              basePrice = airportFares.tier1Price || 1200;
            } else if (distance <= 20) {
              basePrice = airportFares.tier2Price || 1800;
            } else if (distance <= 30) {
              basePrice = airportFares.tier3Price || 2400;
            } else {
              basePrice = airportFares.tier3Price || 2400;
              const extraKm = distance - 30;
              const extraKmCharge = airportFares.extraKmCharge || 14;
              const extraDistanceFare = extraKm * extraKmCharge;
              fare = basePrice + extraDistanceFare;
            }

            if (distance <= 30) {
              fare = basePrice;
            }

            fare += airportFee;

            breakdown = {
              basePrice: basePrice,
              airportFee: airportFee,
              extraDistanceFare: distance > 30 ? ((distance - 30) * (airportFares.extraKmCharge || 14)) : 0,
              extraKmCharge: airportFares.extraKmCharge || 14
            };

            source = 'database';
            
            storeFareWithValidation(cabId, tripType, fare, {
              source,
              breakdown,
              distance,
              cabType: cabId
            });
            
            debouncedDispatchEvent({
              cabId: normalizedCabId,
              tripType,
              calculated: true,
              fare: fare,
              source,
              timestamp: Date.now()
            });

          } catch (e) {
            console.error('Error calculating airport fare:', e);
            
            let basePrice = 0;
            let fare = 0;
            const airportFee = 40; // Updated airport fee here too

            if (distance <= 10) {
              basePrice = 1200;
            } else if (distance <= 20) {
              basePrice = 1800;
            } else if (distance <= 30) {
              basePrice = 2400;
            } else {
              basePrice = 2400;
              const extraKm = distance - 30;
              const extraDistanceFare = extraKm * 14;
              fare = basePrice + extraDistanceFare;
            }

            if (distance <= 30) {
              fare = basePrice;
            }

            fare += airportFee;

            breakdown = {
              basePrice: basePrice,
              airportFee: airportFee,
              extraDistanceFare: distance > 30 ? ((distance - 30) * 14) : 0,
              extraKmCharge: 14
            };

            source = 'default';
            
            storeFareWithValidation(cabId, tripType, fare, {
              source,
              breakdown,
              distance,
              cabType: cabId
            });
          }
        } else if (tripType === "outstation") {
          try {
            const outstationFares = await getOutstationFaresForVehicle(normalizedCabId);

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

            breakdown = {
              basePrice,
              driverAllowance,
              nightCharges,
              extraDistanceFare,
              extraKmCharge: pricePerKm,
            };

            source = 'calculated';
            
            storeFareWithValidation(cabId, tripType, fare, {
              source,
              breakdown,
              distance,
              packageType,
              cabType: cabId
            });

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
          }
        } else if (tripType === "local") {
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
              
              if (validateFare(dbFare, cabId, tripType)) {
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
                
                storeFareWithValidation(cabId, tripType, fare, {
                  source,
                  breakdown,
                  distance,
                  packageType,
                  cabType: cabId
                });
              } else {
                console.warn(`Invalid database fare value for ${cabId}: ${dbFare}, will try calculation instead`);
              }
            }
          } catch (e) {
            console.error('Error fetching real-time local fares:', e);
          }
          
          if (!databaseFareFound) {
            const storedFare = getStoredFare(fareKey);
            if (storedFare && validateFare(storedFare.fare, cabId, tripType)) {
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
              
              storeFareWithValidation(cabId, tripType, fare, {
                source,
                breakdown,
                distance,
                cabType: cabId
              });
            }
          }
        } else if (tripType === "tour") {
          try {
            if (normalizedCabId.includes('sedan')) fare = 3500;
            else if (normalizedCabId.includes('ertiga') || normalizedCabId.includes('suv')) fare = 4500;
            else if (normalizedCabId.includes('innova') || normalizedCabId.includes('crysta') || normalizedCabId.includes('mpv')) fare = 5500;
            else fare = 4000;
            
            source = 'default';
            breakdown = { basePrice: fare };
            
            storeFareWithValidation(cabId, tripType, fare, {
              source,
              breakdown,
              distance,
              cabType: cabId
            });
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
          
          if (validateFare(fare, cabId, tripType)) {
            storeFareWithValidation(cabId, tripType, fare, {
              source,
              breakdown,
              distance,
              cabType: cabId
            });
          }
        }

        setFareData({
          totalPrice: fare,
          basePrice: breakdown.basePrice || fare,
          breakdown,
          source,
          timestamp: Date.now()
        });
        
        if (validateFare(fare, cabId, tripType)) {
          const bookingDetails = sessionStorage.getItem('bookingDetails');
          if (bookingDetails) {
            try {
              const parsed = JSON.parse(bookingDetails);
              if (parsed.selectedCab?.id === cabId) {
                parsed.totalPrice = fare;
                sessionStorage.setItem('bookingDetails', JSON.stringify(parsed));
              }
            } catch (e) {
              console.error('Error updating booking details with fare:', e);
            }
          }
        }

      } catch (err) {
        console.error(`Fare calculation error for ${cabId}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to calculate fare'));
      } finally {
        setIsLoading(false);
      }
    };

    calculateFareData();
  }, [cabId, tripType, distance, packageType, pickupDate, toast, normalizedCabId]);

  return { fareData, isLoading, error };
}
