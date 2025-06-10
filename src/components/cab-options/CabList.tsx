import React, { useState, useEffect } from 'react';
import { useFare } from '@/hooks/useFare';
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { CabOptionCard } from '@/components/CabOptionCard';
import { MobileCabCard } from './MobileCabCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType, fareAmount: number, breakdown?: any) => void;
  isAirportTransfer?: boolean;
  tripType?: string;
  tripMode?: string;
  distance?: number;
  packageType?: string;
  pickupDate?: Date;
}

const sumBreakdown = (breakdown: any) => {
  if (!breakdown) return 0;
  const fields = [
    'basePrice',
    'driverAllowance',
    'nightCharges',
    'extraDistanceFare',
    'extraHourCharge',
    'airportFee',
  ];
  let total = 0;
  for (const key of fields) {
    const val = breakdown[key];
    if (typeof val === 'number' && !isNaN(val)) {
      total += val;
    }
  }
  return total;
};

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  isCalculatingFares,
  handleSelectCab,
  isAirportTransfer,
  tripType = 'local',
  tripMode = 'one-way',
  distance = 0,
  packageType,
  pickupDate
}) => {
  console.log(`CabList: Rendering with package ${packageType}`);
  
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  const isMobile = useIsMobile();
  
  const normalizeVehicleId = (id: string): string => {
    return id.trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  useEffect(() => {
    const handleFareUpdate = () => {
      console.log('CabList: Detected fare update, refreshing list');
      setRefreshKey(Date.now());
    };
    
    window.addEventListener('fare-calculated', handleFareUpdate);
    window.addEventListener('fare-cache-cleared', handleFareUpdate);
    window.addEventListener('significant-fare-difference', handleFareUpdate);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareUpdate);
      window.removeEventListener('fare-cache-cleared', handleFareUpdate);
      window.removeEventListener('significant-fare-difference', handleFareUpdate);
    };
  }, []);

  const enhancedSelectCab = (cab: CabType, fare: number, fareSource: string, breakdown?: any) => {
    handleSelectCab(cab, fare, breakdown);
    setFadeIn(prev => ({ ...prev, [cab.id]: true }));

    setTimeout(() => {
      setFadeIn(prev => ({ ...prev, [cab.id]: false }));
    }, 500);
    
    if (fare > 0) {
      try {
        localStorage.setItem(`selected_fare_${cab.id}_${tripType}_${packageType}`, JSON.stringify({
          fare,
          source: fareSource,
          timestamp: Date.now(),
          packageType,
          cabId: cab.id
        }));
        console.log(`Stored selected fare for ${cab.name}: ₹${fare} (${fareSource})`);
      } catch (e) {
        console.error('Error storing selected fare:', e);
      }
    }
  };

  return (
    <div className={cn("space-y-3", isMobile ? "space-y-2" : "space-y-3")}>
      {isCalculatingFares && (
        <div className="bg-blue-50 p-3 rounded-md flex items-center justify-center mb-3">
          <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-600 text-sm">Calculating fares...</span>
        </div>
      )}

      {(!cabTypes || cabTypes.length === 0) ? (
        <div className="bg-amber-50 p-4 rounded-md text-amber-800 text-center">
          <p className="font-medium">No cab options available</p>
          <p className="text-sm mt-1">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      ) : (
        cabTypes.map((cab) => {
          const normalizedId = normalizeVehicleId(cab.id);
          const { fareData, isLoading, error } = useFare(
            normalizedId,
            tripType,
            distance,
            packageType,
            pickupDate
          );

          let fare = 0;
          let fareText = 'Price unavailable';
          let fareSource = 'unknown';
          
          if (isLoading) {
            fareText = 'Calculating...';
          } else if (error) {
            console.error(`Fare error for ${cab.name}:`, error);
            fareText = 'Error fetching price';
          } else if (fareData) {
            fare = sumBreakdown(fareData.breakdown) || fareData.totalPrice;
            fareSource = fareData.source || 'unknown';

            if (tripType === 'local') {
              const localPackageLimits: Record<string, { km: number; hours: number }> = {
                '4hrs-40km': { km: 40, hours: 4 },
                '8hrs-80km': { km: 80, hours: 8 },
                '10hrs-100km': { km: 100, hours: 10 },
              };
              const selectedPackage = localPackageLimits[packageType || '8hrs-80km'] || { km: 80, hours: 8 };
              const extraKm = Math.max(0, distance - selectedPackage.km);
              const extraHours = 0;
              const breakdown = fareData.breakdown || {};
              const extraKmCharge = breakdown.extraKmCharge || breakdown.priceExtraKm || 0;
              const extraHourCharge = breakdown.extraHourCharge || breakdown.priceExtraHour || 0;
              const extraKmFare = extraKm * extraKmCharge;
              const extraHourFare = extraHours * extraHourCharge;
              fare = (breakdown.basePrice || fare) + extraKmFare + extraHourFare;
            }

            if (tripType === 'airport') {
              const breakdown = fareData.breakdown || {};
              const base = breakdown.basePrice || 0;
              const airportFee = breakdown.airportFee || 0;
              const extra = breakdown.extraDistanceFare || 0;
              fare = base + airportFee + extra;
            }

            if (fareSource === 'database') {
              fareText = `₹${fare.toLocaleString()} (verified)`;
            } else if (fareSource === 'stored') {
              fareText = `₹${fare.toLocaleString()} (saved)`;
            } else if (fareSource === 'default') {
              fareText = `₹${fare.toLocaleString()} (standard)`;
            } else {
              fareText = `₹${fare.toLocaleString()}`;
            }
          }

          // Render mobile or desktop version based on screen size
          if (isMobile) {
            return (
              <MobileCabCard
                key={cab.id}
                cab={cab}
                fare={fare}
                isSelected={selectedCabId === cab.id}
                onSelect={() => enhancedSelectCab(cab, fare, fareSource, fareData?.breakdown)}
                isCalculating={isLoading}
                fareSource={fareSource}
              />
            );
          }

          return (
            <CabOptionCard
              key={cab.id}
              cab={cab}
              fare={fare}
              isSelected={selectedCabId === cab.id}
              onSelect={() => enhancedSelectCab(cab, fare, fareSource, fareData?.breakdown)}
              fareDetails={fareText}
              isCalculating={isLoading}
              tripType={tripType}
              tripMode={tripMode}
              fareSource={fareSource}
            />
          );
        })
      )}
    </div>
  );
};
