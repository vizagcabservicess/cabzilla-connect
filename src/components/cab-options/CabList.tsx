import React, { useEffect, useState } from 'react';
import { useFare } from '@/hooks/useFare';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import { TripType, TripMode } from '@/lib/tripTypes';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  isAirportTransfer?: boolean;
  tripType?: TripType;
  distance?: number;
  packageType?: string;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  isCalculatingFares,
  handleSelectCab,
  getFareDetails,
  isAirportTransfer,
  tripType = 'local',
  distance = 0,
  packageType = '8hrs-80km'
}) => {
  const [displayedFares, setDisplayedFares] = useState<Record<string, number>>({});
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});

  // Enhanced cab selection handler
  const enhancedSelectCab = (cab: CabType) => {
    handleSelectCab(cab);
    setFadeIn(prev => ({ ...prev, [cab.id]: true }));

    // Clear fade effect after animation
    setTimeout(() => {
      setFadeIn(prev => ({ ...prev, [cab.id]: false }));
    }, 500);
  };

  // Normalize cab ID for API calls
  const normalizeCabId = (id: string): string => {
    return id.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  // Get fare for each cab using the same hook as BookingSummary
  const getFareForCab = (cab: CabType) => {
    const normalizedId = normalizeCabId(cab.id);
    const { fareData, isLoading } = useFare(
      normalizedId,
      tripType,
      distance,
      packageType
    );

    useEffect(() => {
      if (fareData?.totalPrice) {
        console.log(`CabList: Received fare for ${cab.id}:`, fareData);
        setDisplayedFares(prev => ({
          ...prev,
          [cab.id]: fareData.totalPrice
        }));
      }
    }, [fareData, cab.id]);

    return { fare: fareData?.totalPrice, isLoading };
  };

  return (
    <div className="space-y-3">
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
          const { fare, isLoading } = getFareForCab(cab);
          const displayFare = fare || 0;

          return (
            <div 
              key={cab.id}
              className={`transition-all duration-300 ${fadeIn[cab.id] ? 'bg-yellow-50' : ''}`}
            >
              <CabOptionCard 
                cab={cab}
                fare={displayFare}
                isSelected={selectedCabId === cab.id}
                onSelect={() => enhancedSelectCab(cab)}
                fareDetails={getFareDetails(cab)}
                isCalculating={isLoading}
              />
            </div>
          );
        })
      )}
    </div>
  );
};