import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

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
    const fetchFare = async () => {
      if (!cabId) return;

      setIsLoading(true);
      setError(null);
      const normalizedCabId = normalizeVehicleId(cabId);

      try {
        let endpoint = '';
        switch (tripType) {
          case 'local':
            endpoint = '/api/direct-local-fares.php';
            break;
          case 'outstation':
            endpoint = '/api/direct-outstation-fares.php';
            break;
          case 'airport':
            endpoint = '/api/direct-airport-fares.php';
            break;
          default:
            throw new Error('Invalid trip type');
        }

        const response = await fetch(`${endpoint}?vehicle_id=${normalizedCabId}`);
        let data;
        try {
          const text = await response.text();
          // Check if response is HTML instead of JSON
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error('Received HTML instead of JSON');
          }
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse response:', e);
          console.error('Raw response:', text);
          throw new Error('Invalid response format from API');
        }

        if (!response.ok) {
          //Improved error handling: Check for specific error codes or messages if needed.
          throw new Error(data.message || `Failed to fetch fare: ${response.status}`);
        }

        let parsedFare: FareData = {
          totalPrice: 0,
          basePrice: 0,
          breakdown: {}
        };

        if (tripType === 'local') {
          const vehicleFare = data.fares?.find((f: any) => 
            normalizeVehicleId(f.vehicleId) === normalizedCabId
          );

          if (vehicleFare) {
            if (vehicleFare.totalPrice) {
              parsedFare.totalPrice = vehicleFare.totalPrice;
              parsedFare.basePrice = vehicleFare.basePrice || vehicleFare.totalPrice;
            } else {
              const packagePrice = packageType === '8hrs-80km' ? 
                vehicleFare.price8hrs80km || vehicleFare.package8hr80km :
                packageType === '10hrs-100km' ?
                vehicleFare.price10hrs100km || vehicleFare.package10hr100km :
                vehicleFare.price4hrs40km || vehicleFare.package4hr40km;

              parsedFare.totalPrice = packagePrice;
              parsedFare.basePrice = packagePrice;
              parsedFare.breakdown = {
                packageLabel: packageType,
                basePrice: packagePrice
              };
            }
          }
        } else if (tripType === 'outstation') {
          const fare = data.fares?.[normalizedCabId];
          if (fare) {
            parsedFare.totalPrice = fare.total_price || 
              (fare.base_price + (distance * fare.price_per_km) + fare.driver_allowance);
            parsedFare.basePrice = fare.base_price;
            parsedFare.breakdown = {
              basePrice: fare.base_price,
              driverAllowance: fare.driver_allowance,
              extraDistanceFare: distance * fare.price_per_km
            };
          }
        } else if (tripType === 'airport') {
          const fare = data.fares?.[0];
          if (fare) {
            parsedFare.totalPrice = fare.total_price || 
              (fare.base_price + fare.pickup_price + fare.drop_price);
            parsedFare.basePrice = fare.base_price;
            parsedFare.breakdown = {
              basePrice: fare.base_price,
              driverAllowance: 250
            };
          }
        }

        setFareData(parsedFare);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch fare');
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

    fetchFare();
  }, [cabId, tripType, distance, packageType, toast]);

  return { fareData, isLoading, error };
}