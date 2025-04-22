import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { getLocalFaresForVehicle, getOutstationFaresForVehicle } from '@/services/fareService';
import { normalizeVehicleId } from '@/utils/safeStringUtils';
import { CabType } from '@/types/cab';
import { cabTypes } from '@/lib/cabData';
import { debounce } from '@/lib/utils';
import { getVehiclePricingTier, validateFareAmount } from '@/utils/vehiclePricingUtils';

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

export function useFare(cabId: string, tripType: string, distance: number, packageType: string = '', pickupDate?: Date) {
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
      
      console.log(`useFare: Calculating fare for ${normalizedCabId} with package ${packageType}`);

      try {
        let fare: number = 0;
        let breakdown: FareBreakdown = {};
        let source = 'calculated';
        let databaseFareFound = false;

        if (tripType === 'outstation') {
          try {
            console.log(`Fetching outstation fares for ${cabId}`);
            const outstationFares = await getOutstationFaresForVehicle(normalizedCabId);
            console.log('Retrieved outstation fares:', outstationFares);

            if (outstationFares) {
              const effectiveDistance = distance * (packageType === 'one-way' ? 2 : 1);
              const baseKms = 300;
              const isOneWay = packageType === 'one-way';

              // Get the default pricing tier for this vehicle
              const pricingTier = getVehiclePricingTier(normalizedCabId);
              console.log('Vehicle pricing tier:', pricingTier);
              
              // Start with default values from the pricing tier
              let basePrice = pricingTier.basePrice;
              let pricePerKm = pricingTier.pricePerKm;
              let driverAllowance = pricingTier.driverAllowance;

              console.log('Vehicle-specific base rates:', {
                vehicleType: normalizedCabId,
                basePrice,
                pricePerKm,
                driverAllowance,
                category: pricingTier.category,
                displayName: pricingTier.displayName
              });

              // Override with database values if available and valid
              if (outstationFares.basePrice && outstationFares.basePrice > 0) basePrice = outstationFares.basePrice;
              if (outstationFares.pricePerKm && outstationFares.pricePerKm > 0) pricePerKm = outstationFares.pricePerKm;
              if (outstationFares.driverAllowance && outstationFares.driverAllowance > 0) driverAllowance = outstationFares.driverAllowance;
              
              console.log('Final rates after database override:', {
                basePrice,
                pricePerKm,
                driverAllowance,
                source: outstationFares.basePrice ? 'database' : 'default tier'
              });

              // Start with base price
              fare = basePrice;
              
              // Calculate extra distance charges
              let extraDistanceFare = 0;
              if (effectiveDistance > baseKms) {
                const extraKms = effectiveDistance - baseKms;
                extraDistanceFare = extraKms * pricePerKm;
                fare += extraDistanceFare;
                
                console.log('Extra distance calculation:', {
                  extraKms,
                  pricePerKm,
                  extraDistanceFare
                });
              }

              // Add driver allowance
              fare += driverAllowance;

              // Night charges if applicable (between 22:00 and 05:00)
              let nightCharges = 0;
              if (pickupDate) {
                const hours = pickupDate.getHours();
                if (hours >= 22 || hours <= 5) {
                  nightCharges = Math.round(basePrice * 0.1);
                  fare += nightCharges;
                  console.log('Added night charges:', nightCharges);
                }
              }

              breakdown = {
                basePrice,
                driverAllowance,
                nightCharges,
                extraDistanceFare,
                extraKmCharge: pricePerKm
              };

              // Validate total matches component sum
              const calculatedSum = basePrice + extraDistanceFare + driverAllowance + nightCharges;
              console.log('Fare validation:', {
                calculatedSum,
                fare,
                components: {
                  basePrice,
                  extraDistanceFare,
                  driverAllowance,
                  nightCharges
                }
              });

              if (Math.abs(calculatedSum - fare) > 0.01) {
                console.warn('Fare calculation mismatch detected:', {
                  calculatedSum,
                  fare,
                  difference: Math.abs(calculatedSum - fare)
                });
                
                // Fix the fare to match the sum of components for consistency
                fare = calculatedSum;
              }

              source = 'database';
              databaseFareFound = true;

              console.log('Final outstation fare breakdown:', {
                basePrice,
                extraDistanceFare,
                driverAllowance,
                nightCharges,
                totalFare: fare,
                vehicleType: normalizedCabId
              });

              // Store the calculated fare
              storeFareData(fareKey, fare, source, breakdown);
            }
          } catch (error) {
            console.error('Error calculating outstation fare:', error);
            setError(error instanceof Error ? error : new Error('Failed to calculate outstation fare'));
          }
        } else if (tripType === 'local') {
          try {
            console.log(`Fetching local fares for ${cabId} with package ${packageType}`);
            const localFares = await getLocalFaresForVehicle(normalizedCabId);
            
            if (localFares) {
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
            // Implementation for airport fare calculation will go here
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
