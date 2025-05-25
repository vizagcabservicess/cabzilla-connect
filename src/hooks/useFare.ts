
import { useState, useEffect } from 'react';
import { debounce } from '@/lib/utils';

interface FareData {
  totalPrice: number;
  source: string;
  breakdown?: any;
}

export function useFare(
  vehicleId: string,
  tripType: string,
  distance: number,
  packageType?: string,
  pickupDate?: Date
) {
  const [fareData, setFareData] = useState<FareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedFetch = debounce(async () => {
    if (!vehicleId || !tripType) return;

    setIsLoading(true);
    setError(null);

    try {
      // Mock fare calculation - replace with actual API call
      const mockFare = {
        totalPrice: Math.floor(Math.random() * 2000) + 500,
        source: 'calculated',
        breakdown: {
          basePrice: Math.floor(Math.random() * 1500) + 400,
          extraKmCharge: 10,
          extraHourCharge: 50,
        }
      };

      setFareData(mockFare);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fare');
    } finally {
      setIsLoading(false);
    }
  }, 300);

  useEffect(() => {
    debouncedFetch();
  }, [vehicleId, tripType, distance, packageType, pickupDate]);

  return { fareData, isLoading, error };
}
