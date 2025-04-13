import React, { useEffect, useState } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFareSyncTracker } from '@/hooks/useFareSyncTracker';
import { dispatchFareEvent, shouldShowDriverAllowance } from '@/lib';

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
  const [calculatedAirportFares, setCalculatedAirportFares] = useState<Record<string, number>>({});
  const [forceSyncAttempted, setForceSyncAttempted] = useState<boolean>(false);
  const [previousTripType, setPreviousTripType] = useState<string>(tripType?.toString() || '');
  const [fareSyncCounter, setFareSyncCounter] = useState<number>(0);
  
  // Use the fare tracker to prevent duplicate events
  const fareTracker = useFareSyncTracker();

  // Store the current trip type in localStorage for better fare syncing
  useEffect(() => {
    localStorage.setItem('tripType', tripType.toString());
    
    // If trip type has changed, we need to clear fare cache and force a refresh
    if (previousTripType !== tripType.toString()) {
      console.log(`CabOptions: Trip type changed from ${previousTripType} to ${tripType}`);
      setPreviousTripType(tripType.toString());
      setCabFares({});
      setCalculatedAirportFares({});
      setForceSyncAttempted(false);
      setInitialAirportFaresLoaded(false);
      fareTracker.resetTracking(); // Reset tracked dispatches on trip type change
      localStorage.setItem('forceCacheRefresh', 'true');
      
      // Reset our fare update tracker when trip type changes
      setFareUpdateTriggered(false);
      
      // Dispatch event to notify other components about trip type change
      dispatchFareEvent('trip-type-changed', {
        tripType: tripType,
        tripMode: tripMode
      });
      
      // Clear fare cache in localStorage immediately after trip type changes
      setTimeout(() => {
        localStorage.removeItem('forceCacheRefresh');
        // For airport transfers, preload all fares immediately
        if (tripType === 'airport' && !initialAirportFaresLoaded) {
          preloadAllFares();
        }
      }, 100);
    }
  }, [tripType, tripMode, previousTripType]);
  
  // More aggressive preloading of all fares to ensure immediate display
  const preloadAllFares = () => {
    if (initialAirportFaresLoaded) return;
    
    console.log('CabOptions: Preloading ALL fares for all cabs');
    
    // First, try to load fares from localStorage
    const loadedFares: Record<string, number> = {};
    let foundAny = false;
    
    cabTypes.forEach(cab => {
      const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
      const storedFare = localStorage.getItem(localStorageKey);
      
      if (storedFare) {
        const parsedFare = parseInt(storedFare, 10);
        if (!isNaN(parsedFare) && parsedFare > 0) {
          loadedFares[cab.id] = parsedFare;
          fareTracker.trackFare(cab.id, parsedFare);
          foundAny = true;
          
          // Emit fare-calculated event for this cab
          dispatchFareEvent('fare-calculated', {
            cabId: cab.id,
            tripType: tripType,
            tripMode: tripMode,
            calculated: true,
            fare: parsedFare,
            forceSync: true
          });
        }
      }
    });
    
    if (foundAny) {
      setCabFares(prev => ({...prev, ...loadedFares}));
      if (tripType === 'airport') {
        setCalculatedAirportFares(loadedFares);
      }
    }
    
    // Now trigger fare calculation requests for all cabs with minimal delay
    cabTypes.forEach((cab, index) => {
      // Use minimal delay to prevent API flooding but still load quickly
      setTimeout(() => {
        // Only request if we don't already have a fare
        if (!loadedFares[cab.id] || !fareTracker.isFareChanged(cab.id, loadedFares[cab.id])) {
          dispatchFareEvent('request-fare-calculation', {
            cabId: cab.id,
            cabName: cab.name,
            tripType: tripType,
            forceSync: true
          });
        }
      }, index * 30);
    });
    
    // Trigger an immediate fare sync for the whole system
    dispatchFareEvent('request-fare-sync', {
      tripType: tripType,
      forceSync: true,
      instant: true
    });
    
    setInitialAirportFaresLoaded(true);
    setForceSyncAttempted(true);
    setFareSyncCounter(prev => prev + 1);
  };

  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    // Store the current trip type in localStorage for better fare syncing
    localStorage.setItem('tripType', tripType.toString());
    
    // Calculate the fare to use - prioritize calculated fares
    const cabFare = tripType === 'airport' && calculatedAirportFares[cab.id] 
      ? calculatedAirportFares[cab.id] 
      : cabFares[cab.id] || 0;
    
    try {
      // First emit event without fare to ensure component selection state updates
      dispatchFareEvent('cab-selected', {
        cabType: cab.id,
        cabName: cab.name,
        tripType: tripType,
        tripMode: tripMode
      });
      
      // Only dispatch fare update if it's a new value
      if (fareTracker.isFareChanged(cab.id, cabFare)) {
        fareTracker.trackFare(cab.id, cabFare);
        
        // CRITICAL FIX: Add explicit flag for driver allowance based on trip type
        const showDriverAllowance = shouldShowDriverAllowance(tripType.toString(), tripMode.toString());
        
        // Then emit with fare information
        dispatchFareEvent('cab-selected-with-fare', {
          cabType: cab.id,
          cabName: cab.name,
          fare: cabFare,
          tripType: tripType,
          tripMode: tripMode,
          forceSync: true, // Always force sync on explicit selection
          showDriverAllowance: showDriverAllowance,
          noDriverAllowance: tripType === 'airport' // Explicit flag for airport transfers
        });
        
        console.log(`CabOptions: Dispatched fare update event for ${cab.id}: ${cabFare}, showDriverAllowance: ${showDriverAllowance}`);
      } else {
        console.log(`CabOptions: Skipped duplicate fare dispatch for ${cab.id}: ${cabFare}`);
      }
      
      // For ALL trip types, request fare calculation with minimal debouncing
      if (!pendingBookingSummaryFareRequests[cab.id]) {
        // Mark this request as pending
        setPendingBookingSummaryFareRequests(prev => ({
          ...prev,
          [cab.id]: true
        }));
        
        // CRITICAL FIX: Add explicit flag for driver allowance based on trip type
        const showDriverAllowance = shouldShowDriverAllowance(tripType.toString(), tripMode.toString());
        
        // Use minimal timeout to debounce but still update quickly
        setTimeout(() => {
          dispatchFareEvent('request-fare-calculation', {
            cabId: cab.id,
            cabName: cab.name,
            tripType: tripType,
            tripMode: tripMode,
            forceSync: true,
            showDriverAllowance: showDriverAllowance,
            noDriverAllowance: tripType === 'airport' // Explicit flag for airport transfers
          });
          
          // Delay the booking summary request very slightly
          setTimeout(() => {
            dispatchFareEvent('request-booking-summary-fare', {
              cabId: cab.id,
              cabName: cab.name,
              tripType: tripType,
              tripMode: tripMode,
              forceSync: true,
              showDriverAllowance: showDriverAllowance,
              noDriverAllowance: tripType === 'airport' // Explicit flag for airport transfers
            });
            
            // Clear the pending state after a short delay
            setTimeout(() => {
              setPendingBookingSummaryFareRequests(prev => ({
                ...prev,
                [cab.id]: false
              }));
            }, 200);
          }, 20);
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
            // For all trip types, prioritize dynamically calculated fares from localStorage
            const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
            const storedFare = localStorage.getItem(localStorageKey);
            if (storedFare) {
              const parsedFare = parseInt(storedFare, 10);
              if (!isNaN(parsedFare) && parsedFare > 0) {
                fares[cab.id] = parsedFare;
                fareTracker.trackFare(cab.id, parsedFare);
                console.log(`Found fare for ${cab.id} in localStorage: ${fares[cab.id]}`);
                // Also store in airport fares if applicable
                if (tripType === 'airport') {
                  setCalculatedAirportFares(prev => ({...prev, [cab.id]: parsedFare}));
                }
                return;
              }
            }
            
            if (tripType === "local" && hourlyPackage) {
              // For local packages, check for the specific package fare
              if (hourlyPackage) {
                // Try to load from price matrix in localStorage
                const priceMatrixStr = localStorage.getItem('localPackagePriceMatrix');
                if (priceMatrixStr) {
                  try {
                    const priceMatrix = JSON.parse(priceMatrixStr);
                    
                    // Check if we have pricing for this specific package and cab
                    if (priceMatrix && priceMatrix[hourlyPackage] && priceMatrix[hourlyPackage][cab.id.toLowerCase()]) {
                      fares[cab.id] = priceMatrix[hourlyPackage][cab.id.toLowerCase()];
                      fareTracker.trackFare(cab.id, fares[cab.id]);
                      console.log(`Found fare for ${cab.id} in price matrix: ${fares[cab.id]}`);
                      return;
                    }
                  } catch (e) {
                    console.error('Error parsing price matrix:', e);
                  }
                }
              }
            }
            
            // If still not found, use a reasonable default fare based on cab type
            if (!fares[cab.id] || fares[cab.id] <= 0) {
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
      
      // IMPORTANT: For airport transfers, trigger immediate fare calculation
      if (tripType === 'airport' && !fareUpdateTriggered) {
        setTimeout(() => {
          if (!initialAirportFaresLoaded) {
            preloadAllFares();
          }
          setFareUpdateTriggered(true);
        }, 100);
      }
      
      // CRITICAL FIX: If we already have a selected cab, emit an event with its fare
      // This ensures BookingSummary gets the correct fare immediately
      if (selectedCab) {
        const fareToUse = tripType === 'airport' && calculatedAirportFares[selectedCab.id]
          ? calculatedAirportFares[selectedCab.id]
          : actualFares[selectedCab.id];
          
        if (fareToUse > 0 && fareTracker.isFareChanged(selectedCab.id, fareToUse)) {
          fareTracker.trackFare(selectedCab.id, fareToUse);
          
          try {
            dispatchFareEvent('cab-selected-with-fare', {
              cabType: selectedCab.id,
              cabName: selectedCab.name,
              fare: fareToUse,
              tripType: tripType,
              tripMode: tripMode,
              forceSync: true,
              showDriverAllowance: shouldShowDriverAllowance(tripType.toString(), tripMode.toString())
            });
            
            console.log(`CabOptions: Dispatched fare update event for existing selected cab ${selectedCab.id}: ${fareToUse}`);
            
            // For all trip types, also request booking summary fare update
            if (!pendingBookingSummaryFareRequests[selectedCab.id]) {
              setPendingBookingSummaryFareRequests(prev => ({
                ...prev,
                [selectedCab.id]: true
              }));
              
              setTimeout(() => {
                dispatchFareEvent('request-booking-summary-fare', {
                  cabId: selectedCab.id,
                  cabName: selectedCab.name,
                  tripType: tripType,
                  tripMode: tripMode,
                  forceSync: true,
                  showDriverAllowance: shouldShowDriverAllowance(tripType.toString(), tripMode.toString())
                });
                
                // Clear pending state
                setTimeout(() => {
                  setPendingBookingSummaryFareRequests(prev => ({
                    ...prev,
                    [selectedCab.id]: false
                  }));
                }, 200);
              }, 0);
            }
          } catch (error) {
            console.error('Error dispatching cab selection event:', error);
          }
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
  }, [cabTypes, distance, tripType, hourlyPackage, selectedCab, tripMode, fareUpdateTriggered, calculatedAirportFares]);

  // Listen for fare calculation events and update our fares accordingly
  useEffect(() => {
    const handleFareCalculated = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.fare > 0) {
        const { cabId, fare, tripType: eventTripType, calculated = false, noDriverAllowance = false } = event.detail;
        
        // Prevent duplicate updates if the fare hasn't changed
        if (!fareTracker.isFareChanged(cabId, fare)) {
          console.log(`CabOptions: Skipping duplicate fare update for ${cabId}: ${fare} (no change)`);
          return;
        }
        
        console.log(`CabOptions: Received fare-calculated event for ${cabId}: ${fare}, calculated=${calculated}, noDriverAllowance=${noDriverAllowance}`);
        
        // Track this fare to prevent future duplicates
        fareTracker.trackFare(cabId, fare);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabId]: fare };
          return updated;
        });
        
        // Also update specialized fare storage
        if (tripType === 'airport' || eventTripType === 'airport') {
          setCalculatedAirportFares(prev => ({...prev, [cabId]: fare}));
        }
        
        // Save to localStorage for other components
        const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
        localStorage.setItem(localStorageKey, fare.toString());
        
        // Update timestamp to force re-renders
        setLastFareUpdate(Date.now());
        
        // Re-emit as cab-selected-with-fare if this is the currently selected cab
        if (selectedCab?.id === cabId) {
          // CRITICAL FIX: Determine if driver allowance should be shown based on trip type
          const showDriverAllowance = shouldShowDriverAllowance(
            eventTripType || tripType.toString(), 
            tripMode.toString()
          );
          
          dispatchFareEvent('cab-selected-with-fare', {
            cabType: cabId,
            cabName: selectedCab.name,
            fare: fare,
            tripType: eventTripType || tripType,
            tripMode: tripMode,
            forceSync: true,
            showDriverAllowance: showDriverAllowance,
            noDriverAllowance: eventTripType === 'airport' || tripType === 'airport' // Explicit flag
          });
        }
      }
    };
    
    // Handle direct fare update events
    const handleDirectFareUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.cabType && event.detail.fare > 0) {
        const { cabType, fare, calculated = false } = event.detail;
        
        // Prevent duplicate updates if the fare hasn't changed
        if (!fareTracker.isFareChanged(cabType, fare)) {
          console.log(`CabOptions: Skipping duplicate direct fare update for ${cabType}: ${fare} (no change)`);
          return;
        }
        
        console.log(`CabOptions: Received direct fare update for ${cabType}: ${fare}, calculated=${calculated}`);
        
        // Track this fare to prevent future duplicates
        fareTracker.trackFare(cabType, fare);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabType]: fare };
          return updated;
        });
        
        // Update timestamp to force re-renders
        setLastFareUpdate(Date.now());
        
        // For airport transfers, store this fare and notify other components
        if (tripType === 'airport' && calculated) {
          const localStorageKey = `fare_${tripType}_${cabType.toLowerCase()}`;
          localStorage.setItem(localStorageKey, fare.toString());
          
          // Update airport fares for dedicated tracking
          setCalculatedAirportFares(prev => ({...prev, [cabType]: fare}));
          
          // Re-emit as a fare-calculated event to ensure CabList gets updated
          dispatchFareEvent('fare-calculated', {
            cabId: cabType,
            tripType: tripType,
            tripMode: tripMode,
            calculated: true,
            fare: fare,
            forceSync: true
          });
        }
      }
    };
    
    // Handle request for fare recalculation
    const handleRequestFareCalculation = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId) {
        const { cabId } = event.detail;
        console.log(`CabOptions: Received fare recalculation request for ${cabId}`);
        
        // If this is the currently selected cab, trigger fare event with latest fare
        if (selectedCab?.id === cabId) {
          const fareToUse = tripType === 'airport' && calculatedAirportFares[cabId]
            ? calculatedAirportFares[cabId]
            : cabFares[cabId];
          
          if (fareToUse > 0 && fareTracker.isFareChanged(cabId, fareToUse)) {
            // Track this fare to prevent future duplicates
            fareTracker.trackFare(cabId, fareToUse);
            
            dispatchFareEvent('cab-selected-with-fare', {
              cabType: cabId,
              cabName: event.detail.cabName || selectedCab.name,
              fare: fareToUse,
              tripType: tripType,
              tripMode: tripMode,
              forceSync: true,
              showDriverAllowance: shouldShowDriverAllowance(tripType.toString(), tripMode.toString())
            });
          }
        } else {
          // Even if not selected, we should update the fare in our local state
          const fareToUse = tripType === 'airport' && calculatedAirportFares[cabId]
            ? calculatedAirportFares[cabId]
            : cabFares[cabId];
          
          if (fareToUse > 0 && fareTracker.isFareChanged(cabId, fareToUse)) {
            // Track this fare to prevent future duplicates
            fareTracker.trackFare(cabId, fareToUse);
            
            dispatchFareEvent('fare-calculated', {
              cabId: cabId,
              tripType: tripType,
              tripMode: tripMode,
              calculated: true,
              fare: fareToUse,
              forceSync: true
            });
          }
        }
      }
    };
    
    // Handle request for fare sync
    const handleRequestFareSync = (event: CustomEvent) => {
      if (!event.detail) return;
      
      const { tripType: eventTripType, instant = false } = event.detail;
      console.log(`CabOptions: Received request-fare-sync event for ${eventTripType || 'all'} trips, instant=${instant}`);
      
      // Check if this is a duplicate sync request we can skip
      if (fareTracker.shouldThrottle('sync', 500) && !instant) {
        console.log(`CabOptions: Skipping sync request, throttled`);
        return;
      }
      
      // Track this sync attempt
      fareTracker.trackFare('sync', Date.now());
      
      if ((tripType === 'airport' && (eventTripType === 'airport' || !eventTripType)) || instant) {
        if (!forceSyncAttempted || instant) {
          preloadAllFares();
          setForceSyncAttempted(true);
          setFareSyncCounter(prev => prev + 1);
        }
      }
    };
    
    // Handle significant fare difference events from BookingSummary
    const handleSignificantFareDifference = (event: CustomEvent) => {
      if (event.detail && event.detail.calculatedFare && event.detail.cabId) {
        const { calculatedFare, parentFare, cabId } = event.detail;
        
        // Skip if fare hasn't changed
        if (!fareTracker.isFareChanged(cabId, calculatedFare)) {
          console.log(`CabOptions: Skipping significant fare difference for ${cabId} (no change)`);
          return;
        }
        
        console.log(`CabOptions: Received significant fare difference for ${cabId}: calculated=${calculatedFare}, parent=${parentFare}`);
        
        // Track this fare to prevent future duplicates
        fareTracker.trackFare(cabId, calculatedFare);
        
        // Update our fares with the calculatedFare
        setCabFares(prev => {
          const updated = { ...prev, [cabId]: calculatedFare };
          return updated;
        });
        
        // Update specialized storage
        if (tripType === 'airport') {
          setCalculatedAirportFares(prev => ({...prev, [cabId]: calculatedFare}));
        }
        
        // Save to localStorage
        const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
        localStorage.setItem(localStorageKey, calculatedFare.toString());
        
        // Update timestamp to force re-renders
        setLastFareUpdate(Date.now());
        
        // Emit an event for the CabList to update
        dispatchFareEvent('fare-calculated', {
          cabId: cabId,
          tripType: tripType,
          tripMode: tripMode,
          calculated: true,
          fare: calculatedFare,
          forceSync: true,
          showDriverAllowance: shouldShowDriverAllowance(tripType.toString(), tripMode.toString())
        });
      }
    };
    
    // Listen for all fare-related events
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
    window.addEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
    window.addEventListener('request-fare-sync', handleRequestFareSync as EventListener);
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    
    // Trigger initial sync for all trips - but only once
    if (!forceSyncAttempted) {
      setTimeout(() => {
        dispatchFareEvent('request-fare-sync', {
          tripType: tripType,
          forceSync: true,
          instant: true
        });
        
        setForceSyncAttempted(true);
      }, 200);
    }
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
      window.removeEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
      window.removeEventListener('request-fare-sync', handleRequestFareSync as EventListener);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    };
  }, [cabFares, selectedCab, tripType, tripMode, calculatedAirportFares, forceSyncAttempted, fareSyncCounter, lastFareUpdate]);

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
    <div className="mt-6">
      <CabList
        cabTypes={cabTypes}
        selectedCabId={selectedCab?.id || null}
        cabFares={cabFares}
        isCalculatingFares={isCalculatingFares}
        handleSelectCab={handleCabSelect}
        getFareDetails={(cab) => (
          tripType === "local" && hourlyPackage
            ? hourlyPackage.replace('-', ' hrs, ').replace('km', ' km')
            : `${distance} km`
        )}
        tripType={tripType.toString()}
      />
    </div>
  );
};

// Add default export for backward compatibility
export default CabOptions;
