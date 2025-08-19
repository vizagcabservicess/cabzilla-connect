import React, { useEffect, useState } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CabListProps {
  cabTypes: CabType[];
  selectedCabId?: string;
  onSelectCab: (cab: CabType, fare: number, breakdown?: any) => void;
  distance: number;
  tripType: string; // Changed from TripType to string to match useFare
  tripMode: TripMode | string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
  isCalculatingFares: boolean;
  selectedCabBreakdown?: any;
}

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType, fare: number, breakdown?: any) => void;
  distance: number;
  tripType: string; // Changed from TripType to string to match useFare
  tripMode: TripMode | string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
  isCalculatingFares: boolean;
}

// Clear the fare cache to ensure fresh data
export const clearFareCache = () => {
  window.dispatchEvent(new CustomEvent('clearFareCache', {
    detail: { timestamp: Date.now() }
  }));
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
  isCalculatingFares,
  // selectedCabBreakdown prop removed as it's not in the interface
}) => {
  const isMobile = useIsMobile();
  const [hasSelectedCab, setHasSelectedCab] = useState(false);

  // Ensure we're working with fresh data
  useEffect(() => {
    // Clear stale fares older than 30 minutes
    const now = Date.now();
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('fare_')) {
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
          // If it's not valid JSON, remove it
          localStorage.removeItem(key);
        }
      }
    });
  }, []);

  const handleCabSelect = (cab: CabType, fare: number, breakdown?: any) => {
    setHasSelectedCab(true);
    onSelectCab(cab, fare, breakdown);
  };

  // Clear fare cache when key parameters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      clearFareCache();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cabTypes, distance, tripType, hourlyPackage]);

  return (
    <CabList
      cabTypes={cabTypes}
      selectedCabId={selectedCab?.id || null}
      handleSelectCab={handleCabSelect}
      isCalculatingFares={isCalculatingFares}
      distance={distance}
      tripType={tripType}
      tripMode={tripMode}
      packageType={hourlyPackage}
      pickupDate={pickupDate}
      returnDate={returnDate}
      // selectedCabBreakdown removed
    />
  );
};

// Add default export for backward compatibility
export default CabOptions;
