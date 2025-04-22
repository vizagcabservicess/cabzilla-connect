import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { getLocalPackagePrice } from '@/lib/packageData';
import { getLocalFaresForVehicle } from '@/services/fareService';
import { normalizeVehicleId } from '@/utils/safeStringUtils';

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
}


export function useFare(cabId: string, tripType: string, distance: number, packageType: string = '') {
  const [fareData, setFareData] = useState<FareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const calculateFareData = async () => {
      if (!cabId) return;

      setIsLoading(true);
      setError(null);

      const normalizedId = normalizeVehicleId(cabId);
      console.log(`Calculating fare for ${normalizedId} (${tripType})`);

      try {
        let fare: number = 0;
        let breakdown: FareBreakdown = {};

        // First check if we have a valid BookingSummary fare
        const bookingSummaryFare = localStorage.getItem(`booking_summary_fare_${tripType}_${normalizedId}`);
        if (bookingSummaryFare) {
          const parsedFare = parseInt(bookingSummaryFare, 10);
          if (!isNaN(parsedFare) && parsedFare > 0) {
            console.log(`Using BookingSummary fare for ${normalizedId}: ${parsedFare}`);
            return {
              totalPrice: parsedFare,
              basePrice: parsedFare,
              breakdown: { basePrice: parsedFare }
            };
          }
        }

        if (tripType === 'local') {
          try {
            const localFares = await getLocalFaresForVehicle(normalizeVehicleId(cabId));
            if (localFares) {
              const packageMap: Record<string, string> = {
                '4hrs-40km': 'price4hrs40km',
                '8hrs-80km': 'price8hrs80km',
                '10hrs-100km': 'price10hrs100km'
              };

              const propertyName = packageMap[packageType];
              if (!propertyName) {
                console.error(`Invalid package type: ${packageType}`);
                return 0;
              }

              fare = localFares[propertyName] || 
                     localFares[propertyName.replace('price', 'package')] ||
                     localFares[`${propertyName.slice(0, -2)}_${propertyName.slice(-2)}`] || 0;

              console.log(`Looking up fare for ${cabId} with package ${packageType}:`, {
                normalizedId: normalizeVehicleId(cabId),
                propertyName,
                fareFound: fare,
                availableFares: localFares
              });

              if (fare > 0) {
                breakdown = {
                  basePrice: fare,
                  packageLabel: packageType,
                  extraDistanceFare: 0,
                  extraKmCharge: localFares.priceExtraKm || localFares.extra_km_charge || 0,
                  extraHourCharge: localFares.priceExtraHour || localFares.extra_hour_charge || 0
                };
              }
            }
          } catch (e) {
            console.error('Error fetching real-time local fares:', e);
          }

          if (fare === 0) {
            fare = await getLocalPackagePrice(packageType, normalizeVehicleId(cabId));
            breakdown = {
              basePrice: fare,
              packageLabel: packageType
            };
          }
        } else {
          const result = await calculateFare(normalizeVehicleId(cabId), tripType, distance);
          fare = result.totalFare;
          breakdown = result.breakdown;
        }

        const fareKey = `fare_${tripType}_${normalizeVehicleId(cabId)}`;
        localStorage.setItem(fareKey, fare.toString());

        setFareData({
          totalPrice: fare,
          basePrice: breakdown.basePrice || fare,
          breakdown
        });
      } catch (err) {
        console.error(`Fare calculation error for ${cabId}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to calculate fare'));

        // Only use BookingSummary calculated fares
        const bookingSummaryFare = localStorage.getItem(`booking_summary_fare_${tripType}_${normalizedId}`);
        if (bookingSummaryFare) {
          const fare = parseInt(bookingSummaryFare, 10);
          setFareData({
            totalPrice: fare,
            basePrice: fare,
            breakdown: { basePrice: fare }
          });
          console.log(`Using BookingSummary fare for ${cabId}: ${fare}`);
        } else {
          console.log(`No BookingSummary fare available for ${cabId}`);
          // Trigger a new calculation
          window.dispatchEvent(new CustomEvent('request-fare-calculation', {
            detail: {
              cabId: normalizeVehicleId(cabId),
              tripType,
              timestamp: Date.now()
            }
          }));
        }
      } finally {
        setIsLoading(false);
      }
    };

    calculateFareData();
  }, [cabId, tripType, distance, packageType, toast]);

  return { fareData, isLoading, error };
}