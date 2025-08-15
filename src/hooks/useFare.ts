import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
import { fetchOutstationFare } from '@/services/outstationFareService';
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
  airportFee?: number; // Added airportFee property
  tierUsed?: string; // Added tierUsed property for tiered pricing
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

  const getStoredFare = (key: string) => {
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

        if (tripType === "airport") {
          try {
            const airportFares = await getAirportFaresForVehicle(normalizedCabId);
            console.log(`Retrieved airport fares for ${cabId}:`, airportFares);

            let basePrice = 0;
            let extraKmCharge = airportFares.extraKmCharge;
            if (!extraKmCharge || isNaN(extraKmCharge)) {
              if (normalizedCabId.includes('ertiga')) extraKmCharge = 18;
              else extraKmCharge = 14;
              console.warn('Missing extraKmCharge for airport fare, using fallback:', extraKmCharge);
            }
            if (distance <= 10) {
              basePrice = airportFares.tier1Price || 1200;
            } else if (distance <= 20) {
              basePrice = airportFares.tier2Price || 1800;
            } else if (distance <= 30) {
              basePrice = airportFares.tier3Price || 2400;
            } else if (distance <= 40) {
              basePrice = airportFares.tier4Price || 1500;
            } else {
              basePrice = airportFares.tier4Price || 1500;
              const extraKm = distance - 40;
              const extraDistanceFare = extraKm * extraKmCharge;
              fare = basePrice + extraDistanceFare;
            }

            if (distance <= 40) {
              fare = basePrice;
            }

            breakdown = {
              basePrice: basePrice,
              extraDistanceFare: distance > 40 ? ((distance - 40) * extraKmCharge) : 0,
              extraKmCharge: extraKmCharge
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
            console.error('Error calculating airport fare:', e);
            
            let basePrice = 0;
            let fare = 0;

            let extraKmCharge = 14;
            if (normalizedCabId.includes('ertiga')) extraKmCharge = 18;
            if (distance <= 10) {
              basePrice = 1200;
            } else if (distance <= 20) {
              basePrice = 1800;
            } else if (distance <= 30) {
              basePrice = 2400;
            } else if (distance <= 40) {
              basePrice = 1500;
            } else {
              basePrice = 1500;
              const extraKm = distance - 40;
              const extraDistanceFare = extraKm * extraKmCharge;
              fare = basePrice + extraDistanceFare;
            }

            if (distance <= 40) {
              fare = basePrice;
            }

            breakdown = {
              basePrice: basePrice,
              extraDistanceFare: distance > 40 ? ((distance - 40) * extraKmCharge) : 0,
              extraKmCharge: extraKmCharge
            };

            source = 'default';
            
            storeFareData(fareKey, fare, source, breakdown);
          }
        } else if (tripType === "outstation") {
          try {
            console.log('useFare: Outstation trip detected');
            console.log('useFare: packageType:', packageType);
            console.log('useFare: tripType:', tripType);
            console.log('useFare: distance:', distance);
            
            const outstationFares = await fetchOutstationFare(normalizedCabId);

            if (packageType === "one-way") {
              // Use dynamic tiered pricing for one-way outstation trips
              console.log('useFare: Calculating tier pricing for outstation one-way trip');
              console.log('useFare: Distance:', distance);
              console.log('useFare: Outstation fares data:', outstationFares);
              
              let basePrice = 0;
              let driverAllowance = outstationFares.driverAllowance ?? 250;
              let extraDistanceFare = 0;
              let extraKmCharge = outstationFares.extraKmCharge ?? 14; // Use extraKmCharge, fallback to 14

              // Get tier distance ranges (with defaults)
              const tier1Min = outstationFares.tier1MinKm || 35;
              const tier1Max = outstationFares.tier1MaxKm || 50;
              const tier2Min = outstationFares.tier2MinKm || 51;
              const tier2Max = outstationFares.tier2MaxKm || 75;
              const tier3Min = outstationFares.tier3MinKm || 76;
              const tier3Max = outstationFares.tier3MaxKm || 100;
              const tier4Min = outstationFares.tier4MinKm || 101;
              const tier4Max = outstationFares.tier4MaxKm || 149;

              console.log('useFare: Tier ranges:', {
                tier1: `${tier1Min}-${tier1Max}km (₹${outstationFares.tier1Price})`,
                tier2: `${tier2Min}-${tier2Max}km (₹${outstationFares.tier2Price})`,
                tier3: `${tier3Min}-${tier3Max}km (₹${outstationFares.tier3Price})`,
                tier4: `${tier4Min}-${tier4Max}km (₹${outstationFares.tier4Price})`
              });

              // Dynamic tiered pricing for distances 35km to 149km
              let tierUsed = 'traditional';
              
              if (distance >= tier1Min && distance <= tier1Max) {
                basePrice = outstationFares.tier1Price || outstationFares.basePrice;
                tierUsed = 'tier1';
                console.log(`useFare: Distance ${distance}km falls in Tier 1 (${tier1Min}-${tier1Max}km), using price: ₹${basePrice}`);
              } else if (distance >= tier2Min && distance <= tier2Max) {
                basePrice = outstationFares.tier2Price || (outstationFares.basePrice * 1.2);
                tierUsed = 'tier2';
                console.log(`useFare: Distance ${distance}km falls in Tier 2 (${tier2Min}-${tier2Max}km), using price: ₹${basePrice}`);
              } else if (distance >= tier3Min && distance <= tier3Max) {
                basePrice = outstationFares.tier3Price || (outstationFares.basePrice * 1.4);
                tierUsed = 'tier3';
                console.log(`useFare: Distance ${distance}km falls in Tier 3 (${tier3Min}-${tier3Max}km), using price: ₹${basePrice}`);
              } else if (distance >= tier4Min && distance <= tier4Max) {
                basePrice = outstationFares.tier4Price || (outstationFares.basePrice * 1.6);
                tierUsed = 'tier4';
                console.log(`useFare: Distance ${distance}km falls in Tier 4 (${tier4Min}-${tier4Max}km), using price: ₹${basePrice}`);
              } else if (distance > tier4Max) {
                // For distances beyond tier4Max, use traditional calculation
                basePrice = outstationFares.oneWayBasePrice;
                const baseDistance = 150; // Use 150km as base distance
                const extraKm = Math.max(0, distance - baseDistance);
                const roundTripExtraKm = extraKm * 2; // Calculate both sides
                extraDistanceFare = roundTripExtraKm * extraKmCharge;
                console.log(`useFare: Distance ${distance}km is beyond Tier 4, using traditional calculation:`);
                console.log(`useFare: - Base Price: ₹${basePrice}`);
                console.log(`useFare: - Base Distance: ${baseDistance}km`);
                console.log(`useFare: - Extra KM (one-way): ${extraKm}km`);
                console.log(`useFare: - Extra KM (round-trip): ${roundTripExtraKm}km`);
                console.log(`useFare: - Extra KM Charge: ₹${extraKmCharge}`);
                console.log(`useFare: - Extra Distance Fare: ₹${extraDistanceFare}`);
                console.log(`useFare: - Total: ₹${basePrice} + ₹${extraDistanceFare} extra`);
              } else {
                // For distances less than tier1Min, use traditional calculation
                basePrice = outstationFares.oneWayBasePrice;
                const extraKm = Math.max(0, distance - tier1Min);
                extraDistanceFare = extraKm * extraKmCharge;
                console.log(`useFare: Distance ${distance}km is below Tier 1, using traditional calculation: ₹${basePrice} + ₹${extraDistanceFare} extra`);
              }

              fare = basePrice + extraDistanceFare + driverAllowance;

              console.log(`useFare: Final calculation for ${distance}km: Base ₹${basePrice} + Extra ₹${extraDistanceFare} + Driver ₹${driverAllowance} = Total ₹${fare}`);

              breakdown = {
                basePrice,
                driverAllowance,
                extraDistanceFare,
                tierUsed: tierUsed
              };
            } else {
              console.log('useFare: Not a one-way trip, using traditional calculation');
              // Round trip calculation (existing logic)
              const baseKms = 300;
              let basePrice = outstationFares.roundTripBasePrice || outstationFares.oneWayBasePrice || 0;
              let pricePerKm = outstationFares.roundTripPricePerKm || outstationFares.oneWayPricePerKm || 0;
              let driverAllowance = outstationFares.driverAllowance ?? 250;
              let nightCharges = 0;

              let effectiveDistance = distance * 2;
              if (packageType === "round-trip") {
                pricePerKm = outstationFares.roundTripPricePerKm || outstationFares.oneWayPricePerKm || pricePerKm;
                basePrice = outstationFares.roundTripBasePrice || outstationFares.oneWayBasePrice || basePrice;
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
            }

            source = 'calculated';

            Object.keys(localStorage).forEach(key => {
              if (key.startsWith(`fare_outstation_${normalizedCabId}_`)) {
                localStorage.removeItem(key);
              }
            });

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
        } else if (tripType === "tour") {
          try {
            fare = 0; // Always use real data, never fallback
            source = 'api';
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

        // Patch: Calculate totalPrice as the sum of all breakdown fields
        const sumBreakdown = (breakdownObj: any) => {
          let total = 0;
          if (breakdownObj) {
            for (const key of Object.keys(breakdownObj)) {
              const val = breakdownObj[key];
              if (typeof val === 'number' && !isNaN(val)) {
                total += val;
              }
            }
          }
          return total;
        };
        const patchedTotalPrice = sumBreakdown(breakdown);
        setFareData({
          totalPrice: patchedTotalPrice > 0 ? patchedTotalPrice : fare,
          basePrice: breakdown.basePrice || fare,
          breakdown,
          source,
          timestamp: Date.now()
        });

        if (tripType !== "outstation") {
          debouncedDispatchEvent({
            cabId: normalizedCabId,
            tripType,
            calculated: true,
            fare: fare,
            source,
            timestamp: Date.now()
          });
        }

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
