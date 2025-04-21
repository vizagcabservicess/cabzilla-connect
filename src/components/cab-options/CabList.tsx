import React, { useEffect, useState, useRef } from 'react';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  isAirportTransfer?: boolean; // Added isAirportTransfer prop
}

export function CabList({
  cabTypes,
  selectedCabId,
  cabFares,
  isCalculatingFares,
  handleSelectCab,
  getFareDetails,
  isAirportTransfer, // Added isAirportTransfer prop
}: CabListProps) {
  const [displayedFares, setDisplayedFares] = useState<Record<string, number>>({});
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const { fareData } = useFare(selectedCabId || '', tripType, distance, packageType);
  const updateTimeoutRef = useRef<number | null>(null);
  const directUpdateEnabledRef = useRef<boolean>(true);
  const fareCalculatedTimestampsRef = useRef<Record<string, number>>({});
  const calculatedFaresRef = useRef<Record<string, {fare: number, timestamp: number}>>({});

  // Initialize displayed fares from cabFares on first render or when cabTypes change
  useEffect(() => {
    if (!initializedRef.current && Object.keys(cabFares).length > 0) {
      console.log('CabList: Initial fare setup', cabFares);
      setDisplayedFares({...cabFares});

      // Initialize fare history for each cab
      const newFareHistory: Record<string, number[]> = {};
      Object.keys(cabFares).forEach(cabId => {
        if (cabFares[cabId] > 0) {
          newFareHistory[cabId] = [cabFares[cabId]];
        }
      });
      fareHistoryRef.current = newFareHistory;

      initializedRef.current = true;
    }
  }, [cabFares, cabTypes]);

  // Process any pending updates
  const processPendingUpdates = () => {
    if (Object.keys(pendingUpdatesRef.current).length === 0 || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    console.log('CabList: Processing pending fare updates:', pendingUpdatesRef.current);

    const newFadeIn: Record<string, boolean> = {};
    const updatedFares: Record<string, number> = {...displayedFares};
    let hasChanges = false;

    // Process all pending updates
    Object.entries(pendingUpdatesRef.current).forEach(([cabId, fare]) => {
      if (fare > 0 && fare !== displayedFares[cabId]) {
        newFadeIn[cabId] = true;
        updatedFares[cabId] = fare;

        // Update fare history
        if (!fareHistoryRef.current[cabId]) {
          fareHistoryRef.current[cabId] = [];
        }
        fareHistoryRef.current[cabId].push(fare);

        // Keep history limited to last 5 fares
        if (fareHistoryRef.current[cabId].length > 5) {
          fareHistoryRef.current[cabId] = fareHistoryRef.current[cabId].slice(-5);
        }

        hasChanges = true;
        console.log(`CabList: Updating fare for ${cabId} to ${fare}`);

        // Immediately dispatch event for this fare update if it's the selected cab
        if (selectedCabId === cabId) {
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: cabId,
              cabName: cabTypes.find(cab => cab.id === cabId)?.name || cabId,
              fare: fare,
              timestamp: Date.now()
            }
          }));
        }
      }
    });

    // Clear pending updates
    pendingUpdatesRef.current = {};

    // Apply updates if any valid changes were detected
    if (hasChanges) {
      setFadeIn(newFadeIn);
      refreshCountRef.current += 1;

      // Set a timestamp for this update
      const updateTime = Date.now();
      setLastUpdateTimestamp(updateTime);
      localStorage.setItem('lastFareUpdateTimestamp', updateTime.toString());

      // After a short delay, update the displayed fares
      setTimeout(() => {
        setDisplayedFares(updatedFares);

        // After animation completes, remove the fade-in effect
        setTimeout(() => {
          setFadeIn({});
          isProcessingRef.current = false;
        }, 400);
      }, 50);
    } else {
      isProcessingRef.current = false;
    }
  };

  // Schedule processing of updates
  const scheduleUpdate = () => {
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = window.setTimeout(() => {
      processPendingUpdates();
      updateTimeoutRef.current = null;
    }, 50) as unknown as number;
  };

  // Update displayed fares when cabFares changes
  useEffect(() => {
    // Skip if still initializing or no fares are available
    if (!initializedRef.current || Object.keys(cabFares).length === 0) return;

    // Check each cab for fare updates
    Object.keys(cabFares).forEach(cabId => {
      // Only process valid fares
      if (cabFares[cabId] === undefined || cabFares[cabId] === null || cabFares[cabId] <= 0) return;

      // Compare new fare with current displayed fare
      if (cabFares[cabId] !== displayedFares[cabId]) {
        console.log(`CabList: Adding pending update for ${cabId}, fare: ${cabFares[cabId]}`);
        pendingUpdatesRef.current[cabId] = cabFares[cabId];
      }
    });

    // Schedule an update if we have pending updates
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      scheduleUpdate();
    }
  }, [cabFares, displayedFares]);

  // Reset refresh counter periodically (every 2 minutes instead of 5)
  useEffect(() => {
    const resetInterval = setInterval(() => {
      refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
    }, 2 * 60 * 1000);

    return () => clearInterval(resetInterval);
  }, []);

  // Listen for direct cab selection with fare events
  useEffect(() => {
    const handleCabSelectedWithFare = (event: Event) => {
      if (!directUpdateEnabledRef.current) return;

      const customEvent = event as CustomEvent;
      console.log('CabList: Received cab-selected-with-fare event', customEvent.detail);

      if (customEvent.detail && customEvent.detail.cabType && customEvent.detail.fare) {
        const { cabType, fare, timestamp } = customEvent.detail;

        // Add to pending updates
        if (fare > 0) {
          pendingUpdatesRef.current[cabType] = fare;
          scheduleUpdate();
        }
      }
    };

    const handleFareCalculated = (event: Event) => {
      if (!directUpdateEnabledRef.current) return;

      const customEvent = event as CustomEvent;
      console.log('CabList: Received fare-calculated event', customEvent.detail);

      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, calculated = false, timestamp = Date.now(), tripType } = customEvent.detail;

        // For airport transfers, we should prioritize the calculated fare from BookingSummary
        const tripTypeFromStorage = localStorage.getItem('tripType');
        const isAirportTransferFromProps = isAirportTransfer; // Use prop if available
        const isAirportTransfer = isAirportTransferFromProps !== undefined ? isAirportTransferFromProps : (tripType === 'airport' || tripTypeFromStorage === 'airport');

        // Always store the calculated fare in our reference so we can use it when needed
        if (calculated) {
          calculatedFaresRef.current[cabId] = { fare, timestamp };
          console.log(`CabList: Stored calculated fare for ${cabId}: ${fare}`);
        }

        // Store the timestamp of this fare calculation
        fareCalculatedTimestampsRef.current[cabId] = timestamp;

        // Give higher priority to calculated fares for airport transfers
        if (fare > 0) {
          if (isAirportTransfer && calculated) {
            // For calculated airport fares, use them immediately with high priority
            console.log(`CabList: Using calculated airport fare for ${cabId}: ${fare}`);
            pendingUpdatesRef.current[cabId] = fare;

            // Update localStorage with this calculated fare
            try {
              const localStorageKey = `fare_${tripType || 'airport'}_${cabId.toLowerCase()}`;
              localStorage.setItem(localStorageKey, fare.toString());
            } catch (e) {
              console.error('Error updating localStorage with calculated fare:', e);
            }

            // Process immediately for calculated airport fares
            processPendingUpdates();
          } else {
            // For other fare updates, add to pending and schedule update
            pendingUpdatesRef.current[cabId] = fare;
            scheduleUpdate();
          }
        }
      }
    };

    // Special handler for airport fare updates from BookingSummary
    const handleSignificantFareDifference = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) return;

      const { calculatedFare, parentFare, cabId, tripType } = customEvent.detail;

      if (cabId && calculatedFare > 0 && tripType === 'airport') {
        console.log(`CabList: Received significant fare difference for ${cabId}: calculated=${calculatedFare}, parent=${parentFare}`);

        // Update our calculated fares reference
        calculatedFaresRef.current[cabId] = { fare: calculatedFare, timestamp: Date.now() };

        // Add to pending updates for immediate processing
        pendingUpdatesRef.current[cabId] = calculatedFare;
        processPendingUpdates();
      }
    };

    // Process any immediate updates when a cab is selected
    const handleCabSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabType) {
        console.log('CabList: Received cab-selected event', customEvent.detail);

        // Update fadeIn effect for the selected cab
        setFadeIn(prev => ({
          ...prev,
          [customEvent.detail.cabType]: true
        }));

        // If fare is provided in the event, update it immediately
        if (customEvent.detail.fare && customEvent.detail.fare > 0) {
          pendingUpdatesRef.current[customEvent.detail.cabType] = customEvent.detail.fare;
          processPendingUpdates();
        }

        // Schedule clearing the effect
        setTimeout(() => {
          setFadeIn(prev => ({
            ...prev,
            [customEvent.detail.cabType]: false
          }));
        }, 500);
      }
    };

    // Handle trip type changes as well
    const handleTripTypeChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('CabList: Received trip-type-changed event', customEvent.detail);

      // Force reset display and pending updates
      initializedRef.current = false;
      pendingUpdatesRef.current = {};
      isProcessingRef.current = false;
      fareCalculatedTimestampsRef.current = {};
      calculatedFaresRef.current = {};

      if (customEvent.detail && customEvent.detail.tripType) {
        const tripType = customEvent.detail.tripType;

        // Reset fares when changing trip types
        setDisplayedFares({});
        fareHistoryRef.current = {};
      }
    };

    // Enable throttled direct updates after a short delay to prevent initial loops
    setTimeout(() => {
      directUpdateEnabledRef.current = true;
    }, 1000);

    window.addEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
    window.addEventListener('fare-calculated', handleFareCalculated);
    window.addEventListener('cab-selected', handleCabSelected);
    window.addEventListener('trip-type-changed', handleTripTypeChanged);
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference);
    window.addEventListener('fare-cache-cleared', () => {
      console.log('CabList: Fare cache cleared, resetting update flags');
      isProcessingRef.current = false;
      refreshCountRef.current = 0;
      fareCalculatedTimestampsRef.current = {};
      calculatedFaresRef.current = {};
    });

    return () => {
      window.removeEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('cab-selected', handleCabSelected);
      window.removeEventListener('trip-type-changed', handleTripTypeChanged);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference);
      window.removeEventListener('fare-cache-cleared', () => {});

      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [cabTypes, selectedCabId, isAirportTransfer]); // Added isAirportTransfer to dependency array

  // Helper to get the most reliable fare
  const getDisplayFare = (cab: CabType): number => {
    if (selectedCabId === cab.id && fareData) {
      return fareData.totalPrice;
    }
    return cabFares[cab.id] || 0;
  };

    // Then check localStorage for persistence
    const tripType = localStorage.getItem('tripType');
    const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
    const storedFare = localStorage.getItem(localStorageKey);
    if (storedFare) {
      const parsedFare = parseInt(storedFare, 10);
      if (parsedFare > 0) {
        return parsedFare;
      }
    }

    // For airport transfers, first check if we have a calculated fare from BookingSummary
    const isAirportTransferFromProps = isAirportTransfer; // Use prop if available
    const isAirportTransferToUse = isAirportTransferFromProps !== undefined ? isAirportTransferFromProps : (tripType === 'airport' || localStorage.getItem('tripType') === 'airport');

    if (isAirportTransferToUse && calculatedFaresRef.current[cabId] && calculatedFaresRef.current[cabId].fare > 0) {
      console.log(`CabList: Using calculated fare for ${cabId}: ${calculatedFaresRef.current[cabId].fare}`);
      return calculatedFaresRef.current[cabId].fare;
    }

    // Check if we have a very recent fare calculation from BookingSummary
    if (isSelected && isAirportTransferToUse) {
      // Try to get fare from localStorage (which BookingSummary updates)
      const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
      const storedFare = localStorage.getItem(localStorageKey);
      if (storedFare) {
        const parsedFare = parseInt(storedFare, 10);
        if (parsedFare > 0) {
          console.log(`CabList: Using localStorage fare for ${cabId}: ${parsedFare}`);
          return parsedFare;
        }
      }
    }

    // Otherwise use the displayed fare if available
    if (displayedFares[cabId] && displayedFares[cabId] > 0) {
      return displayedFares[cabId];
    }

    // For airport transfers, check if there's a cached fare from the fare calculation service
    if (isAirportTransferToUse) {
      const airportFareKey = `fare_airport_${cabId.toLowerCase()}`;
      const airportFare = localStorage.getItem(airportFareKey);
      if (airportFare) {
        const parsedFare = parseInt(airportFare, 10);
        if (parsedFare > 0) {
          return parsedFare;
        }
      }
    }

    // Then try the latest fare from cabFares
    if (cabFares[cabId] && cabFares[cabId] > 0) {
      return cabFares[cabId];
    }

    // Then try the price from the cab object itself
    if (cab.price && cab.price > 0) {
      return cab.price;
    }

    // Finally try the fare history
    if (fareHistoryRef.current[cabId] && fareHistoryRef.current[cabId].length > 0) {
      // Get the most recent non-zero fare
      for (let i = fareHistoryRef.current[cabId].length - 1; i >= 0; i--) {
        if (fareHistoryRef.current[cabId][i] > 0) {
          return fareHistoryRef.current[cabId][i];
        }
      }
    }

    // If all else fails, return a fallback value based on vehicle type
    const fallbackPrices: Record<string, number> = {
      'sedan': 1500,
      'ertiga': 2000,
      'innova': 2500,
      'innova_crysta': 2500,
      'luxury': 3500,
      'tempo': 4000
    };

    const vehicleType = cabId.toLowerCase();
    return fallbackPrices[vehicleType] || 2000;
  };

  // Helper to create a more smooth cab selection and ensure fare updates
  const enhancedSelectCab = (cab: CabType) => {
    // Call the parent handler
    handleSelectCab(cab);

    // Provide immediate visual feedback
    setFadeIn(prev => ({
      ...prev,
      [cab.id]: true
    }));

    // Get the current fare for this cab
    const currentFare = getDisplayFare(cab);

    // Dispatch custom event with selected cab and fare
    window.dispatchEvent(new CustomEvent('cab-selected', {
      bubbles: true,
      detail: {
        cabType: cab.id,
        cabName: cab.name,
        fare: currentFare,
        timestamp: Date.now()
      }
    }));

    // If we have a valid fare, also dispatch a fare event
    if (currentFare > 0) {
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        bubbles: true,
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: currentFare,
          timestamp: Date.now()
        }
      }));

      // For airport transfers, also trigger a full fare recalculation
      const tripType = localStorage.getItem('tripType');
      const isAirportTransferToUse = isAirportTransfer !== undefined ? isAirportTransfer : (tripType === 'airport' || localStorage.getItem('tripType') === 'airport');
      if (isAirportTransferToUse) {
        // After a short delay, ask for fare recalculation
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('request-fare-calculation', {
            bubbles: true,
            detail: {
              cabId: cab.id,
              cabName: cab.name,
              timestamp: Date.now()
            }
          }));
        }, 50);
      }
    }

    // Clear the highlight after animation
    setTimeout(() => {
      setFadeIn(prev => ({
        ...prev,
        [cab.id]: false
      }));
    }, 500);
  };

  // Render component
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
}