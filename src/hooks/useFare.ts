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

      try {
        let fare: number = 0;
        let breakdown: FareBreakdown = {};

        if (tripType === 'local') {
          // First check BookingSummary cache
          const bookingSummaryKey = `booking_summary_fare_${tripType}_${normalizeVehicleId(cabId)}`;
          const bookingSummaryFare = localStorage.getItem(bookingSummaryKey);
          
          if (bookingSummaryFare && parseInt(bookingSummaryFare) > 0) {
            console.log(`Using cached BookingSummary fare for ${cabId}: ${bookingSummaryFare}`);
            return {
              totalPrice: parseInt(bookingSummaryFare),
              basePrice: parseInt(bookingSummaryFare),
              breakdown: { basePrice: parseInt(bookingSummaryFare) }
            };
          }

          try {
            console.log(`Fetching local fares for ${cabId} with package ${packageType}`);
            const localFares = await getLocalFaresForVehicle(normalizeVehicleId(cabId));
            if (localFares) {
              let fareAmount = 0;
              if (packageType === '8hrs-80km') {
                fareAmount = localFares.price8hrs80km || localFares.package8hr80km || 2500;
              } else if (packageType === '4hrs-40km') {
                fareAmount = localFares.price4hrs40km || localFares.package4hr40km || 1500;
              } else if (packageType === '10hrs-100km') {
                fareAmount = localFares.price10hrs100km || localFares.package10hr100km || 3000;
              }

              if (fareAmount > 0) {
                console.log(`Found local package fare for ${cabId}: ${fareAmount}`);
                fare = fareAmount;
                breakdown = {
                  basePrice: fare,
                  packageLabel: packageType,
                  extraDistanceFare: 0,
                  extraKmCharge: localFares.priceExtraKm || localFares.extra_km_charge || 15,
                  extraHourCharge: localFares.priceExtraHour || localFares.extra_hour_charge || 200
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
        const bookingSummaryFare = localStorage.getItem(`booking_summary_fare_${tripType}_${normalizeVehicleId(cabId)}`);
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