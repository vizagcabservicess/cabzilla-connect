
import React, { useState, useEffect, useMemo } from 'react';
import { CabOptionCard } from '@/components/CabOptionCard';
import { CabType } from '@/types/cab';
import { calculateFare } from '@/lib/fareCalculationService';
import { TripType, TripMode } from '@/lib/tripTypes';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCabOptionsHook } from '@/hooks/useCabOptionsHook';

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: TripType;
  tripMode: TripMode;
  pickupDate?: Date;
  returnDate?: Date;
  hourlyPackage?: string;
}

export const CabOptions = ({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  pickupDate,
  returnDate,
  hourlyPackage
}: CabOptionsProps) => {
  const isMobile = useIsMobile();
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculatedFares, setCalculatedFares] = useState<Record<string, number>>({});
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  
  // Use our custom hook to fetch cab options
  const { cabOptions, isLoading, error, refresh } = useCabOptionsHook({
    tripType,
    tripMode,
    distance
  });
  
  // Use actual cab options from the API first, fall back to passed-in cabTypes if API fails
  const actualCabOptions = useMemo(() => {
    return cabOptions.length > 0 ? cabOptions : cabTypes;
  }, [cabOptions, cabTypes]);

  // Calculate fares for all available cabs
  useEffect(() => {
    const calculateAllFares = async () => {
      if (distance > 0 && actualCabOptions.length > 0) {
        setIsCalculating(true);
        const fares: Record<string, number> = {};
        
        try {
          for (const cab of actualCabOptions) {
            const fare = await calculateFare({
              cabType: cab,
              distance,
              tripType,
              tripMode,
              hourlyPackage,
              pickupDate,
              returnDate
            });
            fares[cab.id] = fare;
          }
          
          setCalculatedFares(fares);
        } catch (error) {
          console.error('Error calculating fares:', error);
        } finally {
          setIsCalculating(false);
        }
      }
    };
    
    calculateAllFares();
  }, [actualCabOptions, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  // Generate descriptive fare details
  const generateFareDetails = (cab: CabType): string => {
    if (tripType === 'outstation') {
      if (tripMode === 'one-way') {
        return 'One way trip';
      } else {
        return `Round trip (${returnDate ? Math.ceil((returnDate.getTime() - (pickupDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)) : 1} days)`;
      }
    } else if (tripType === 'local') {
      // Get package details from the hourlyPackage
      if (hourlyPackage === '4hrs-40km') {
        return '4 hours, 40 km package';
      } else if (hourlyPackage === '8hrs-80km') {
        return '8 hours, 80 km package';
      } else {
        return '10 hours, 100 km package';
      }
    } else if (tripType === 'airport') {
      return 'Airport transfer';
    }
    
    return 'Base fare';
  };

  // When no cabs are available
  if (actualCabOptions.length === 0 && !isLoading && !error) {
    return (
      <div className="bg-white p-6 rounded-md shadow-sm border my-4">
        <div className="text-center">
          <h3 className="text-lg font-medium">No vehicles available</h3>
          <p className="text-gray-500 mt-2 mb-4">There are no vehicles available for your trip right now.</p>
          <Button variant="outline" onClick={refresh} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || filterLoading) {
    return (
      <div className="space-y-4 mt-6">
        <p className="text-gray-500 animate-pulse">Loading available vehicles...</p>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-8 w-1/4" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200 my-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <div>
            <h3 className="text-red-800 font-medium">Error loading vehicles</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <Button variant="outline" onClick={refresh} className="mt-3 text-red-600 border-red-300">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {actualCabOptions.length} {actualCabOptions.length === 1 ? 'vehicle' : 'vehicles'} available
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refresh}
          className="text-blue-600 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>
      
      <div className="space-y-3">
        {actualCabOptions.map((cab) => (
          <CabOptionCard
            key={cab.id}
            cab={cab}
            fare={calculatedFares[cab.id] || 0}
            isSelected={selectedCab?.id === cab.id}
            onSelect={onSelectCab}
            fareDetails={generateFareDetails(cab)}
            isCalculating={isCalculating}
          />
        ))}
      </div>
    </div>
  );
};
