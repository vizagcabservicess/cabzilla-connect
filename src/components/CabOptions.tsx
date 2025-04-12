
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

  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
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

  // Set up data for the CabList component with actual fares
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState(true);
  
  // Load actual fares from localStorage
  useEffect(() => {
    setIsCalculatingFares(true);
    
    try {
      // Try to find actual fares from localStorage first
      const loadActualFares = () => {
        const fares: Record<string, number> = {};
        
        // For each cab type, attempt to get the fare from localStorage
        cabTypes.forEach(cab => {
          try {
            // For local packages, check for the specific package fare
            if (tripType === 'local' && hourlyPackage) {
              // Try to load from price matrix in localStorage
              const priceMatrixStr = localStorage.getItem('localPackagePriceMatrix');
              if (priceMatrixStr) {
                const priceMatrix = JSON.parse(priceMatrixStr);
                
                // Check if we have pricing for this specific package and cab
                if (priceMatrix[hourlyPackage] && priceMatrix[hourlyPackage][cab.id.toLowerCase()]) {
                  fares[cab.id] = priceMatrix[hourlyPackage][cab.id.toLowerCase()];
                  console.log(`Found fare for ${cab.id} in price matrix: ${fares[cab.id]}`);
                  return;
                }
              }
            } else if (tripType === 'airport') {
              // For airport trips, check for the specific airport fare in localStorage
              const airportFareKey = `airport_fare_${cab.id.toLowerCase()}`;
              const storedFare = localStorage.getItem(airportFareKey);
              if (storedFare) {
                const fareValue = parseInt(storedFare, 10);
                if (!isNaN(fareValue) && fareValue > 0) {
                  fares[cab.id] = fareValue;
                  console.log(`Found airport fare for ${cab.id} in localStorage: ${fares[cab.id]}`);
                  return;
                }
              }
            }
            
            // General fare lookup based on trip type
            const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
            const storedFare = localStorage.getItem(localStorageKey);
            if (storedFare) {
              const fareValue = parseInt(storedFare, 10);
              if (!isNaN(fareValue) && fareValue > 0) {
                fares[cab.id] = fareValue;
                console.log(`Found fare for ${cab.id} in localStorage: ${fares[cab.id]}`);
                return;
              }
            }
            
            // If still not found, use a reasonable default fare based on cab's pre-defined price
            if (!fares[cab.id]) {
              // Fallback to cab's pre-defined price if available
              if (cab.price && cab.price > 0) {
                fares[cab.id] = cab.price;
              } else {
                // Last resort - calculate a reasonable fare based on type and distance
                const baseRate = cab.id.includes('luxury') ? 20 : 
                              cab.id.includes('innova') ? 15 : 
                              cab.id.includes('ertiga') ? 12 : 10;
                
                // For airport, we use different calculation
                if (tripType === 'airport') {
                  // Base fare for airport transfers
                  const baseFare = cab.id.includes('luxury') ? 1500 : 
                                cab.id.includes('innova') ? 1200 : 
                                cab.id.includes('ertiga') ? 1000 : 800;
                  fares[cab.id] = baseFare;
                } else {
                  const baseFare = distance * baseRate;
                  fares[cab.id] = Math.max(baseFare, 800); // Ensure minimum fare
                }
              }
            }
          } catch (error) {
            console.error(`Error getting fare for ${cab.id}:`, error);
            // Fallback calculation
            fares[cab.id] = distance * (cab.id === 'luxury' ? 20 : cab.id === 'innova' ? 15 : 10);
          }
        });
        
        return fares;
      };
      
      // Set the calculated fares
      const actualFares = loadActualFares();
      setCabFares(actualFares);
    } catch (error) {
      console.error('Error loading actual fares:', error);
      // Fallback to simple calculation
      const fallbackFares: Record<string, number> = {};
      cabTypes.forEach(cab => {
        fallbackFares[cab.id] = distance * (cab.id === 'luxury' ? 20 : cab.id === 'innova' ? 15 : 10);
      });
      setCabFares(fallbackFares);
    } finally {
      setIsCalculatingFares(false);
    }
  }, [cabTypes, distance, tripType, hourlyPackage]);

  // Generate fare details string
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return 'Local package';
    } else if (tripType === 'airport') {
      return 'Airport transfer';
    } else {
      return tripMode === 'round-trip' ? 'Round trip' : 'One way';
    }
  };

  return (
    <CabList
      cabTypes={cabTypes}
      selectedCabId={selectedCab?.id || null}
      cabFares={cabFares}
      isCalculatingFares={isCalculatingFares}
      handleSelectCab={handleCabSelect}
      getFareDetails={getFareDetails}
    />
  );
};

// Add default export for backward compatibility
export default CabOptions;
