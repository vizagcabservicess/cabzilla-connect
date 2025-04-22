
import React, { useState, useEffect } from 'react';
import { useFare } from '@/hooks/useFare';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import { TripType } from '@/lib/tripTypes';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType, fareAmount: number, fareSource: string) => void;
  isAirportTransfer?: boolean;
  tripType?: string; // Changed from TripType to string to match useFare
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
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  
  const normalizeVehicleId = (id: string): string => {
    return id.trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  // Listen for fare update events and refresh the component
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

  // Enhanced cab selection handler
  const enhancedSelectCab = (cab: CabType, fare: number, fareSource: string) => {
    handleSelectCab(cab, fare, fareSource);
    setFadeIn(prev => ({ ...prev, [cab.id]: true }));

    setTimeout(() => {
      setFadeIn(prev => ({ ...prev, [cab.id]: false }));
    }, 500);
    
    // Store the selected fare in localStorage for BookingSummary to use
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
          let fareSource = 'unknown';
          
          if (isLoading) {
            fareText = 'Calculating...';
          } else if (error) {
            console.error(`Fare error for ${cab.name}:`, error);
            fareText = 'Error fetching price';
          } else if (fareData) {
            fare = fareData.totalPrice;
            fareSource = fareData.source || 'unknown';
            
            // Customize the fare text based on the source
            if (fareSource === 'database') {
              fareText = `₹${fare.toLocaleString()} (verified)`;
            } else if (fareSource === 'stored') {
              fareText = `₹${fare.toLocaleString()} (saved)`;
            } else if (fareSource === 'default') {
              fareText = `₹${fare.toLocaleString()} (standard)`;
            } else {
              fareText = `₹${fare.toLocaleString()}`;
            }
            
            // For debugging - log the fare source
            console.log(`Cab ${cab.name} fare: ${fare} (source: ${fareSource})`);
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
              key={`${cab.id}-${refreshKey}`}
              className={`transition-all duration-300 ${fadeIn[cab.id] ? 'bg-yellow-50' : ''}`}
            >
              <CabOptionCard 
                cab={cab}
                fare={fare}
                isSelected={selectedCabId === cab.id}
                onSelect={() => enhancedSelectCab(cab, fare, fareSource)}
                isCalculating={isLoading}
                fareDetails={error ? "Error fetching fare" : fareText}
                tripType={tripType}
                tripMode={tripMode}
                fareSource={fareSource}
              />
            </div>
          );
        })
      )}
    </div>
  );
};
