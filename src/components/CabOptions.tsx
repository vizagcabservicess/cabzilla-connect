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
  tripType: string; // Changed from TripType to string to match useFare
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
  tripType: string; // Changed from TripType to string to match useFare
  tripMode: TripMode | string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

// Clear all fares, but also force a complete cache refresh for all keys
export const clearFareCache = () => {
  console.log('Clearing fare cache from localStorage');
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('fare_') || key.startsWith('selected_fare_')) {
      localStorage.removeItem(key);
    }
  });
  // Dispatch event to notify components of cache clearing
  window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
    detail: { timestamp: Date.now() }
  }));
  // Add a localStorage flag to force refresh
  localStorage.setItem('forceCacheRefresh', 'true');
};

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

  // On mount, clear all stale fares, and force refresh just in case
  useEffect(() => {
    clearFareCache();
    // Clear fares older than 30 minutes as a fallback
    const now = Date.now();
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    Object.keys(localStorage).forEach(key => {
      if ((key.startsWith('fare_') || key.startsWith('selected_fare_'))) {
        try {
          const fareJson = localStorage.getItem(key);
          if (fareJson) {
            const fareObj = JSON.parse(fareJson);
            if (fareObj.timestamp && fareObj.timestamp < thirtyMinutesAgo) {
              localStorage.removeItem(key);
              console.log(`CabOptions: Cleared stale fare: ${key}`);
            }
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });
  }, [tripType, hourlyPackage, tripMode, distance]);

  const handleCabSelect = (cab: CabType, fare: number, fareSource: string) => {
    onSelectCab(cab);
    setHasSelectedCab(true);

    // Store trip and package for coordination
    localStorage.setItem('tripType', tripType.toString());
    localStorage.setItem('currentPackage', hourlyPackage || '');

    // Forward cab/fare event for BookingSummary listener, enforce normalized keys
    try {
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: fare,
          fareSource: fareSource,
          tripType: tripType,
          tripMode: tripMode,
          hourlyPackage: hourlyPackage,
          timestamp: Date.now()
        }
      }));
      console.log(`CabOptions: Dispatched cab-selected-with-fare for ${cab.id}: ${fare} [source=${fareSource}, package=${hourlyPackage}]`);
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
