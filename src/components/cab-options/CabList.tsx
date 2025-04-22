
import React, { useState } from 'react';
import { useFare } from '@/hooks/useFare';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import { TripType } from '@/lib/tripTypes';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  isAirportTransfer?: boolean;
  tripType?: TripType;
  tripMode?: string;
  distance?: number;
  packageType?: string;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  isCalculatingFares,
  handleSelectCab,
  isAirportTransfer,
  tripType = 'local',
  tripMode = 'one-way',
  distance = 0,
  packageType = '8hrs-80km'
}) => {
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const normalizeVehicleId = (id: string): string => {
    return id.trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  // Enhanced cab selection handler
  const enhancedSelectCab = (cab: CabType) => {
    handleSelectCab(cab);
    setFadeIn(prev => ({ ...prev, [cab.id]: true }));

    setTimeout(() => {
      setFadeIn(prev => ({ ...prev, [cab.id]: false }));
    }, 500);
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
          const normalizedId = normalizeVehicleId(cab.id);
          const { fareData, isLoading, error } = useFare(
            normalizedId,
            tripType,
            distance,
            packageType
          );

          let fare = 0;
          let fareText = 'Price unavailable';
          
          if (isLoading) {
            fareText = 'Calculating...';
          } else if (error) {
            console.error(`Fare error for ${cab.name}:`, error);
            fareText = 'Error fetching price';
          } else if (fareData) {
            fare = fareData.totalPrice;
            fareText = fareData.source === 'database' ? 
              `Database fare: ₹${fare}` : 
              `Calculated fare: ₹${fare}`;
          }

          // Get trip type label for display
          let tripTypeLabel = "Trip";
          if (tripType === 'local') {
            tripTypeLabel = "Local Package";
          } else if (tripType === 'airport') {
            tripTypeLabel = "Airport Transfer";
          } else if (tripType === 'outstation') {
            tripTypeLabel = tripMode === 'round-trip' ? "Outstation Round Trip" : "Outstation One Way";
          }

          return (
            <div 
              key={cab.id}
              className={`transition-all duration-300 ${fadeIn[cab.id] ? 'bg-yellow-50' : ''}`}
            >
              <CabOptionCard 
                cab={cab}
                fare={fare}
                isSelected={selectedCabId === cab.id}
                onSelect={() => enhancedSelectCab(cab)}
                isCalculating={isLoading}
                fareDetails={error ? "Error fetching fare" : fareText}
                tripType={tripType}
                tripMode={tripMode}
              />
            </div>
          );
        })
      )}
    </div>
  );
};
