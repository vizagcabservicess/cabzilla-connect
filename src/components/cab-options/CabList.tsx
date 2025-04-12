
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
}

export function CabList({
  cabTypes,
  selectedCabId,
  cabFares,
  isCalculatingFares,
  handleSelectCab,
  getFareDetails
}: CabListProps) {
  const [displayedFares, setDisplayedFares] = useState<Record<string, number>>({});
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  const refreshCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const initializedRef = useRef(false);
  const fareHistoryRef = useRef<Record<string, number[]>>({});
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const updateTimeoutRef = useRef<number | null>(null);
  const directUpdateEnabledRef = useRef<boolean>(true);
  const fareCalculatedTimestampsRef = useRef<Record<string, number>>({});
  const calculatedFaresRef = useRef<Record<string, {fare: number, timestamp: number}>>({});
  const tripTypeRef = useRef<string | null>(null);
  // Add a new ref to track and prevent recursive requests
  const requestedBookingSummaryFaresRef = useRef<Record<string, boolean>>({});
  // Track the last request time per cab
  const lastRequestTimeRef = useRef<Record<string, number>>({});
  // Throttling cooldown period in milliseconds (1 second)
  const REQUEST_THROTTLE_MS = 1000;
  
  useEffect(() => {
    const storedTripType = localStorage.getItem('tripType');
    if (storedTripType) {
      tripTypeRef.current = storedTripType;
      console.log(`CabList: Retrieved trip type from localStorage: ${storedTripType}`);
    }
  }, []);
  
  useEffect(() => {
    if (!initializedRef.current && Object.keys(cabFares).length > 0) {
      console.log('CabList: Initial fare setup', cabFares);
      setDisplayedFares({...cabFares});
      
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
  
  const processPendingUpdates = () => {
    if (Object.keys(pendingUpdatesRef.current).length === 0 || isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    console.log('CabList: Processing pending fare updates:', pendingUpdatesRef.current);
    
    const newFadeIn: Record<string, boolean> = {};
    const updatedFares: Record<string, number> = {...displayedFares};
    let hasChanges = false;
    
    Object.entries(pendingUpdatesRef.current).forEach(([cabId, fare]) => {
      if (fare > 0 && fare !== displayedFares[cabId]) {
        newFadeIn[cabId] = true;
        updatedFares[cabId] = fare;
        
        if (!fareHistoryRef.current[cabId]) {
          fareHistoryRef.current[cabId] = [];
        }
        fareHistoryRef.current[cabId].push(fare);
        
        if (fareHistoryRef.current[cabId].length > 5) {
          fareHistoryRef.current[cabId] = fareHistoryRef.current[cabId].slice(-5);
        }
        
        hasChanges = true;
        console.log(`CabList: Updating fare for ${cabId} to ${fare}`);
        
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
    
    pendingUpdatesRef.current = {};
    
    if (hasChanges) {
      setFadeIn(newFadeIn);
      refreshCountRef.current += 1;
      
      const updateTime = Date.now();
      setLastUpdateTimestamp(updateTime);
      localStorage.setItem('lastFareUpdateTimestamp', updateTime.toString());
      
      setTimeout(() => {
        setDisplayedFares(updatedFares);
        
        setTimeout(() => {
          setFadeIn({});
          isProcessingRef.current = false;
        }, 400);
      }, 50);
    } else {
      isProcessingRef.current = false;
    }
  };
  
  const scheduleUpdate = () => {
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = window.setTimeout(() => {
      processPendingUpdates();
      updateTimeoutRef.current = null;
    }, 50) as unknown as number;
  };
  
  useEffect(() => {
    if (!initializedRef.current || Object.keys(cabFares).length === 0) return;
    
    Object.keys(cabFares).forEach(cabId => {
      if (cabFares[cabId] === undefined || cabFares[cabId] === null || cabFares[cabId] <= 0) return;
      
      if (cabFares[cabId] !== displayedFares[cabId]) {
        console.log(`CabList: Adding pending update for ${cabId}, fare: ${cabFares[cabId]}`);
        pendingUpdatesRef.current[cabId] = cabFares[cabId];
      }
    });
    
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      scheduleUpdate();
    }
  }, [cabFares, displayedFares]);
  
  useEffect(() => {
    const resetInterval = setInterval(() => {
      refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
    }, 2 * 60 * 1000);
    
    return () => clearInterval(resetInterval);
  }, []);
  
  useEffect(() => {
    const handleCabSelectedWithFare = (event: Event) => {
      if (!directUpdateEnabledRef.current) return;
      
      const customEvent = event as CustomEvent;
      console.log('CabList: Received cab-selected-with-fare event', customEvent.detail);
      
      if (customEvent.detail && customEvent.detail.cabType && customEvent.detail.fare) {
        const { cabType, fare, timestamp, tripType } = customEvent.detail;
        
        if (fare > 0) {
          pendingUpdatesRef.current[cabType] = fare;
          
          if (tripType === 'airport') {
            const localStorageKey = `fare_${tripType}_${cabType.toLowerCase()}`;
            localStorage.setItem(localStorageKey, fare.toString());
            console.log(`CabList: Updated localStorage with airport fare for ${cabType}: ${fare}`);
          }
          
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
        
        if (tripType) {
          tripTypeRef.current = tripType;
        }
        
        const isAirportTransfer = tripType === 'airport' || tripTypeRef.current === 'airport';
        
        if (calculated) {
          calculatedFaresRef.current[cabId] = { fare, timestamp };
          console.log(`CabList: Stored calculated fare for ${cabId}: ${fare}`);
          
          if (isAirportTransfer) {
            const localStorageKey = `fare_${tripType || 'airport'}_${cabId.toLowerCase()}`;
            localStorage.setItem(localStorageKey, fare.toString());
            console.log(`CabList: Updated localStorage with calculated airport fare for ${cabId}: ${fare}`);
          }
        }
        
        fareCalculatedTimestampsRef.current[cabId] = timestamp;
        
        if (fare > 0) {
          if (isAirportTransfer) {
            console.log(`CabList: Using calculated airport fare for ${cabId}: ${fare}`);
            pendingUpdatesRef.current[cabId] = fare;
            
            processPendingUpdates();
          } else {
            pendingUpdatesRef.current[cabId] = fare;
            scheduleUpdate();
          }
        }
      }
    };
    
    const handleSignificantFareDifference = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) return;
      
      const { calculatedFare, parentFare, cabId, tripType } = customEvent.detail;
      
      if (cabId && calculatedFare > 0 && tripType === 'airport') {
        console.log(`CabList: Received significant fare difference for ${cabId}: calculated=${calculatedFare}, parent=${parentFare}`);
        
        calculatedFaresRef.current[cabId] = { fare: calculatedFare, timestamp: Date.now() };
        
        const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
        localStorage.setItem(localStorageKey, calculatedFare.toString());
        
        pendingUpdatesRef.current[cabId] = calculatedFare;
        processPendingUpdates();
        
        setDisplayedFares(prev => ({
          ...prev,
          [cabId]: calculatedFare
        }));
      }
    };
    
    const handleCabSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabType) {
        console.log('CabList: Received cab-selected event', customEvent.detail);
        
        setFadeIn(prev => ({
          ...prev,
          [customEvent.detail.cabType]: true
        }));
        
        if (customEvent.detail.fare && customEvent.detail.fare > 0) {
          pendingUpdatesRef.current[customEvent.detail.cabType] = customEvent.detail.fare;
          processPendingUpdates();
        }
        
        setTimeout(() => {
          setFadeIn(prev => ({
            ...prev,
            [customEvent.detail.cabType]: false
          }));
        }, 500);
      }
    };
    
    const handleTripTypeChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('CabList: Received trip-type-changed event', customEvent.detail);
      
      initializedRef.current = false;
      pendingUpdatesRef.current = {};
      isProcessingRef.current = false;
      fareCalculatedTimestampsRef.current = {};
      calculatedFaresRef.current = {};
      requestedBookingSummaryFaresRef.current = {}; // Reset the request tracking
      lastRequestTimeRef.current = {}; // Reset throttling timestamps
      
      if (customEvent.detail && customEvent.detail.tripType) {
        tripTypeRef.current = customEvent.detail.tripType;
        
        setDisplayedFares({});
        fareHistoryRef.current = {};
      }
    };
    
    const handleRequestFareCalculation = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId) {
        console.log(`CabList: Received request for fare calculation for ${customEvent.detail.cabId}`);
        
        const isAirportTransfer = tripTypeRef.current === 'airport';
        
        if (isAirportTransfer && calculatedFaresRef.current[customEvent.detail.cabId]) {
          const calculatedFare = calculatedFaresRef.current[customEvent.detail.cabId].fare;
          console.log(`CabList: Using stored calculated fare for ${customEvent.detail.cabId}: ${calculatedFare}`);
          
          setDisplayedFares(prev => ({
            ...prev,
            [customEvent.detail.cabId]: calculatedFare
          }));
          
          pendingUpdatesRef.current[customEvent.detail.cabId] = calculatedFare;
          processPendingUpdates();
        }
      }
    };
    
    const handleRequestBookingSummaryFare = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail || !customEvent.detail.cabId) return;
      
      const { cabId, cabName, tripType } = customEvent.detail;
      const now = Date.now();
      
      // FIX FOR STACK OVERFLOW: Check if we've already requested this fare recently
      // or if the cab is already tracked for a request
      if (requestedBookingSummaryFaresRef.current[cabId]) {
        console.log(`CabList: Skipping duplicate booking summary fare request for ${cabId}`);
        return;
      }
      
      // Throttle requests for the same cab
      const lastRequestTime = lastRequestTimeRef.current[cabId] || 0;
      if (now - lastRequestTime < REQUEST_THROTTLE_MS) {
        console.log(`CabList: Throttling booking summary fare request for ${cabId}, last request was ${now - lastRequestTime}ms ago`);
        return;
      }
      
      console.log(`CabList: Received request for booking summary fare for ${cabId}`);
      
      // Mark that we're requesting this fare to prevent duplicates
      requestedBookingSummaryFaresRef.current[cabId] = true;
      lastRequestTimeRef.current[cabId] = now;
      
      const isAirportTransfer = tripTypeRef.current === 'airport';
      
      if (isAirportTransfer && calculatedFaresRef.current[cabId]) {
        // Send the calculated fare we already have
        const calculatedFare = calculatedFaresRef.current[cabId].fare;
        
        // Use a timeout to prevent event loop congestion
        setTimeout(() => {
          // Dispatch the event
          window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
            detail: {
              cabType: cabId,
              cabName: cabName,
              fare: calculatedFare,
              tripType: 'airport',
              calculated: true,
              timestamp: now
            }
          }));
          
          // Clear the request flag after a slight delay to prevent immediate re-requests
          setTimeout(() => {
            requestedBookingSummaryFaresRef.current[cabId] = false;
          }, 500);
        }, 0);
      } else {
        // Forward the request, but don't recursively request again from this component
        setTimeout(() => {
          // Clear the request flag after a timeout
          requestedBookingSummaryFaresRef.current[cabId] = false;
        }, 500);
      }
    };
    
    const handleFareCacheCleared = () => {
      console.log('CabList: Fare cache cleared, resetting update flags');
      isProcessingRef.current = false;
      refreshCountRef.current = 0;
      fareCalculatedTimestampsRef.current = {};
      calculatedFaresRef.current = {};
      requestedBookingSummaryFaresRef.current = {};
      lastRequestTimeRef.current = {};
    };
    
    setTimeout(() => {
      directUpdateEnabledRef.current = true;
    }, 500);
    
    window.addEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
    window.addEventListener('fare-calculated', handleFareCalculated);
    window.addEventListener('cab-selected', handleCabSelected);
    window.addEventListener('trip-type-changed', handleTripTypeChanged);
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference);
    window.addEventListener('request-fare-calculation', handleRequestFareCalculation);
    window.addEventListener('request-booking-summary-fare', handleRequestBookingSummaryFare);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    
    return () => {
      window.removeEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('cab-selected', handleCabSelected);
      window.removeEventListener('trip-type-changed', handleTripTypeChanged);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference);
      window.removeEventListener('request-fare-calculation', handleRequestFareCalculation);
      window.removeEventListener('request-booking-summary-fare', handleRequestBookingSummaryFare);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
      
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [cabTypes, selectedCabId]);
  
  const getDisplayFare = (cab: CabType): number => {
    const cabId = cab.id;
    const isAirportTransfer = tripTypeRef.current === 'airport';
    
    // For airport transfers, prioritize calculated fares
    if (isAirportTransfer) {
      // First priority: Check if we have calculated fares
      if (calculatedFaresRef.current[cabId] && calculatedFaresRef.current[cabId].fare > 0) {
        console.log(`CabList: Using calculated fare for ${cabId}: ${calculatedFaresRef.current[cabId].fare}`);
        return calculatedFaresRef.current[cabId].fare;
      }
      
      // Second priority: Use displayed fare
      if (displayedFares[cabId] && displayedFares[cabId] > 0) {
        console.log(`CabList: Using displayed fare for ${cabId}: ${displayedFares[cabId]}`);
        return displayedFares[cabId];
      }
      
      // Third priority: Check localStorage
      const localStorageKey = `fare_${tripTypeRef.current}_${cabId.toLowerCase()}`;
      const storedFare = localStorage.getItem(localStorageKey);
      if (storedFare) {
        const parsedFare = parseInt(storedFare, 10);
        if (parsedFare > 0) {
          console.log(`CabList: Using localStorage fare for ${cabId}: ${parsedFare}`);
          return parsedFare;
        }
      }
    }
    
    // For non-airport transfers or fallback
    if (displayedFares[cabId] && displayedFares[cabId] > 0) {
      return displayedFares[cabId];
    }
    
    if (cabFares[cabId] && cabFares[cabId] > 0) {
      return cabFares[cabId];
    }
    
    if (cab.price && cab.price > 0) {
      return cab.price;
    }
    
    if (fareHistoryRef.current[cabId] && fareHistoryRef.current[cabId].length > 0) {
      for (let i = fareHistoryRef.current[cabId].length - 1; i >= 0; i--) {
        if (fareHistoryRef.current[cabId][i] > 0) {
          return fareHistoryRef.current[cabId][i];
        }
      }
    }
    
    // Fallback defaults
    const fallbackPrices: Record<string, number> = {
      'sedan': 800,
      'ertiga': 1000,
      'innova': 1200,
      'innova_crysta': 1200,
      'luxury': 1500,
      'tempo': 2000
    };
    
    const vehicleType = cabId.toLowerCase();
    return fallbackPrices[vehicleType] || 1000;
  };
  
  const enhancedSelectCab = (cab: CabType) => {
    const currentFare = getDisplayFare(cab);
    const tripType = tripTypeRef.current || localStorage.getItem('tripType');
    const isAirport = tripType === 'airport';
    
    // Call the parent's handler
    handleSelectCab(cab);
    
    // Add visual feedback
    setFadeIn(prev => ({
      ...prev,
      [cab.id]: true
    }));
    
    // Emit cab-selected event
    window.dispatchEvent(new CustomEvent('cab-selected', {
      bubbles: true,
      detail: {
        cabType: cab.id,
        cabName: cab.name,
        fare: currentFare,
        tripType: tripType,
        timestamp: Date.now()
      }
    }));
    
    // For airport transfers, request calculation only if we haven't already requested recently
    if (isAirport) {
      const now = Date.now();
      const lastRequestTime = lastRequestTimeRef.current[cab.id] || 0;
      
      if (!requestedBookingSummaryFaresRef.current[cab.id] && 
          (now - lastRequestTime > REQUEST_THROTTLE_MS)) {
        
        // Mark that we're making a request to prevent recursive loops
        requestedBookingSummaryFaresRef.current[cab.id] = true;
        lastRequestTimeRef.current[cab.id] = now;
        
        // Request fare calculation with a slight delay
        setTimeout(() => {
          if (isAirport) {
            window.dispatchEvent(new CustomEvent('request-fare-calculation', {
              bubbles: true,
              detail: {
                cabId: cab.id,
                cabName: cab.name,
                tripType: 'airport',
                timestamp: now
              }
            }));
            
            // Use a setTimeout to prevent immediate re-requesting
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
                bubbles: true,
                detail: {
                  cabId: cab.id,
                  cabName: cab.name,
                  tripType: 'airport',
                  timestamp: now + 1 // Ensure different timestamp
                }
              }));
              
              // Clear the request flag after a delay
              setTimeout(() => {
                requestedBookingSummaryFaresRef.current[cab.id] = false;
              }, 500);
            }, 100);
          }
        }, 0);
      }
    }
    
    // Emit cab-selected-with-fare if we have a fare
    if (currentFare > 0) {
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        bubbles: true,
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: currentFare,
          tripType: tripType,
          timestamp: Date.now()
        }
      }));
    }
    
    // Remove highlight after some time
    setTimeout(() => {
      setFadeIn(prev => ({
        ...prev,
        [cab.id]: false
      }));
    }, 500);
  };
  
  // Auto-update fares for airport transfers when component loads or is refreshed
  useEffect(() => {
    const isAirportTransfer = tripTypeRef.current === 'airport' || localStorage.getItem('tripType') === 'airport';
    
    if (isAirportTransfer && cabTypes.length > 0 && !isCalculatingFares && initializedRef.current) {
      console.log('CabList: Auto-triggering fare update for airport transfer cabs');
      
      // Process each cab type, but with throttling to prevent infinite loops
      cabTypes.forEach(cab => {
        // Skip if we already have a calculated fare
        if (calculatedFaresRef.current[cab.id]) {
          console.log(`CabList: Already have calculated fare for ${cab.id}: ${calculatedFaresRef.current[cab.id].fare}`);
          
          // Update displayed fare if different
          if (displayedFares[cab.id] !== calculatedFaresRef.current[cab.id].fare) {
            pendingUpdatesRef.current[cab.id] = calculatedFaresRef.current[cab.id].fare;
            scheduleUpdate();
          }
          return;
        }
        
        // Skip if we've recently requested this cab's fare
        const now = Date.now();
        const lastRequestTime = lastRequestTimeRef.current[cab.id] || 0;
        if (requestedBookingSummaryFaresRef.current[cab.id] || (now - lastRequestTime < REQUEST_THROTTLE_MS)) {
          console.log(`CabList: Skipping auto-update for ${cab.id} - already requested or throttled`);
          return;
        }
        
        // Mark that we're requesting to prevent loops
        requestedBookingSummaryFaresRef.current[cab.id] = true;
        lastRequestTimeRef.current[cab.id] = now;
        
        // Request with a delay to prevent congestion
        setTimeout(() => {
          console.log(`CabList: Requesting booking summary fare for ${cab.id}`);
          window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
            detail: {
              cabId: cab.id,
              cabName: cab.name,
              tripType: 'airport',
              timestamp: now
            }
          }));
          
          // Clear the request flag after a delay
          setTimeout(() => {
            requestedBookingSummaryFaresRef.current[cab.id] = false;
          }, 1000);
        }, Math.random() * 300); // Stagger requests slightly
      });
    }
  }, [cabTypes, isCalculatingFares, displayedFares]);
  
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
