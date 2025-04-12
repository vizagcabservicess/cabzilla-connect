
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
  const requestedBookingSummaryFaresRef = useRef<Record<string, boolean>>({});
  const lastRequestTimeRef = useRef<Record<string, number>>({});
  const REQUEST_THROTTLE_MS = 500; // Reduced throttle time for faster updates
  const airportFaresLoadedRef = useRef<boolean>(false);
  const fareUpdateTriggeredRef = useRef<Record<string, boolean>>({});
  const fareDisplayedRef = useRef<Record<string, boolean>>({});
  const forceAirportFareRefreshRef = useRef<boolean>(true);
  const processingCountRef = useRef<number>(0);
  const maxProcessingAttempts = 5;
  const forceSyncAttemptedRef = useRef<boolean>(false);

  // Pre-load trip type from localStorage on component mount
  useEffect(() => {
    const storedTripType = localStorage.getItem('tripType');
    if (storedTripType) {
      tripTypeRef.current = storedTripType;
      console.log(`CabList: Retrieved trip type from localStorage: ${storedTripType}`);
      
      if (storedTripType === 'airport') {
        forceAirportFareRefreshRef.current = true;
        setTimeout(() => {
          loadCalculatedAirportFares();
          triggerForceSyncWithBookingSummary();
        }, 50);
      }
    }
  }, []);

  // NEW: Force sync with booking summary on initial load
  const triggerForceSyncWithBookingSummary = () => {
    if (forceSyncAttemptedRef.current) return;
    
    console.log('CabList: Triggering force sync with booking summary');
    forceSyncAttemptedRef.current = true;
    
    // Request booking summary fares for all cab types
    setTimeout(() => {
      cabTypes.forEach(cab => {
        console.log(`CabList: Requesting initial booking summary fare for ${cab.id}`);
        window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
          detail: {
            cabId: cab.id,
            cabName: cab.name,
            tripType: 'airport',
            forceSync: true,
            timestamp: Date.now()
          }
        }));
      });
      
      // Also trigger a general fare-sync event
      window.dispatchEvent(new CustomEvent('request-fare-sync', {
        detail: {
          tripType: 'airport',
          forceSync: true,
          timestamp: Date.now()
        }
      }));
    }, 100);
  };

  // Initialize fares when cabFares prop changes
  useEffect(() => {
    if (!initializedRef.current && Object.keys(cabFares).length > 0) {
      console.log('CabList: Initial fare setup', cabFares);
      
      if (tripTypeRef.current === 'airport') {
        loadCalculatedAirportFares();
      } else {
        setDisplayedFares({...cabFares});
      }
      
      const newFareHistory: Record<string, number[]> = {};
      Object.keys(cabFares).forEach(cabId => {
        if (cabFares[cabId] > 0) {
          newFareHistory[cabId] = [cabFares[cabId]];
        }
      });
      fareHistoryRef.current = newFareHistory;
      
      initializedRef.current = true;
      
      if (tripTypeRef.current === 'airport') {
        // Immediately trigger fare calculation requests for all cab types
        setTimeout(() => {
          cabTypes.forEach(cab => {
            if (!fareUpdateTriggeredRef.current[cab.id]) {
              console.log(`CabList: Initial request for airport fare calculation for ${cab.id}`);
              window.dispatchEvent(new CustomEvent('request-fare-calculation', {
                detail: {
                  cabId: cab.id,
                  cabName: cab.name,
                  tripType: 'airport',
                  timestamp: Date.now(),
                  forceSync: true
                }
              }));
              fareUpdateTriggeredRef.current[cab.id] = true;
            }
          });
          
          // NEW: Also trigger sync with booking summary
          triggerForceSyncWithBookingSummary();
        }, 50);
      }
    }
  }, [cabFares, cabTypes]);

  // Load airport fares from localStorage and request new calculations
  const loadCalculatedAirportFares = () => {
    if (!forceAirportFareRefreshRef.current && airportFaresLoadedRef.current || tripTypeRef.current !== 'airport') return;
    
    console.log('CabList: Loading calculated airport fares on initialization');
    
    const newUpdates: Record<string, number> = {};
    let foundAnyFares = false;
    
    cabTypes.forEach(cab => {
      const localStorageKey = `fare_airport_${cab.id.toLowerCase()}`;
      const storedFare = localStorage.getItem(localStorageKey);
      
      if (storedFare) {
        const parsedFare = parseInt(storedFare, 10);
        if (parsedFare > 0) {
          console.log(`CabList: Found stored airport fare for ${cab.id}: ${parsedFare}`);
          
          calculatedFaresRef.current[cab.id] = {
            fare: parsedFare,
            timestamp: Date.now()
          };
          
          newUpdates[cab.id] = parsedFare;
          foundAnyFares = true;
          
          // NEW: Immediately apply fares without waiting for processPendingUpdates
          setDisplayedFares(prev => ({
            ...prev,
            [cab.id]: parsedFare
          }));
        }
      }
    });
    
    if (foundAnyFares) {
      pendingUpdatesRef.current = {...pendingUpdatesRef.current, ...newUpdates};
      processPendingUpdates(true); // Force immediate processing
    }
    
    airportFaresLoadedRef.current = true;
    forceAirportFareRefreshRef.current = false;
    
    // Request fare calculations for all cabs to ensure up-to-date values
    setTimeout(() => {
      cabTypes.forEach(cab => {
        console.log(`CabList: Requesting booking summary fare for ${cab.id}`);
        window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
          detail: {
            cabId: cab.id,
            cabName: cab.name,
            tripType: 'airport',
            forceSync: true,
            timestamp: Date.now()
          }
        }));
        fareUpdateTriggeredRef.current[cab.id] = true;
      });
    }, 100);
  };

  // Process pending fare updates with anti-recursion protection
  const processPendingUpdates = (force = false) => {
    if ((Object.keys(pendingUpdatesRef.current).length === 0 && !force) || 
        (isProcessingRef.current && !force)) {
      return;
    }
    
    if (processingCountRef.current > maxProcessingAttempts) {
      console.warn(`CabList: Too many processing attempts (${processingCountRef.current}), resetting`);
      processingCountRef.current = 0;
      isProcessingRef.current = false;
      pendingUpdatesRef.current = {};
      return;
    }
    
    processingCountRef.current++;
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
              tripType: tripTypeRef.current || 'airport',
              timestamp: Date.now()
            }
          }));
        }
      }
    });
    
    // Clear pending updates to prevent recursion
    const processingPendingUpdates = {...pendingUpdatesRef.current};
    pendingUpdatesRef.current = {};
    
    if (hasChanges || force) {
      setFadeIn(newFadeIn);
      refreshCountRef.current += 1;
      
      const updateTime = Date.now();
      setLastUpdateTimestamp(updateTime);
      localStorage.setItem('lastFareUpdateTimestamp', updateTime.toString());
      
      // Apply the fare updates
      setDisplayedFares(updatedFares);
      
      // NEW: Sync with booking summary for airport transfers
      if (tripTypeRef.current === 'airport') {
        // For each updated fare, notify booking summary
        Object.entries(updatedFares).forEach(([cabId, fare]) => {
          if (fare > 0) {
            window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
              detail: {
                cabType: cabId,
                cabName: cabTypes.find(cab => cab.id === cabId)?.name || cabId,
                fare: fare,
                tripType: 'airport',
                calculated: true,
                timestamp: Date.now()
              }
            }));
          }
        });
      }
      
      // Reset the processing state and fade effect after a delay
      setTimeout(() => {
        setFadeIn({});
        isProcessingRef.current = false;
        processingCountRef.current = 0;
      }, 400);
    } else {
      isProcessingRef.current = false;
      processingCountRef.current = 0;
    }
  };

  // Schedule update with debouncing
  const scheduleUpdate = (immediate = false) => {
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }
    
    if (immediate) {
      processPendingUpdates(true);
      updateTimeoutRef.current = null;
      return;
    }
    
    updateTimeoutRef.current = window.setTimeout(() => {
      processPendingUpdates();
      updateTimeoutRef.current = null;
    }, 50) as unknown as number;
  };

  // Check for fare updates that need to be processed
  useEffect(() => {
    if (!initializedRef.current || Object.keys(cabFares).length === 0) return;
    
    if (tripTypeRef.current === 'airport') {
      const calculatedFareKeys = Object.keys(calculatedFaresRef.current);
      
      if (calculatedFareKeys.length > 0) {
        calculatedFareKeys.forEach(cabId => {
          if (calculatedFaresRef.current[cabId].fare > 0) {
            pendingUpdatesRef.current[cabId] = calculatedFaresRef.current[cabId].fare;
          }
        });
        
        if (Object.keys(pendingUpdatesRef.current).length > 0) {
          scheduleUpdate(true); // Force immediate update for airport fares
          return;
        }
      }
    }
    
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

  // Reset refresh counter periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
    }, 2 * 60 * 1000);
    
    return () => clearInterval(resetInterval);
  }, []);

  // Set up event listeners for fare updates and cab selection
  useEffect(() => {
    const handleFareCalculated = (event: Event) => {
      if (!directUpdateEnabledRef.current) return;
      
      const customEvent = event as CustomEvent;
      console.log('CabList: Received fare-calculated event', customEvent.detail);
      
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, calculated = false, timestamp = Date.now(), tripType, forceSync = false } = customEvent.detail;
        
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
            
            // Immediately update the displayed fare for airport transfers
            setDisplayedFares(prev => ({
              ...prev,
              [cabId]: fare
            }));
            
            // NEW: Notify booking summary of the fare update
            window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
              detail: {
                cabType: cabId,
                cabName: cabTypes.find(cab => cab.id === cabId)?.name || cabId,
                fare: fare,
                tripType: 'airport',
                calculated: true,
                timestamp: Date.now()
              }
            }));
          }
        }
        
        fareCalculatedTimestampsRef.current[cabId] = timestamp;
        
        if (fare > 0) {
          pendingUpdatesRef.current[cabId] = fare;
          fareDisplayedRef.current[cabId] = true;
          
          // Process immediately to update UI
          processPendingUpdates(forceSync);
        }
      }
    };
    
    const handleCabSelectedWithFare = (event: Event) => {
      if (!directUpdateEnabledRef.current) return;
      
      const customEvent = event as CustomEvent;
      console.log('CabList: Received cab-selected-with-fare event', customEvent.detail);
      
      if (customEvent.detail && customEvent.detail.cabType && customEvent.detail.fare) {
        const { cabType, fare, timestamp, tripType, forceSync = false } = customEvent.detail;
        
        if (tripType) {
          tripTypeRef.current = tripType;
        }
        
        if (fare > 0) {
          pendingUpdatesRef.current[cabType] = fare;
          
          if (tripType === 'airport') {
            const localStorageKey = `fare_${tripType}_${cabType.toLowerCase()}`;
            localStorage.setItem(localStorageKey, fare.toString());
            console.log(`CabList: Updated localStorage with airport fare for ${cabType}: ${fare}`);
            
            calculatedFaresRef.current[cabType] = { fare, timestamp: Date.now() };
          }
          
          scheduleUpdate(forceSync || tripType === 'airport');
        }
      }
    };
    
    const handleDirectFareUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) return;
      
      if (customEvent.detail.cabType && customEvent.detail.fare > 0) {
        const { cabType, fare, calculated = false, forceSync = false, tripType } = customEvent.detail;
        console.log(`CabList: Received direct fare update for ${cabType}: ${fare}, calculated=${calculated}`);
        
        if (tripType) {
          tripTypeRef.current = tripType;
        }
        
        // For airport transfers, store the calculated fare
        if (tripType === 'airport' || tripTypeRef.current === 'airport') {
          calculatedFaresRef.current[cabType] = { fare, timestamp: Date.now() };
          
          const localStorageKey = `fare_${tripType || 'airport'}_${cabType.toLowerCase()}`;
          localStorage.setItem(localStorageKey, fare.toString());
        }
        
        setDisplayedFares(prev => {
          const updated = { ...prev, [cabType]: fare };
          return updated;
        });
        
        // Update timestamp to force re-renders
        setLastUpdateTimestamp(Date.now());
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
      requestedBookingSummaryFaresRef.current = {};
      lastRequestTimeRef.current = {};
      airportFaresLoadedRef.current = false;
      fareUpdateTriggeredRef.current = {};
      fareDisplayedRef.current = {};
      processingCountRef.current = 0;
      forceAirportFareRefreshRef.current = true;
      forceSyncAttemptedRef.current = false;
      
      if (customEvent.detail && customEvent.detail.tripType) {
        tripTypeRef.current = customEvent.detail.tripType;
        
        setDisplayedFares({});
        fareHistoryRef.current = {};
        
        // If switching to airport, trigger immediate sync
        if (customEvent.detail.tripType === 'airport') {
          setTimeout(() => {
            loadCalculatedAirportFares();
            triggerForceSyncWithBookingSummary();
          }, 100);
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
        
        // Immediately update displayed fare
        setDisplayedFares(prev => ({
          ...prev,
          [cabId]: calculatedFare
        }));
        
        // NEW: Notify booking summary of the fare update
        window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
          detail: {
            cabType: cabId,
            cabName: cabTypes.find(cab => cab.id === cabId)?.name || cabId,
            fare: calculatedFare,
            tripType: 'airport',
            calculated: true,
            timestamp: Date.now()
          }
        }));
      }
    };
    
    const handleRequestFareCalculation = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail || !customEvent.detail.cabId) return;
      
      console.log(`CabList: Received request for fare calculation for ${customEvent.detail.cabId}`);
      
      const isAirportTransfer = tripTypeRef.current === 'airport';
      const { cabId, forceSync = false } = customEvent.detail;
      
      if (fareDisplayedRef.current[customEvent.detail.cabId] && !forceSync) {
        console.log(`CabList: Skipping fare calculation request for ${customEvent.detail.cabId} - fare already displayed`);
        return;
      }
      
      const now = Date.now();
      const lastRequestTime = lastRequestTimeRef.current[cabId] || 0;
      
      if (!forceSync && now - lastRequestTime < REQUEST_THROTTLE_MS) {
        console.log(`CabList: Throttling fare calculation request for ${cabId}, last request was ${now - lastRequestTime}ms ago`);
        return;
      }
      
      lastRequestTimeRef.current[cabId] = now;
      
      if (isAirportTransfer && calculatedFaresRef.current[customEvent.detail.cabId]) {
        const calculatedFare = calculatedFaresRef.current[customEvent.detail.cabId].fare;
        console.log(`CabList: Using stored calculated fare for ${customEvent.detail.cabId}: ${calculatedFare}`);
        
        setDisplayedFares(prev => ({
          ...prev,
          [customEvent.detail.cabId]: calculatedFare
        }));
        
        fareDisplayedRef.current[customEvent.detail.cabId] = true;
        
        // NEW: Notify booking summary of the fare
        if (forceSync) {
          window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
            detail: {
              cabType: cabId,
              cabName: customEvent.detail.cabName,
              fare: calculatedFare,
              tripType: 'airport',
              calculated: true,
              timestamp: now
            }
          }));
        }
      }
    };
    
    const handleRequestBookingSummaryFare = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail || !customEvent.detail.cabId) return;
      
      const { cabId, cabName, tripType, forceSync = false } = customEvent.detail;
      const now = Date.now();
      
      if (!forceSync && requestedBookingSummaryFaresRef.current[cabId]) {
        console.log(`CabList: Skipping duplicate booking summary fare request for ${cabId}`);
        return;
      }
      
      const lastRequestTime = lastRequestTimeRef.current[cabId] || 0;
      if (!forceSync && now - lastRequestTime < REQUEST_THROTTLE_MS) {
        console.log(`CabList: Throttling booking summary fare request for ${cabId}, last request was ${now - lastRequestTime}ms ago`);
        return;
      }
      
      console.log(`CabList: Received request for booking summary fare for ${cabId}`);
      
      requestedBookingSummaryFaresRef.current[cabId] = true;
      lastRequestTimeRef.current[cabId] = now;
      
      const isAirportTransfer = tripTypeRef.current === 'airport' || tripType === 'airport';
      
      if (isAirportTransfer && calculatedFaresRef.current[cabId]) {
        const calculatedFare = calculatedFaresRef.current[cabId].fare;
        
        setTimeout(() => {
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
          
          setTimeout(() => {
            requestedBookingSummaryFaresRef.current[cabId] = false;
          }, 300);
        }, 0);
      } else if (isAirportTransfer) {
        // If no calculated fare available, check displayed fare
        if (displayedFares[cabId] && displayedFares[cabId] > 0) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
              detail: {
                cabType: cabId,
                cabName: cabName,
                fare: displayedFares[cabId],
                tripType: 'airport',
                calculated: true,
                timestamp: now
              }
            }));
            
            setTimeout(() => {
              requestedBookingSummaryFaresRef.current[cabId] = false;
            }, 300);
          }, 0);
        } else {
          // If no fare found, clear request flag
          setTimeout(() => {
            requestedBookingSummaryFaresRef.current[cabId] = false;
          }, 300);
        }
      } else {
        setTimeout(() => {
          requestedBookingSummaryFaresRef.current[cabId] = false;
        }, 300);
      }
    };
    
    // NEW: Handle request for fare sync
    const handleRequestFareSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) return;
      
      const { tripType, forceSync = false } = customEvent.detail;
      console.log(`CabList: Received request-fare-sync event for ${tripType || 'all'} trips`);
      
      if (tripType === 'airport' || tripTypeRef.current === 'airport') {
        // Force reload of calculated airport fares
        forceAirportFareRefreshRef.current = true;
        airportFaresLoadedRef.current = false;
        
        setTimeout(() => {
          loadCalculatedAirportFares();
          
          // Force process any pending updates
          if (Object.keys(pendingUpdatesRef.current).length > 0 || Object.keys(calculatedFaresRef.current).length > 0) {
            processPendingUpdates(true);
          }
        }, 50);
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
      fareUpdateTriggeredRef.current = {};
      forceAirportFareRefreshRef.current = true;
      airportFaresLoadedRef.current = false;
      forceSyncAttemptedRef.current = false;
      
      // For airport transfers, trigger immediate sync
      if (tripTypeRef.current === 'airport') {
        setTimeout(() => {
          loadCalculatedAirportFares();
          triggerForceSyncWithBookingSummary();
        }, 100);
      }
    };
    
    setTimeout(() => {
      directUpdateEnabledRef.current = true;
    }, 200);
    
    window.addEventListener('cab-selected-with-fare', handleCabSelectedWithFare as EventListener);
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
    window.addEventListener('trip-type-changed', handleTripTypeChanged as EventListener);
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    window.addEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
    window.addEventListener('request-booking-summary-fare', handleRequestBookingSummaryFare as EventListener);
    window.addEventListener('request-fare-sync', handleRequestFareSync as EventListener);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared as EventListener);
    
    // NEW: Trigger initial sync with booking summary for airport transfers
    if (tripTypeRef.current === 'airport' && !forceSyncAttemptedRef.current) {
      setTimeout(() => {
        loadCalculatedAirportFares();
        triggerForceSyncWithBookingSummary();
      }, 200);
    }
    
    return () => {
      window.removeEventListener('cab-selected-with-fare', handleCabSelectedWithFare as EventListener);
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
      window.removeEventListener('trip-type-changed', handleTripTypeChanged as EventListener);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
      window.removeEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
      window.removeEventListener('request-booking-summary-fare', handleRequestBookingSummaryFare as EventListener);
      window.removeEventListener('request-fare-sync', handleRequestFareSync as EventListener);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared as EventListener);
      
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [cabTypes, selectedCabId]);

  // Get the fare to display for a cab
  const getDisplayFare = (cab: CabType): number => {
    const cabId = cab.id;
    const isAirportTransfer = tripTypeRef.current === 'airport';
    
    if (isAirportTransfer) {
      // For airport transfers, prioritize stored calculated fares
      if (calculatedFaresRef.current[cabId] && calculatedFaresRef.current[cabId].fare > 0) {
        console.log(`CabList: Using calculated fare for ${cabId}: ${calculatedFaresRef.current[cabId].fare}`);
        return calculatedFaresRef.current[cabId].fare;
      }
      
      // Next check currently displayed fares
      if (displayedFares[cabId] && displayedFares[cabId] > 0) {
        console.log(`CabList: Using displayed fare for ${cabId}: ${displayedFares[cabId]}`);
        return displayedFares[cabId];
      }
      
      // Try to get from localStorage as a last resort
      const localStorageKey = `fare_${tripTypeRef.current}_${cabId.toLowerCase()}`;
      const storedFare = localStorage.getItem(localStorageKey);
      if (storedFare) {
        const parsedFare = parseInt(storedFare, 10);
        if (parsedFare > 0) {
          console.log(`CabList: Using localStorage fare for ${cabId}: ${parsedFare}`);
          
          // Store in calculated fares for future use
          calculatedFaresRef.current[cabId] = { fare: parsedFare, timestamp: Date.now() };
          
          // Update display fares for consistent UI
          setTimeout(() => {
            setDisplayedFares(prev => ({...prev, [cabId]: parsedFare}));
          }, 0);
          
          return parsedFare;
        }
      }
    }
    
    // For non-airport or if no airport-specific fare found
    if (displayedFares[cabId] && displayedFares[cabId] > 0) {
      return displayedFares[cabId];
    }
    
    if (cabFares[cabId] && cabFares[cabId] > 0) {
      return cabFares[cabId];
    }
    
    if (cab.price && cab.price > 0) {
      return cab.price;
    }
    
    // Use fare history if available
    if (fareHistoryRef.current[cabId] && fareHistoryRef.current[cabId].length > 0) {
      for (let i = fareHistoryRef.current[cabId].length - 1; i >= 0; i--) {
        if (fareHistoryRef.current[cabId][i] > 0) {
          return fareHistoryRef.current[cabId][i];
        }
      }
    }
    
    // Default prices if all else fails
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

  // Enhance the cab selection handler with fare updates
  const enhancedSelectCab = (cab: CabType) => {
    const currentFare = getDisplayFare(cab);
    const tripType = tripTypeRef.current || localStorage.getItem('tripType');
    const isAirport = tripType === 'airport';
    
    handleSelectCab(cab);
    
    setFadeIn(prev => ({
      ...prev,
      [cab.id]: true
    }));
    
    // First emit the standard cab selection event
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
    
    // Then emit the fare-specific event with a slight delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        bubbles: true,
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: currentFare,
          tripType: tripType,
          timestamp: Date.now(),
          forceSync: isAirport // Force sync for airport transfers
        }
      }));
    }, 50);
    
    if (isAirport) {
      const now = Date.now();
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('request-fare-calculation', {
          bubbles: true,
          detail: {
            cabId: cab.id,
            cabName: cab.name,
            tripType: 'airport',
            timestamp: now,
            forceSync: true
          }
        }));
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
            bubbles: true,
            detail: {
              cabId: cab.id,
              cabName: cab.name,
              tripType: 'airport',
              timestamp: now + 1,
              forceSync: true
            }
          }));
        }, 100);
      }, 0);
    }
    
    setTimeout(() => {
      setFadeIn(prev => ({
        ...prev,
        [cab.id]: false
      }));
    }, 500);
  };

  // Auto-trigger fare updates for airport transfers
  useEffect(() => {
    const isAirportTransfer = tripTypeRef.current === 'airport' || localStorage.getItem('tripType') === 'airport';
    
    if (isAirportTransfer && cabTypes.length > 0 && !isCalculatingFares && initializedRef.current) {
      console.log('CabList: Auto-triggering fare update for airport transfer cabs');
      
      // First, process any pending updates to ensure UI is up-to-date
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        processPendingUpdates(true);
      }
      
      // NEW: Try to sync with booking summary if not attempted yet
      if (!forceSyncAttemptedRef.current) {
        triggerForceSyncWithBookingSummary();
      }
      
      setTimeout(() => {
        cabTypes.forEach((cab) => {
          // Skip already processed cabs
          if (fareDisplayedRef.current[cab.id]) {
            return;
          }
          
          // Use already calculated fares if available
          if (calculatedFaresRef.current[cab.id]) {
            console.log(`CabList: Already have calculated fare for ${cab.id}: ${calculatedFaresRef.current[cab.id].fare}`);
            
            if (displayedFares[cab.id] !== calculatedFaresRef.current[cab.id].fare) {
              setDisplayedFares(prev => ({
                ...prev,
                [cab.id]: calculatedFaresRef.current[cab.id].fare
              }));
            }
            
            fareDisplayedRef.current[cab.id] = true;
            return;
          }
          
          // Request fare calculation for cabs without calculated fares
          console.log(`CabList: Requesting fare calculation for ${cab.id}`);
          
          window.dispatchEvent(new CustomEvent('request-fare-calculation', {
            detail: {
              cabId: cab.id,
              cabName: cab.name,
              tripType: 'airport',
              timestamp: Date.now(),
              forceSync: true // Force syncing
            }
          }));
          
          fareDisplayedRef.current[cab.id] = true;
        });
      }, 100);
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
