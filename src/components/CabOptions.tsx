
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
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState(true);

  // Store the current trip type in localStorage for better fare syncing
  useEffect(() => {
    localStorage.setItem('tripType', tripType.toString());
    
    // When trip type changes, dispatch an event to notify other components
    try {
      window.dispatchEvent(new CustomEvent('trip-type-changed', {
        detail: {
          tripType: tripType,
          tripMode: tripMode,
          timestamp: Date.now()
        }
      }));
      console.log(`CabOptions: Dispatched trip-type-changed event for ${tripType}`);
      
      // Clear fare cache in localStorage when trip type changes
      if (tripType === 'airport') {
        localStorage.setItem('forceCacheRefresh', 'true');
        setTimeout(() => {
          localStorage.removeItem('forceCacheRefresh');
        }, 500);
      }
    } catch (error) {
      console.error('Error dispatching trip type change event:', error);
    }
  }, [tripType, tripMode]);

  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    // Store the current trip type in localStorage for better fare syncing
    localStorage.setItem('tripType', tripType.toString());
    
    // Emit event when a cab is selected, which BookingSummary will listen for
    const cabFare = cabFares[cab.id] || 0;
    
    try {
      // First emit event without fare to ensure component selection state updates
      window.dispatchEvent(new CustomEvent('cab-selected', {
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          tripType: tripType,
          tripMode: tripMode,
          timestamp: Date.now()
        }
      }));
      
      // Then emit with fare information
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
      
      // For airport transfers, trigger an explicit request for fare recalculation
      if (tripType === 'airport') {
        window.dispatchEvent(new CustomEvent('request-fare-calculation', {
          detail: {
            cabId: cab.id,
            cabName: cab.name,
            tripType: tripType,
            tripMode: tripMode,
            timestamp: Date.now()
          }
        }));
        
        // Also explicitly request a fare from BookingSummary
        window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
          detail: {
            cabId: cab.id,
            cabName: cab.name,
            tripType: tripType,
            tripMode: tripMode,
            timestamp: Date.now()
          }
        }));
      }
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

  // Load actual fares from localStorage and listen for fare calculation events
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
            }
            
            // For airport transfers, prioritize dynamically calculated fares
            if (tripType === 'airport') {
              const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
              const storedFare = localStorage.getItem(localStorageKey);
              if (storedFare) {
                fares[cab.id] = parseInt(storedFare, 10);
                console.log(`Found fare for ${cab.id} in localStorage: ${fares[cab.id]}`);
                return;
              }
            } else {
              // For other trip types, use the standard localStorage key
              const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
              const storedFare = localStorage.getItem(localStorageKey);
              if (storedFare) {
                fares[cab.id] = parseInt(storedFare, 10);
                console.log(`Found fare for ${cab.id} in localStorage: ${fares[cab.id]}`);
                return;
              }
            }
            
            // If still not found, use a reasonable default fare
            if (!fares[cab.id]) {
              // Fallback to cab's pre-defined price if available
              if (cab.price && cab.price > 0) {
                fares[cab.id] = cab.price;
              } else {
                // Last resort - calculate a reasonable fare based on type
                const baseFare = distance * (
                  cab.id.includes('luxury') ? 20 : 
                  cab.id.includes('innova') ? 15 : 
                  cab.id.includes('ertiga') ? 12 : 10
                );
                fares[cab.id] = Math.max(baseFare, 800); // Ensure minimum fare
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
      
      // CRITICAL FIX: If we already have a selected cab, emit an event with its fare
      // This ensures BookingSummary gets the correct fare immediately
      if (selectedCab && actualFares[selectedCab.id] > 0) {
        try {
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: selectedCab.id,
              cabName: selectedCab.name,
              fare: actualFares[selectedCab.id],
              tripType: tripType,
              tripMode: tripMode,
              timestamp: Date.now()
            }
          }));
          console.log(`CabOptions: Dispatched fare update event for existing selected cab ${selectedCab.id}: ${actualFares[selectedCab.id]}`);
          
          // For airport transfers, also request booking summary fare
          if (tripType === 'airport') {
            window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
              detail: {
                cabId: selectedCab.id,
                cabName: selectedCab.name,
                tripType: tripType,
                tripMode: tripMode,
                timestamp: Date.now()
              }
            }));
          }
        } catch (error) {
          console.error('Error dispatching cab selection event:', error);
        }
      }
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
  }, [cabTypes, distance, tripType, hourlyPackage, selectedCab, tripMode]);

  // Listen for fare calculation events and update our fares accordingly
  useEffect(() => {
    const handleFareCalculated = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.fare > 0) {
        const { cabId, fare, tripType: eventTripType, calculated = false } = event.detail;
        console.log(`CabOptions: Received fare-calculated event for ${cabId}: ${fare}, calculated=${calculated}`);
        
        // For airport transfers in particular, we want to update immediately
        if (tripType === 'airport' || eventTripType === 'airport') {
          console.log(`CabOptions: Updating fare for airport transfer ${cabId}: ${fare}`);
          
          setCabFares(prev => {
            const updated = { ...prev, [cabId]: fare };
            return updated;
          });
          
          // Save to localStorage for other components
          const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
          localStorage.setItem(localStorageKey, fare.toString());
          
          // Re-emit as cab-selected-with-fare if this is the currently selected cab
          if (selectedCab?.id === cabId) {
            try {
              window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
                detail: {
                  cabType: cabId,
                  cabName: selectedCab.name,
                  fare: fare,
                  tripType: tripType,
                  tripMode: tripMode,
                  timestamp: Date.now()
                }
              }));
              console.log(`CabOptions: Re-emitted fare update for selected cab ${cabId}: ${fare}`);
            } catch (error) {
              console.error('Error dispatching cab selection event:', error);
            }
          }
        } else {
          setCabFares(prev => {
            const updated = { ...prev, [cabId]: fare };
            return updated;
          });
        }
      }
    };
    
    // Handle direct fare update events
    const handleDirectFareUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.cabType && event.detail.fare > 0) {
        const { cabType, fare, calculated = false } = event.detail;
        console.log(`CabOptions: Received direct fare update for ${cabType}: ${fare}, calculated=${calculated}`);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabType]: fare };
          return updated;
        });
        
        // For airport transfers, store this fare and notify other components
        if (tripType === 'airport' && calculated) {
          const localStorageKey = `fare_${tripType}_${cabType.toLowerCase()}`;
          localStorage.setItem(localStorageKey, fare.toString());
          
          // Re-emit as a fare-calculated event to ensure CabList gets updated
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: cabType,
                tripType: tripType,
                tripMode: tripMode,
                calculated: true,
                fare: fare,
                timestamp: Date.now()
              }
            }));
          }, 50);
        }
      }
    };
    
    // Handle request for fare recalculation
    const handleRequestFareCalculation = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && selectedCab?.id === event.detail.cabId) {
        console.log(`CabOptions: Received fare recalculation request for ${event.detail.cabId}`);
        
        // If this is the currently selected cab, trigger fare event with latest fare
        if (cabFares[event.detail.cabId] > 0) {
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: event.detail.cabId,
              cabName: event.detail.cabName || selectedCab.name,
              fare: cabFares[event.detail.cabId],
              tripType: tripType,
              tripMode: tripMode,
              timestamp: Date.now()
            }
          }));
        }
      }
    };
    
    // Handle significant fare difference events from BookingSummary
    const handleSignificantFareDifference = (event: CustomEvent) => {
      if (event.detail && event.detail.calculatedFare && event.detail.cabId) {
        const { calculatedFare, parentFare, cabId } = event.detail;
        console.log(`CabOptions: Received significant fare difference for ${cabId}: calculated=${calculatedFare}, parent=${parentFare}`);
        
        if (tripType === 'airport') {
          // Update our fares with the calculatedFare
          setCabFares(prev => {
            const updated = { ...prev, [cabId]: calculatedFare };
            return updated;
          });
          
          // Save to localStorage
          const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
          localStorage.setItem(localStorageKey, calculatedFare.toString());
          
          // Emit an event for the CabList to update
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: cabId,
                tripType: tripType,
                tripMode: tripMode,
                calculated: true,
                fare: calculatedFare,
                timestamp: Date.now()
              }
            }));
          }, 50);
        }
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
    window.addEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
      window.removeEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    };
  }, [cabFares, selectedCab, tripType, tripMode]);

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
