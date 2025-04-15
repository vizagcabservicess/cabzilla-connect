
import React, { useEffect, useState } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';
import { getLocalPackagePriceFromApi, fetchAndCacheLocalFares } from '@/lib/packageData';

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
  const [isCalculatingFares, setIsCalculatingFares] = useState<boolean>(true);
  const [lastFareUpdate, setLastFareUpdate] = useState<number>(Date.now());
  const [pendingBookingSummaryFareRequests, setPendingBookingSummaryFareRequests] = useState<Record<string, boolean>>({});
  const [fareUpdateTriggered, setFareUpdateTriggered] = useState<boolean>(false);
  const [initialAirportFaresLoaded, setInitialAirportFaresLoaded] = useState<boolean>(false);

  // Store the current trip type in sessionStorage for better fare syncing
  useEffect(() => {
    sessionStorage.setItem('tripType', tripType.toString());
    
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
      
      // Special handling for different trip types
      if (tripType === 'airport') {
        setInitialAirportFaresLoaded(false);
        
        // Pre-load airport fares for all cabs
        if (!initialAirportFaresLoaded) {
          preloadAirportFares();
        }
        
        // Reset our fare update tracker when trip type changes
        setFareUpdateTriggered(false);
      } else if (tripType === 'local' && hourlyPackage) {
        // Load local package fares for all cabs when trip type is local
        loadLocalPackageFares();
      }
    } catch (error) {
      console.error('Error dispatching trip type change event:', error);
    }
  }, [tripType, tripMode]);
  
  // Handle hourly package changes for local trips
  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      loadLocalPackageFares();
    }
  }, [hourlyPackage, tripType]);
  
  // Function to load local package fares from API
  const loadLocalPackageFares = async () => {
    if (tripType !== 'local' || !hourlyPackage) return;
    
    console.log('CabOptions: Loading local package fares from API');
    setIsCalculatingFares(true);
    
    try {
      // Fetch all local fares from the API
      const allFares = await fetchAndCacheLocalFares();
      const updatedFares: Record<string, number> = {};
      
      // For each cab, get the price for the selected package
      cabTypes.forEach(async (cab) => {
        try {
          const price = await getLocalPackagePriceFromApi(hourlyPackage, cab.id);
          if (price > 0) {
            updatedFares[cab.id] = price;
            
            // Emit fare-calculated event for this cab
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: cab.id,
                tripType: 'local',
                tripMode: tripMode,
                hourlyPackage,
                calculated: true,
                fare: price,
                timestamp: Date.now()
              }
            }));
          } else {
            // If no price, use a fallback
            updatedFares[cab.id] = cab.price || 2000;
          }
        } catch (error) {
          console.error(`Error getting fare for ${cab.id}:`, error);
          updatedFares[cab.id] = cab.price || 2000;
        }
      });
      
      // Update state with all fares
      setCabFares(updatedFares);
      setLastFareUpdate(Date.now());
    } catch (error) {
      console.error('Error loading local package fares:', error);
      
      // Fallback: Use existing cab prices
      const fallbackFares: Record<string, number> = {};
      cabTypes.forEach(cab => {
        fallbackFares[cab.id] = cab.price || 2000;
      });
      setCabFares(fallbackFares);
    } finally {
      setIsCalculatingFares(false);
    }
  };
  
  // New function to preload airport fares
  const preloadAirportFares = () => {
    if (tripType !== 'airport' || initialAirportFaresLoaded) return;
    
    console.log('CabOptions: Preloading airport fares for all cabs');
    
    // Now trigger fare calculation requests for all cabs
    cabTypes.forEach((cab, index) => {
      // Stagger requests to avoid overwhelming the system
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('request-fare-calculation', {
          detail: {
            cabId: cab.id,
            cabName: cab.name,
            tripType: 'airport',
            timestamp: Date.now() + index
          }
        }));
      }, index * 100);
    });
    
    setInitialAirportFaresLoaded(true);
  };

  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    // Store the current trip type in sessionStorage for better fare syncing
    sessionStorage.setItem('tripType', tripType.toString());
    
    // Emit event when a cab is selected, which BookingSummary will listen for
    const cabFare = cabFares[cab.id] || 0;
    const now = Date.now();
    
    try {
      // First emit event without fare to ensure component selection state updates
      window.dispatchEvent(new CustomEvent('cab-selected', {
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          tripType: tripType,
          tripMode: tripMode,
          timestamp: now
        }
      }));
      
      // For local trips, fetch the exact fare from the API before emitting with fare
      if (tripType === 'local' && hourlyPackage) {
        getLocalPackagePriceFromApi(hourlyPackage, cab.id)
          .then(price => {
            // Then emit with fare information
            window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
              detail: {
                cabType: cab.id,
                cabName: cab.name,
                fare: price,
                tripType: tripType,
                tripMode: tripMode,
                hourlyPackage,
                timestamp: now + 1 // Use different timestamp to prevent event merging
              }
            }));
            console.log(`CabOptions: Dispatched fare update event for ${cab.id}: ${price}`);
          })
          .catch(error => {
            console.error(`Error getting fare for ${cab.id}:`, error);
            // Emit with existing fare as fallback
            window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
              detail: {
                cabType: cab.id,
                cabName: cab.name,
                fare: cabFare,
                tripType: tripType,
                tripMode: tripMode,
                hourlyPackage,
                timestamp: now + 1
              }
            }));
          });
      } else {
        // For other trip types, use existing fare
        window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
          detail: {
            cabType: cab.id,
            cabName: cab.name,
            fare: cabFare,
            tripType: tripType,
            tripMode: tripMode,
            timestamp: now + 1 // Use different timestamp to prevent event merging
          }
        }));
        console.log(`CabOptions: Dispatched fare update event for ${cab.id}: ${cabFare}`);
      }
      
      // For airport transfers, use a debounced request for fare recalculation
      if (tripType === 'airport' && !pendingBookingSummaryFareRequests[cab.id]) {
        // Mark this request as pending
        setPendingBookingSummaryFareRequests(prev => ({
          ...prev,
          [cab.id]: true
        }));
        
        // Use setTimeout to add debouncing
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('request-fare-calculation', {
            detail: {
              cabId: cab.id,
              cabName: cab.name,
              tripType: tripType,
              tripMode: tripMode,
              timestamp: now + 2 // Different timestamp
            }
          }));
          
          // Delay the booking summary request
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
              detail: {
                cabId: cab.id,
                cabName: cab.name,
                tripType: tripType,
                tripMode: tripMode,
                timestamp: now + 3 // Different timestamp
              }
            }));
            
            // Clear the pending state after a delay
            setTimeout(() => {
              setPendingBookingSummaryFareRequests(prev => ({
                ...prev,
                [cab.id]: false
              }));
            }, 1000);
          }, 100);
        }, 0);
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

  // Load actual fares based on trip type
  useEffect(() => {
    setIsCalculatingFares(true);
    
    try {
      // For local trips, load from API
      if (tripType === 'local' && hourlyPackage) {
        loadLocalPackageFares();
      } 
      // For airport transfers, trigger fare calculation
      else if (tripType === 'airport' && !fareUpdateTriggered) {
        setTimeout(() => {
          if (!initialAirportFaresLoaded) {
            preloadAirportFares();
          }
          setFareUpdateTriggered(true);
          setIsCalculatingFares(false);
        }, 500);
      } 
      // For other trip types, use a simple calculation for now
      else {
        const calculatedFares: Record<string, number> = {};
        cabTypes.forEach(cab => {
          // Use cab's pre-defined price if available, otherwise calculate
          if (cab.price && cab.price > 0) {
            calculatedFares[cab.id] = cab.price;
          } else {
            // Basic calculation based on distance and cab type
            const baseFare = distance * (
              cab.id.includes('luxury') ? 20 : 
              cab.id.includes('innova') ? 15 : 
              cab.id.includes('ertiga') ? 12 : 10
            );
            calculatedFares[cab.id] = Math.max(baseFare, 800); // Ensure minimum fare
          }
        });
        setCabFares(calculatedFares);
        setIsCalculatingFares(false);
      }
      
      // CRITICAL FIX: If we already have a selected cab, emit an event with its fare
      if (selectedCab && tripType === 'local' && hourlyPackage) {
        getLocalPackagePriceFromApi(hourlyPackage, selectedCab.id)
          .then(price => {
            if (price > 0) {
              window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
                detail: {
                  cabType: selectedCab.id,
                  cabName: selectedCab.name,
                  fare: price,
                  tripType: tripType,
                  tripMode: tripMode,
                  hourlyPackage,
                  timestamp: Date.now()
                }
              }));
              console.log(`CabOptions: Dispatched fare update event for existing selected cab ${selectedCab.id}: ${price}`);
            }
          })
          .catch(error => {
            console.error(`Error getting fare for ${selectedCab.id}:`, error);
          });
      }
    } catch (error) {
      console.error('Error loading fares:', error);
      // Fallback to simple calculation
      const fallbackFares: Record<string, number> = {};
      cabTypes.forEach(cab => {
        fallbackFares[cab.id] = distance * (cab.id === 'luxury' ? 20 : cab.id === 'innova' ? 15 : 10);
      });
      setCabFares(fallbackFares);
      setIsCalculatingFares(false);
    }
  }, [cabTypes, distance, tripType, hourlyPackage, selectedCab, tripMode, fareUpdateTriggered]);

  // Listen for fare calculation events and update our fares accordingly
  useEffect(() => {
    const handleFareCalculated = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.fare > 0) {
        const { cabId, fare, tripType: eventTripType, calculated = false } = event.detail;
        console.log(`CabOptions: Received fare-calculated event for ${cabId}: ${fare}, calculated=${calculated}`);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabId]: fare };
          return updated;
        });
        
        // Update timestamp to force re-renders
        setLastFareUpdate(Date.now());
        
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
                hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
                timestamp: Date.now()
              }
            }));
            console.log(`CabOptions: Re-emitted fare update for selected cab ${cabId}: ${fare}`);
          } catch (error) {
            console.error('Error dispatching cab selection event:', error);
          }
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
        
        // Update timestamp to force re-renders
        setLastFareUpdate(Date.now());
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
              hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
              timestamp: Date.now()
            }
          }));
        }
      }
    };
    
    // Handle local fares updated event
    const handleLocalFaresUpdated = () => {
      console.log('CabOptions: Detected local fares updated event, refreshing fares');
      if (tripType === 'local' && hourlyPackage) {
        loadLocalPackageFares();
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
    window.addEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
      window.removeEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated as EventListener);
    };
  }, [cabFares, selectedCab, tripType, tripMode, hourlyPackage]);

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
