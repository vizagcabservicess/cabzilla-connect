
import { useState, useEffect } from 'react';
import { getApiUrl } from '@/config/api';

interface FareBreakdown {
  basePrice: number;
  extraCharges?: number;
  driverAllowance?: number;
  nightCharges?: number;
  extraDistanceFare?: number;
}

interface FareResponse {
  basePrice: number;
  totalPrice: number;
  breakdown: FareBreakdown;
}

export function useFare(vehicleId: string, tripType: string, distance: number, packageType?: string) {
  const [fareData, setFareData] = useState<FareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFare = async () => {
      if (!vehicleId) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // Normalize vehicle ID to match database format
        const normalizedId = vehicleId.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        
        // Select API endpoint based on trip type
        const endpoint = tripType === 'local' ? 'direct-local-fares.php' :
                        tripType === 'airport' ? 'direct-airport-fares.php' :
                        'direct-outstation-fares.php';

        const url = getApiUrl(`api/${endpoint}`);
        const response = await fetch(`${url}?vehicle_id=${normalizedId}&_t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch fare data');
        }

        const data = await response.json();
        
        if (!data.fares || !data.fares[normalizedId]) {
          throw new Error('No fare data available');
        }

        const fare = data.fares[normalizedId];
        let totalPrice = 0;
        let breakdown: FareBreakdown = { basePrice: 0 };

        if (tripType === 'local') {
          // Get price based on package type
          const packageField = packageType === '8hrs-80km' ? 'price_8hrs_80km' :
                             packageType === '4hrs-40km' ? 'price_4hrs_40km' :
                             'price_10hrs_100km';
          
          totalPrice = fare[packageField] || fare.basePrice;
          breakdown = {
            basePrice: totalPrice,
            extraCharges: 0
          };
        } else if (tripType === 'outstation') {
          const basePrice = fare.basePrice || fare.base_price;
          const pricePerKm = fare.pricePerKm || fare.price_per_km;
          const driverAllowance = fare.driverAllowance || fare.driver_allowance || 250;
          
          totalPrice = basePrice + (distance * pricePerKm) + driverAllowance;
          breakdown = {
            basePrice: basePrice,
            extraDistanceFare: distance * pricePerKm,
            driverAllowance
          };
        } else if (tripType === 'airport') {
          const pickupPrice = fare.pickupPrice || fare.pickup_price;
          const dropPrice = fare.dropPrice || fare.drop_price;
          
          totalPrice = fare.totalPrice || (pickupPrice + dropPrice);
          breakdown = {
            basePrice: pickupPrice,
            extraCharges: dropPrice
          };
        }

        setFareData({
          basePrice: breakdown.basePrice,
          totalPrice,
          breakdown
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch fare');
        setFareData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFare();
  }, [vehicleId, tripType, distance, packageType]);

  return { fareData, isLoading, error };
}
