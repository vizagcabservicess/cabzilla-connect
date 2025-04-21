import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface FareData {
  totalPrice: number;
  baseFare?: number;
  kmCharge?: number;
  extraCharges?: Record<string, number>;
}

export function useFare(cabId: string, tripType: string, distance: number, packageType: string) {
  const [fareData, setFareData] = useState<FareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const calculateFare = async () => {
      if (!cabId || distance <= 0) return;

      setIsLoading(true);
      setError(null);

      try {
        // For now return a basic calculation
        const basePrice = tripType === 'airport' ? 2000 : 1500;
        const pricePerKm = 15;

        const totalPrice = basePrice + (distance * pricePerKm);

        setFareData({
          totalPrice,
          baseFare: basePrice,
          kmCharge: distance * pricePerKm
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to calculate fare');
        setError(error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    calculateFare();
  }, [cabId, tripType, distance, packageType, toast]);

  return { fareData, isLoading, error };
};