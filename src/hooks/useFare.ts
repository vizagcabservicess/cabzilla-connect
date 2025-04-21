
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

        const baseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.host}`;
        const response = await fetch(`${baseUrl}/api/direct-${tripType}-fares.php?vehicle_id=${normalizedCabId}`, {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        // Check response status first
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get content type and ensure it's JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Expected JSON response but got ${contentType}`);
        }

        const data = await response.json();

        let parsedFare: FareData = {
          totalPrice: 0,
          basePrice: 0,
          breakdown: {}
        };

        if (tripType === 'local') {
          let vehicleFare;
          
          // Handle both array and object response formats
          if (Array.isArray(data)) {
            vehicleFare = data.find((f: any) => 
              normalizeVehicleId(f.vehicleId || f.vehicle_id) === normalizedCabId
            );
          } else if (data && typeof data === 'object') {
            if (data.fares) {
              vehicleFare = Array.isArray(data.fares) 
                ? data.fares.find((f: any) => normalizeVehicleId(f.vehicleId || f.vehicle_id) === normalizedCabId)
                : data.fares[normalizedCabId];
            } else {
              // Direct object response
              vehicleFare = data[normalizedCabId];
            }
          }

          if (vehicleFare) {
            let packagePrice = 0;
            
            // Try all possible property names for package prices
            if (packageType === '8hrs-80km') {
              packagePrice = vehicleFare.price_8hrs_80km || 
                           vehicleFare.price8hrs80km ||
                           vehicleFare.package8hr80km ||
                           vehicleFare.local_package_8hr ||
                           0;
            } else if (packageType === '10hrs-100km') {
              packagePrice = vehicleFare.price_10hrs_100km ||
                           vehicleFare.price10hrs100km ||
                           vehicleFare.package10hr100km ||
                           vehicleFare.local_package_10hr ||
                           0;
            } else {
              packagePrice = vehicleFare.price_4hrs_40km ||
                           vehicleFare.price4hrs40km ||
                           vehicleFare.package4hr40km ||
                           vehicleFare.local_package_4hr ||
                           0;
            }

            parsedFare.totalPrice = packagePrice;
            parsedFare.basePrice = packagePrice;
            parsedFare.breakdown = {
              packageLabel: packageType,
              basePrice: packagePrice
            };
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
          const fare = Array.isArray(data.fares) ? data.fares[0] : data.fares?.[normalizedCabId];
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
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch fare';
        console.error(`Fare API error for ${cabId}:`, errorMessage);
        setError(new Error(errorMessage));
        toast({
          title: "Error",
          description: errorMessage,
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
