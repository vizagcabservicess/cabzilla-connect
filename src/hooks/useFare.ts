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
}

interface FareData {
  totalPrice: number;
  basePrice: number;
  breakdown: FareBreakdown;
}

const normalizeVehicleId = (id: string): string => {
  // First convert to lowercase and trim
  let normalizedId = id.toLowerCase().trim();
  
  // Map specific vehicle types to their database IDs
  const vehicleMapping: Record<string, string> = {
    'innova_hycross': 'innova_crysta',
    'innova': 'innova_crysta',
    'mpv': 'MPV',
    'etios': 'sedan',
    'dzire_cng': 'Dzire CNG',
    'dzire': 'Dzire CNG'
  };

  // Apply specific mappings first
  if (vehicleMapping[normalizedId]) {
    return vehicleMapping[normalizedId];
  }

  return normalizedId;
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
          // For local trips, first try to get real-time fares
          try {
            const localFares = await getLocalFaresForVehicle(cabId);
            if (localFares) {
              // Map package type to fare property
              const fareMap: Record<string, string> = {
                '4hrs-40km': 'price_4hrs_40km',
                '8hrs-80km': 'price_8hrs_80km',
                '10hrs-100km': 'price_10hrs_100km'
              };

              const fareProp = fareMap[packageType];
              if (!fareProp) {
                console.error(`Invalid package type: ${packageType}`);
                return 0;
              }

              // Try different property name variations
              fare = localFares[fareProp] || 
                    localFares[fareProp.replace(/_/g, '')] ||
                    localFares[fareProp.replace('price_', '')] ||
                    localFares[`package_${fareProp.slice(6)}`] || 
                    0;

              // Log the fare lookup attempt
              console.log(`Looking up fare for ${cabType.id} with package ${packageType}:`, {
                normalizedId: normalizeVehicleId(cabType.id),
                fareProp,
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

          // Fallback to package data if real-time fare fetch failed
          if (fare === 0) {
            fare = await getLocalPackagePrice(packageType, cabId);
            breakdown = {
              basePrice: fare,
              packageLabel: packageType
            };
          }
        } else {
          // For other trip types, calculate using main calculation service
          const result = await calculateFare(cabId, tripType, distance);
          fare = result.totalFare;
          breakdown = result.breakdown;
        }

        // Store fare in localStorage for consistency
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

        // Get cached fare from localStorage as fallback
        const cachedFare = localStorage.getItem(`fare_${tripType}_${normalizeVehicleId(cabId)}`);
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