
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { calculateFare } from '@/lib/fareCalculationService';
import { normalizeVehicleId } from '@/utils/safeStringUtils';
import { getLocalFaresForVehicle, getOutstationFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';

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

const fareCache = new Map<string, FareData>();

export function useFare(cabId: string, tripType: string, distance: number, packageType?: string) {
  const [fareData, setFareData] = useState<FareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const updateGlobalFare = useCallback((newFare: FareData, cabId: string) => {
    const key = `${tripType}_${normalizeVehicleId(cabId)}`;
    fareCache.set(key, newFare);
    
    window.dispatchEvent(new CustomEvent('fare-calculated', {
      detail: {
        cabId: normalizeVehicleId(cabId),
        tripType,
        fare: newFare.totalPrice,
        timestamp: Date.now()
      }
    }));

    localStorage.setItem(`fare_${tripType}_${normalizeVehicleId(cabId)}`, newFare.totalPrice.toString());
  }, [tripType]);

  useEffect(() => {
    const fetchFare = async () => {
      if (!cabId) return;

      setIsLoading(true);
      setError(null);

      try {
        let fare: number = 0;
        let breakdown: FareBreakdown = {};

        switch (tripType) {
          case 'local': {
            const localFare = await getLocalFaresForVehicle(normalizeVehicleId(cabId));
            if (packageType && localFare) {
              const packageMap = {
                '8hrs-80km': 'price8hrs80km',
                '4hrs-40km': 'price4hrs40km',
                '10hrs-100km': 'price10hrs100km'
              };
              const key = packageMap[packageType];
              if (key && localFare[key]) {
                fare = localFare[key];
                breakdown = { basePrice: fare, packageLabel: packageType };
              }
            }
            break;
          }
          case 'outstation': {
            const outstationFare = await getOutstationFaresForVehicle(normalizeVehicleId(cabId));
            if (outstationFare) {
              fare = outstationFare.basePrice + (distance * outstationFare.pricePerKm);
              breakdown = {
                basePrice: outstationFare.basePrice,
                driverAllowance: outstationFare.driverAllowance,
                extraDistanceFare: distance * outstationFare.pricePerKm
              };
            }
            break;
          }
          case 'airport': {
            const airportFare = await getAirportFaresForVehicle(normalizeVehicleId(cabId));
            if (airportFare) {
              fare = distance <= 10 ? airportFare.tier1Price :
                     distance <= 20 ? airportFare.tier2Price :
                     distance <= 30 ? airportFare.tier3Price : airportFare.tier4Price;
              breakdown = { basePrice: fare };
            }
            break;
          }
        }

        const newFareData = {
          totalPrice: fare,
          basePrice: breakdown.basePrice || fare,
          breakdown
        };

        setFareData(newFareData);
        updateGlobalFare(newFareData, cabId);

      } catch (err) {
        console.error(`Fare calculation error for ${cabId}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to calculate fare'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchFare();
  }, [cabId, tripType, distance, packageType, updateGlobalFare]);

  return { fareData, isLoading, error };
}
