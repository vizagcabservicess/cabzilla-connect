
import React, { useState, useEffect, useCallback } from 'react';
import CabOptionCard from '../CabOptionCard';
import { useFare } from '@/hooks/useFare';
import { formatPrice } from '@/lib/utils';

interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  description?: string;
  features?: string[];
  imageUrl?: string;
}

interface CabListProps {
  cabTypes: CabType[];
  tripType: string;
  distance: number;
  packageType: string;
  onSelectCab: (cab: CabType, fare: number) => void;
  selectedCabId?: string;
  onFareCalculated?: (fare: number) => void;
}

const CabList: React.FC<CabListProps> = ({
  cabTypes,
  tripType,
  distance,
  packageType,
  onSelectCab,
  selectedCabId,
  onFareCalculated
}) => {
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(Date.now());
  
  // Get fare calculation functions
  const { fetchFare, isLoading: isFareLoading } = useFare();

  // Calculate fares for all cab types
  const calculateAllFares = useCallback(async () => {
    if (!cabTypes || cabTypes.length === 0) return;
    
    setIsCalculatingFares(true);
    const newFares: Record<string, number> = {};
    
    try {
      const promises = cabTypes.map(async (cab) => {
        try {
          // Directly fetch from API for each cab type
          const result = await fetchFare(cab.id, tripType, distance, packageType);
          if (result && result.fareData) {
            newFares[cab.id] = result.fareData.totalPrice;
          }
        } catch (error) {
          console.error(`Error calculating fare for ${cab.id}:`, error);
        }
      });
      
      await Promise.all(promises);
      
      // Update all fares at once to minimize rerenders
      setCabFares(newFares);
      
      // Set last update timestamp for debugging
      setLastUpdateTimestamp(Date.now());
    } catch (err) {
      console.error('Error calculating all fares:', err);
    } finally {
      setIsCalculatingFares(false);
    }
  }, [cabTypes, tripType, distance, packageType, fetchFare]);

  // Calculate fares whenever relevant props change
  useEffect(() => {
    calculateAllFares();
  }, [calculateAllFares, tripType, distance, packageType]);

  // Get fare display value for a specific cab
  const getDisplayFare = (cab: CabType): number => {
    // Return the direct fare from our state, or 0 if not available
    return cabFares[cab.id] || 0;
  };

  // Get fare details for display on the cab card
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return 'Local package';
    } else if (tripType === 'outstation') {
      return distance > 0 ? `${distance} km trip` : 'Outstation trip';
    } else if (tripType === 'airport') {
      return 'Airport transfer';
    }
    return '';
  };

  // Enhanced select cab function with fare update
  const enhancedSelectCab = (cab: CabType) => {
    const fare = getDisplayFare(cab);
    
    // Flash the selected cab briefly
    setFadeIn(prev => ({
      ...prev,
      [cab.id]: true
    }));
    
    setTimeout(() => {
      setFadeIn(prev => ({
        ...prev,
        [cab.id]: false
      }));
    }, 500);
    
    // Notify parent about selection with fare
    onSelectCab(cab, fare);
    
    // Notify about fare calculation if callback provided
    if (onFareCalculated) {
      onFareCalculated(fare);
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
        cabTypes.map((cab) => (
          <div 
            key={cab.id || `cab-${Math.random()}`}
            className={`transition-all duration-300 ${fadeIn[cab.id] ? 'bg-yellow-50' : ''}`}
            data-last-update={lastUpdateTimestamp}
          >
            <CabOptionCard 
              cab={cab}
              fare={getDisplayFare(cab)}
              isSelected={selectedCabId === cab.id}
              onSelect={() => enhancedSelectCab(cab)}
              fareDetails={getFareDetails(cab)}
              isCalculating={isCalculatingFares}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default CabList;
