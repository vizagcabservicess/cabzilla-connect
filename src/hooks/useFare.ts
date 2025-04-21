import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { getLocalPackagePrice } from '@/lib/packageData';
import { getLocalFaresForVehicle } from '@/services/fareService';

interface FareBreakdown {
  basePrice?: number;
  driverAllowance?: number;
  nightCharges?: number;
  extraDistanceFare?: number;
  packageLabel?: string;
  extraKmRate?: number;
  extraHourRate?: number;
}

interface FareData {
  totalPrice: number;
  basePrice: number;
  breakdown: FareBreakdown;
}

export function useFare(cabId: string, tripType: string, distance: number = 0, packageType: string = '') {
  const [fareData, setFareData] = useState<FareData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const normalizeVehicleId = (id: string) => id.toLowerCase().replace(/\s+/g, '_');

  useEffect(() => {
    const calculateFareData = async () => {
      if (!cabId) return;

      setIsLoading(true);
      setError(null);

      const normalizedId = normalizeVehicleId(cabId);
      const fareKey = `fare_${tripType}_${normalizedId}`;

      try {
        let fare = 0;
        let breakdown: FareBreakdown = {};

        if (tripType === 'local') {
          try {
            const localFares = await getLocalFaresForVehicle(normalizedId);
            if (localFares) {
              const packageMap: Record<string, string> = {
                '4hrs-40km': 'price4hrs40km',
                '8hrs-80km': 'price8hrs80km',
                '10hrs-100km': 'price10hrs100km'
              };

              const fareKey = packageMap[packageType];
              if (fareKey && localFares[fareKey]) {
                fare = localFares[fareKey];
                breakdown = {
                  basePrice: fare,
                  packageLabel: packageType,
                  extraKmRate: localFares.priceExtraKm || 0,
                  extraHourRate: localFares.priceExtraHour || 0
                };
              }
            }
          } catch (err) {
            console.warn('Error fetching real-time fares, falling back to cached:', err);
            const cachedFare = localStorage.getItem(fareKey);
            if (cachedFare) {
              fare = parseInt(cachedFare, 10);
              breakdown = {
                basePrice: fare,
                packageLabel: packageType
              };
            } else {
              fare = await getLocalPackagePrice(packageType, cabId);
              breakdown = {
                basePrice: fare,
                packageLabel: packageType
              };
            }
          }
        } else {
          const result = await calculateFare(cabId, tripType, distance);
          fare = result.totalFare;
          breakdown = result.breakdown;
        }

        localStorage.setItem(fareKey, fare.toString());

        setFareData({
          totalPrice: fare,
          basePrice: breakdown.basePrice || fare,
          breakdown
        });
      } catch (err) {
        console.error(`Fare calculation error for ${cabId}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to calculate fare'));

        const cachedFare = localStorage.getItem(fareKey);
        if (cachedFare) {
          const fare = parseInt(cachedFare, 10);
          setFareData({
            totalPrice: fare,
            basePrice: fare,
            breakdown: { basePrice: fare }
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    calculateFareData();
  }, [cabId, tripType, distance, packageType, toast]);

  return { fareData, isLoading, error };
}