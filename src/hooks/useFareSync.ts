
import { useState, useEffect, useRef } from 'react';
import { CabType } from '@/types/cab';
import { useFareSyncTracker } from './useFareSyncTracker';
import { dispatchFareEvent, shouldShowDriverAllowance } from '@/lib';

interface UseFareSyncOptions {
  tripType: string;
  cabTypes: CabType[];
  selectedCab: CabType | null;
  shouldSync?: boolean;
}

/**
 * Hook to manage fare synchronization across components
 */
export const useFareSync = ({ 
  tripType, 
  cabTypes, 
  selectedCab,
  shouldSync = true
}: UseFareSyncOptions) => {
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const syncAttemptsRef = useRef<number>(0);
  const maxSyncAttemptsRef = useRef<number>(5);
  const previousTripTypeRef = useRef<string>(tripType);
  const syncThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingEventRef = useRef<boolean>(false);
  const hasLoadedFromDatabaseRef = useRef<Record<string, boolean>>({});
  const initialSyncCompletedRef = useRef<boolean>(false);
  
  // Use the fare sync tracker to prevent duplicate events
  const fareTracker = useFareSyncTracker();
  
  // Track when trip type changes to force re-sync
  useEffect(() => {
    if (previousTripTypeRef.current !== tripType) {
      console.log(`useFareSync: Trip type changed from ${previousTripTypeRef.current} to ${tripType}`);
      previousTripTypeRef.current = tripType;
      syncAttemptsRef.current = 0;
      fareTracker.resetTracking();
      setCabFares({});
      hasLoadedFromDatabaseRef.current = {};
      initialSyncCompletedRef.current = false;
      
      // Force refresh localStorage cache when trip type changes
      localStorage.setItem('forceCacheRefresh', 'true');
      setTimeout(() => {
        localStorage.removeItem('forceCacheRefresh');
        
        // Trigger sync with small delay to allow system to recognize trip change
        if (shouldSync) {
          requestFareSync(true);
        }
      }, 50);
    }
  }, [tripType, shouldSync]);
  
  // Initial load of fares from database and immediate sync request
  useEffect(() => {
    if (shouldSync && cabTypes.length > 0 && !initialSyncCompletedRef.current) {
      // Only load from localStorage if we don't already have fares
      const hasFares = Object.keys(cabFares).length > 0;
      if (!hasFares) {
        loadFaresFromStorage();
      }
      
      // Request immediate sync on mount - CRITICAL FIX: Use immediate timeout to trigger sync
      setTimeout(() => {
        requestFareSync(true);
        initialSyncCompletedRef.current = true;
      }, 50);
    }
  }, [cabTypes.length, shouldSync]);
  
  // Load fares from localStorage
  const loadFaresFromStorage = () => {
    const storedFares: Record<string, number> = {};
    let foundAny = false;
    
    cabTypes.forEach(cab => {
      try {
        const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
        const storedFare = localStorage.getItem(localStorageKey);
        
        if (storedFare) {
          const parsedFare = parseInt(storedFare, 10);
          if (!isNaN(parsedFare) && parsedFare > 0) {
            storedFares[cab.id] = parsedFare;
            fareTracker.trackFare(cab.id, parsedFare);
            foundAny = true;
          }
        }
      } catch (error) {
        console.error(`Error loading ${cab.id} fare from localStorage:`, error);
      }
    });
    
    if (foundAny) {
      setCabFares(prev => ({...prev, ...storedFares}));
      return true;
    }
    
    return false;
  };
  
  // Request fare sync for all cabs or specific cab
  const requestFareSync = (forceSync = false) => {
    if (!shouldSync) return;
    
    if (syncAttemptsRef.current >= maxSyncAttemptsRef.current && !forceSync) {
      return;
    }
    
    if (syncInProgress && !forceSync) {
      return;
    }
    
    // Try to acquire the sync lock
    if (!fareTracker.acquireSyncLock(forceSync)) {
      return;
    }
    
    syncAttemptsRef.current++;
    setSyncInProgress(true);
    
    // CRITICAL FIX: Add explicit flag for airport transfers
    const noDriverAllowance = !shouldShowDriverAllowance(tripType);
    
    // System-wide fare sync request
    dispatchFareEvent('request-fare-sync', {
      tripType: tripType,
      forceSync: true,
      instant: true,
      noDriverAllowance: noDriverAllowance,
      showDriverAllowance: !noDriverAllowance
    });
    
    // CRITICAL FIX: Always trigger individual requests to ensure fares are updated immediately
    const processIndividualRequests = () => {
      // Process requests in sequence to avoid overloading the event system
      const requestCab = (index: number) => {
        if (index >= cabTypes.length) {
          // All cab requests processed
          setTimeout(() => {
            fareTracker.releaseSyncLock();
            setSyncInProgress(false);
            setLastSyncTime(Date.now());
          }, 100);
          return;
        }
        
        const cab = cabTypes[index];
        
        // CRITICAL FIX: Add explicit flag for airport transfers
        const noDriverAllowance = !shouldShowDriverAllowance(tripType);
        
        dispatchFareEvent('request-fare-calculation', {
          cabId: cab.id,
          cabName: cab.name,
          tripType: tripType,
          forceSync: true,
          noDriverAllowance: noDriverAllowance,
          showDriverAllowance: !noDriverAllowance
        });
        
        // Process next cab after a slight delay
        setTimeout(() => requestCab(index + 1), 20);
      };
      
      // Start processing cabs
      requestCab(0);
    };
    
    // Start processing individual requests
    processIndividualRequests();
  };
  
  // Throttled function to request fare sync
  const throttledRequestFareSync = (forceSync = false) => {
    // Use shorter throttle time for airport to ensure faster initial display
    const throttleTime = tripType === 'airport' ? 300 : 1000;
    
    // Check if we should throttle this request
    if (fareTracker.shouldThrottle('sync', throttleTime) && !forceSync) {
      console.log(`useFareSync: Throttling fare sync request`);
      
      // Set a timeout to try again later if we don't already have one
      if (!syncThrottleTimeoutRef.current) {
        syncThrottleTimeoutRef.current = setTimeout(() => {
          requestFareSync(forceSync);
          syncThrottleTimeoutRef.current = null;
        }, throttleTime);
      }
      return;
    }
    
    // Track this sync attempt
    fareTracker.trackFare('sync', Date.now());
    requestFareSync(forceSync);
  };
  
  // Listen for fare calculation events
  useEffect(() => {
    if (!shouldSync) return;
    
    const handleFareCalculated = (event: CustomEvent) => {
      if (processingEventRef.current) return; // Prevent recursion
      if (!event.detail || !event.detail.cabId || !event.detail.fare) return;
      
      processingEventRef.current = true;
      
      try {
        const { cabId, fare, tripType: eventTripType, source = 'unknown', noDriverAllowance = false } = event.detail;
        
        // Only process events for our trip type
        if (eventTripType && eventTripType !== tripType) {
          processingEventRef.current = false;
          return;
        }
        
        // Skip if this is the same value we already have
        if (!fareTracker.isFareChanged(cabId, fare)) {
          processingEventRef.current = false;
          return;
        }
        
        // Track if this is from database (priority source)
        if (source === 'database') {
          hasLoadedFromDatabaseRef.current[cabId] = true;
        }
        
        // Track this update to avoid duplicates
        fareTracker.trackFare(cabId, fare);
        
        // Update our local fares
        setCabFares(prev => {
          const updated = { ...prev, [cabId]: fare };
          return updated;
        });
        
        // Store to localStorage
        try {
          const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
          localStorage.setItem(localStorageKey, fare.toString());
        } catch (error) {
          console.error(`Error saving ${cabId} fare to localStorage:`, error);
        }
        
        setLastSyncTime(Date.now());
      } finally {
        processingEventRef.current = false;
      }
    };
    
    // Handle significant fare difference events
    const handleSignificantFareDifference = (event: CustomEvent) => {
      if (processingEventRef.current) return; // Prevent recursion
      if (!event.detail || !event.detail.calculatedFare || !event.detail.cabId) return;
      
      processingEventRef.current = true;
      
      try {
        const { calculatedFare, cabId, noDriverAllowance = false } = event.detail;
        
        // Skip if this is the same value we already have
        if (!fareTracker.isFareChanged(cabId, calculatedFare)) {
          processingEventRef.current = false;
          return;
        }
        
        // Track this update
        fareTracker.trackFare(cabId, calculatedFare);
        
        // Update our local fares
        setCabFares(prev => {
          const updated = { ...prev, [cabId]: calculatedFare };
          return updated;
        });
        
        // Store to localStorage
        try {
          const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
          localStorage.setItem(localStorageKey, calculatedFare.toString());
        } catch (error) {
          console.error(`Error saving ${cabId} fare to localStorage:`, error);
        }
        
        // Force a sync time update to trigger renders
        setLastSyncTime(Date.now());
      } finally {
        processingEventRef.current = false;
      }
    };
    
    // Listen for fare events
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
      if (syncThrottleTimeoutRef.current) {
        clearTimeout(syncThrottleTimeoutRef.current);
      }
    };
  }, [cabFares, shouldSync, tripType]);
  
  // When selected cab changes, ensure its fare is up to date
  useEffect(() => {
    if (selectedCab && shouldSync) {
      const currentFare = cabFares[selectedCab.id];
      
      if (currentFare && currentFare > 0) {
        // Skip if we've already tracked this fare for this cab
        if (!fareTracker.isFareChanged(selectedCab.id, currentFare)) {
          return;
        }
        
        // Track this dispatch to avoid duplicates
        fareTracker.trackFare(selectedCab.id, currentFare);
        
        // CRITICAL FIX: Add explicit flag for airport transfers
        const noDriverAllowance = !shouldShowDriverAllowance(tripType);
        
        // Dispatch the cab selection with fare
        dispatchFareEvent('cab-selected-with-fare', {
          cabType: selectedCab.id,
          cabName: selectedCab.name,
          fare: currentFare,
          tripType: tripType,
          forceSync: true,
          noDriverAllowance: noDriverAllowance,
          showDriverAllowance: !noDriverAllowance
        });
      } else {
        // If no valid fare, request calculation
        dispatchFareEvent('request-fare-calculation', {
          cabId: selectedCab.id,
          cabName: selectedCab.name,
          tripType: tripType,
          forceSync: true,
          noDriverAllowance: !shouldShowDriverAllowance(tripType), 
          showDriverAllowance: shouldShowDriverAllowance(tripType)
        });
      }
    }
  }, [selectedCab, cabFares, shouldSync, tripType]);
  
  return {
    cabFares,
    syncInProgress,
    lastSyncTime,
    requestFareSync: throttledRequestFareSync,
    loadFaresFromStorage
  };
};
