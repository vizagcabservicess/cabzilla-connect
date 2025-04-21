import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { getLocalPackagePrice } from '@/lib/packageData';

interface FareBreakdown {
  basePrice?: number;
  driverAllowance?: number;
  nightCharges?: number;
  extraDistanceFare?: number;
  packageLabel?: string;
}

interface FareData {
  totalPrice: number;
  basePrice: number;
  breakdown: FareBreakdown;
}

const normalizeVehicleId = (id: string): string => {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

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
          // For local trips, use the package pricing
          fare = await getLocalPackagePrice(packageType, cabId);
          breakdown = {
            basePrice: fare,
            packageLabel: packageType
          };
        } else {
          // For other trip types, calculate using main calculation service
          const result = await calculateFare(cabId, tripType, distance);
          fare = result.totalFare;
          breakdown = result.breakdown;
        }

        setFareData({
          totalPrice: fare,
          basePrice: breakdown.basePrice || fare,
          breakdown
        });
      } catch (err) {
        console.error(`Fare calculation error for ${cabId}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to calculate fare'));

        // Get cached fare from localStorage as fallback
        const cachedFare = localStorage.getItem(`fare_${tripType}_${cabId.toLowerCase()}`);
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