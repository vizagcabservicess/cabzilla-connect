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
  extraKmCharge?: number;
  extraHourCharge?: number;
}

interface FareData {
  totalPrice: number;
  basePrice: number;
  breakdown: FareBreakdown;
}

const normalizeVehicleId = (id: string): string => {
  if (!id) return '';
  
  // First convert to lowercase and trim
  let normalizedId = id.toLowerCase().trim();

  // Map specific vehicle types to their database IDs
  const vehicleMapping: Record<string, string> = {
    'innova_hycross': 'innova_crysta',
    'innova': 'innova_crysta',
    'mpv': 'MPV',
    'etios': 'sedan',
    'dzire_cng': 'dzire_cng',
    'dzire': 'dzire_cng',
    'sedan': 'sedan'
  };

  // Apply specific mappings first
  if (vehicleMapping[normalizedId]) {
    return vehicleMapping[normalizedId];
  }

  // Handle special cases
  if (normalizedId.includes('sedan')) return 'sedan';
  if (normalizedId.includes('dzire')) return 'dzire_cng';
  if (normalizedId.includes('innova')) return 'innova_crysta';

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
              // Map package type to all possible property variations
              const packageMap: Record<string, string> = {
                '4hrs-40km': 'price4hrs40km',
                '8hrs-80km': 'price8hrs80km',
                '10hrs-100km': 'price10hrs100km'
              };

              const propertyName = packageMap[packageType];
              if (!propertyName) {
                console.error(`Invalid package type: ${packageType}`);
                return 0;
              }

              // Try to get fare using the property name or fallback variations
              fare = localFares[propertyName] || 
                     localFares[propertyName.replace('price', 'package')] ||
                     localFares[`${propertyName.slice(0, -2)}_${propertyName.slice(-2)}`] || 0;

              console.log(`Looking up fare for ${cabType.name} with package ${packageType}:`, {
                normalizedId: normalizeVehicleId(cabType.id),
                propertyName,
                fareFound: fare,
                availableFares: localFares
              });

              // Log the fare lookup attempt
              console.log(`Looking up fare for ${cabId} with package ${packageType}:`, {
                normalizedId: normalizeVehicleId(cabId),
                possibleProps,
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