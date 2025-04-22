
import React, { useEffect, useState } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CabListProps {
  cabTypes: CabType[];
  selectedCabId?: string;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: TripType | string;
  tripMode: TripMode | string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: TripType | string;
  tripMode: TripMode | string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

// This component adapts the properties from parent components to what CabList expects
export const CabOptions: React.FC<CabOptionsProps> = ({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate,
}) => {
  const isMobile = useIsMobile();
  const [hasSelectedCab, setHasSelectedCab] = useState(false);
  const [isCalculatingFares, setIsCalculatingFares] = useState(true);

  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    // Store the current trip type in localStorage for better fare syncing
    localStorage.setItem('tripType', tripType.toString());
    
    // Emit event when a cab is selected, which BookingSummary will listen for
    try {
      const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
      const storedFare = localStorage.getItem(localStorageKey);
      const cabFare = storedFare ? parseFloat(storedFare) : 0;
      
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: cabFare,
          tripType: tripType,
          tripMode: tripMode,
          timestamp: Date.now()
        }
      }));
      console.log(`CabOptions: Dispatched fare update event for ${cab.id}: ${cabFare}`);
    } catch (error) {
      console.error('Error dispatching cab selection event:', error);
    }
  };

  // Scroll to booking summary when a cab is selected
  useEffect(() => {
    if (selectedCab && hasSelectedCab) {
      // Wait a brief moment for UI to update before scrolling
      setTimeout(() => {
        const bookingSummaryElement = document.getElementById('booking-summary');
        if (bookingSummaryElement) {
          bookingSummaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // If element not found, try to find any element with "summary" in the id or class
          const alternativeSummaryElement = 
            document.querySelector('[id*="summary" i], [class*="summary" i]') || 
            document.querySelector('[id*="book" i], [class*="book" i]');
          
          if (alternativeSummaryElement) {
            alternativeSummaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        setHasSelectedCab(false); // Reset after scrolling
      }, 100);
    }
  }, [selectedCab, hasSelectedCab]);

  // Load initial state and listen for fare calculation events
  useEffect(() => {
    setIsCalculatingFares(true);
    
    // Listen for fare calculation events to update loading state
    const handleFareCalculated = () => {
      setIsCalculatingFares(false);
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    
    // Set a timeout to ensure we don't show the loading state forever
    const timeoutId = setTimeout(() => {
      setIsCalculatingFares(false);
    }, 3000);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      clearTimeout(timeoutId);
    };
  }, [cabTypes, distance, tripType, hourlyPackage]);

  return (
    <CabList
      cabTypes={cabTypes}
      selectedCabId={selectedCab?.id || null}
      isCalculatingFares={isCalculatingFares}
      handleSelectCab={handleCabSelect}
      tripType={tripType}
      tripMode={tripMode}
      distance={distance}
      packageType={hourlyPackage}
    />
  );
};

// Add default export for backward compatibility
export default CabOptions;
