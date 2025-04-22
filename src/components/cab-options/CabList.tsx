
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

          // Unified fare handling with BookingSummary sync
          let fare = 0;
          let fareText = 'Price unavailable';
          const normalizedId = normalizeVehicleId(cab.id);
          
          // First check BookingSummary fare
          const bookingSummaryFare = localStorage.getItem(`booking_summary_fare_${tripType}_${normalizedId}`);
          
          if (isLoading) {
            fareText = 'Calculating...';
          } else if (error) {
            console.error(`Fare error for ${cab.name}:`, error);
            fareText = 'Error fetching price';
          } else if (bookingSummaryFare) {
            // Always prefer BookingSummary fare if available
            fare = parseInt(bookingSummaryFare, 10);
            fareText = `₹${Math.round(fare)}`;
            console.log(`Using synchronized BookingSummary fare for ${cab.name}: ${fareText}`);
          } else if (fareData?.totalPrice && fareData.totalPrice > 0) {
            fare = fareData.totalPrice;
            fareText = `₹${fare}`;
            console.log(`Using API fare for ${cab.name}: ${fareText}`);
          } else {
            console.log(`No fare available for ${cab.name}, requesting calculation`);
            fareText = 'Calculating...';
            window.dispatchEvent(new CustomEvent('request-fare-calculation', {
              detail: {
                cabId: normalizedId,
                tripType,
                timestamp: Date.now()
              }
            }));
          }

          // Listen for fare updates
          useEffect(() => {
            const handleFareUpdate = (event: CustomEvent) => {
              if (event.detail.cabId === normalizedId) {
                console.log(`Received fare update for ${cab.name}:`, event.detail.fare);
                setFadeIn(prev => ({ ...prev, [cab.id]: true }));
                setTimeout(() => setFadeIn(prev => ({ ...prev, [cab.id]: false })), 500);
              }
            };

            window.addEventListener('fare-calculated', handleFareUpdate as EventListener);
            window.addEventListener('significant-fare-difference', handleFareUpdate as EventListener);

            return () => {
              window.removeEventListener('fare-calculated', handleFareUpdate as EventListener);
              window.removeEventListener('significant-fare-difference', handleFareUpdate as EventListener);
            };
          }, [normalizedId, cab.name, cab.id]);
          
          // Debug logging
          console.log(`Fare for ${cab.name}:`, {
            fareData,
            calculatedFare: fare,
            normalizedId,
            tripType,
            packageType
          });

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
                fareDetails={error ? "Error fetching fare" : undefined}
              />
            </div>
          );
        })
      )}
    </div>
  );
};
