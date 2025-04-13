
import React, { useEffect, useState, useRef } from 'react';
import { CabOptionCard } from '@/components/CabOptionCard';
import { CabType } from '@/types/cab';
import { useFareSyncTracker } from '@/hooks/useFareSyncTracker';
import { dispatchFareEvent } from '@/lib';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  tripType?: string;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  cabFares,
  isCalculatingFares,
  handleSelectCab,
  getFareDetails,
  tripType = 'outstation'
}) => {
  const [localFares, setLocalFares] = useState<Record<string, number>>(cabFares);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const syncAttemptsRef = useRef<number>(0);
  const tripTypeRef = useRef<string>(tripType);
  const syncThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSyncedRef = useRef<boolean>(false);
  const processingEventRef = useRef<boolean>(false);
  const isProcessingFaresRef = useRef<boolean>(false);
  
  // Use the fare sync tracker to prevent duplicate events
  const fareTracker = useFareSyncTracker();
  
  // Track when trip type changes to trigger re-sync and clear old fare cache
  useEffect(() => {
    if (tripTypeRef.current !== tripType) {
      console.log(`CabList: Trip type changed from ${tripTypeRef.current} to ${tripType}`);
      tripTypeRef.current = tripType;
      syncAttemptsRef.current = 0;
      fareTracker.resetTracking();
      hasSyncedRef.current = false;
      setLocalFares({}); // Clear local fares on trip type change
      
      // Request a fresh fare sync with minimal delay
      setTimeout(() => {
        throttledRequestFareSync(true);
      }, 100);
    }
  }, [tripType]);
  
  // When cabFares changes from parent, update our local fares
  useEffect(() => {
    if (isProcessingFaresRef.current) return;
    
    const hasChanges = Object.keys(cabFares).some(cabId => 
      cabFares[cabId] > 0 && cabFares[cabId] !== localFares[cabId]
    );
    
    if (hasChanges) {
      console.log('CabList: Updating local fares from parent', cabFares);
      setLocalFares(cabFares);
      setLastUpdated(Date.now());
    }
  }, [cabFares]);
  
  // On initial render, load fares from localStorage and immediately request sync
  useEffect(() => {
    if (isInitialRender) {
      // Only load from localStorage if we don't have parent fares
      if (Object.keys(cabFares).length === 0) {
        loadFaresFromLocalStorage();
      } else {
        // Use parent fares
        setLocalFares(cabFares);
      }
      
      if (!hasSyncedRef.current) {
        // Only request fare sync once after initial render
        throttledRequestFareSync(true);
        hasSyncedRef.current = true;
      }
      
      setIsInitialRender(false);
    }
  }, [isInitialRender, cabTypes, tripType, cabFares]);
  
  // Load fares from localStorage
  const loadFaresFromLocalStorage = () => {
    if (isProcessingFaresRef.current) return;
    isProcessingFaresRef.current = true;
    
    try {
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
              console.log(`CabList: Loaded ${cab.id} fare from localStorage: ${parsedFare}`);
            }
          }
        } catch (error) {
          console.error(`Error loading ${cab.id} fare from localStorage:`, error);
        }
      });
      
      if (foundAny) {
        // Only use localStorage fares if we don't already have parent fares
        const mergedFares = { ...storedFares };
        
        // Override with any non-zero parent fares as they are likely more recent
        Object.keys(cabFares).forEach(cabId => {
          if (cabFares[cabId] > 0) {
            mergedFares[cabId] = cabFares[cabId];
          }
        });
        
        setLocalFares(mergedFares);
      }
    } finally {
      isProcessingFaresRef.current = false;
    }
  };
  
  // Throttled function to request fare sync to avoid spamming the event system
  const throttledRequestFareSync = (forceSync = false) => {
    // Check if we should throttle this request
    const throttleTime = forceSync ? 300 : 1000;
    
    if (fareTracker.shouldThrottle('sync', throttleTime) && !forceSync) {
      console.log(`CabList: Throttling fare sync request`);
      
      // Set a timeout to try again later if we don't already have one
      if (!syncThrottleTimeoutRef.current) {
        syncThrottleTimeoutRef.current = setTimeout(() => {
          requestAllFareSync(forceSync);
          syncThrottleTimeoutRef.current = null;
        }, throttleTime);
      }
      return;
    }
    
    // Track this sync attempt
    fareTracker.trackFare('sync', Date.now());
    requestAllFareSync(forceSync);
  };
  
  // Request fare sync for all cab types
  const requestAllFareSync = (forceSync = false) => {
    // Check if we've exceeded max attempts (unless forcing)
    if (syncAttemptsRef.current > 5 && !forceSync) {
      console.log('CabList: Max sync attempts reached, skipping');
      return;
    }
    
    // Try to acquire the sync lock
    if (!fareTracker.acquireSyncLock(forceSync)) {
      console.log('CabList: Sync already in progress, skipping');
      return;
    }
    
    syncAttemptsRef.current++;
    console.log(`CabList: Requesting fare sync for all cabs (attempt ${syncAttemptsRef.current})`);
    
    // Request fare sync at system level
    dispatchFareEvent('request-fare-sync', {
      tripType: tripType,
      forceSync: true,
      instant: true,
      noDriverAllowance: tripType === 'airport'
    });
    
    // Only dispatch individual requests if we don't have fares yet or we're forcing
    const needsIndividualRequests = cabTypes.some(cab => !localFares[cab.id] || forceSync);
    
    if (needsIndividualRequests) {
      // Safer implementation to avoid stack overflows - process cabs sequentially
      const processCab = (index: number) => {
        if (index >= cabTypes.length) {
          // All cabs processed, release lock
          setTimeout(() => {
            fareTracker.releaseSyncLock();
          }, 50);
          return;
        }
        
        const cab = cabTypes[index];
        
        // Skip if we already have this cab's fare and not forcing
        if (localFares[cab.id] > 0 && !forceSync) {
          processCab(index + 1);
          return;
        }
        
        // Check if we've already tracked this cab's fare
        if (!fareTracker.isFareChanged(cab.id, localFares[cab.id] || 0) && !forceSync) {
          processCab(index + 1);
          return;
        }
        
        // CRITICAL FIX: Add explicit flag for airport transfers
        const noDriverAllowance = tripType === 'airport';
        
        dispatchFareEvent('request-fare-calculation', {
          cabId: cab.id,
          cabName: cab.name,
          tripType: tripType,
          forceSync: true,
          noDriverAllowance: noDriverAllowance,
          showDriverAllowance: !noDriverAllowance
        });
        
        // Track this dispatch
        fareTracker.trackFare(cab.id, localFares[cab.id] || 0);
        
        // Process next cab after a slight delay
        setTimeout(() => processCab(index + 1), 20);
      };
      
      // Start processing from the first cab
      processCab(0);
    } else {
      // Release sync lock after a short delay
      setTimeout(() => {
        fareTracker.releaseSyncLock();
      }, 50);
    }
  };
  
  // Listen for fare calculation events and other fare-related events
  useEffect(() => {
    // Handler for fare calculation events
    const handleFareCalculated = (event: CustomEvent) => {
      if (processingEventRef.current) return; // Prevent recursion
      if (!event.detail || !event.detail.cabId || event.detail.fare <= 0) return;
      
      processingEventRef.current = true;
      
      try {
        const { cabId, fare, tripType: eventTripType } = event.detail;
        
        // Skip if the fare hasn't changed in our local state
        if (!fareTracker.isFareChanged(cabId, fare)) {
          console.log(`CabList: Fare for ${cabId} is already ${fare}, skipping update`);
          return;
        }
        
        // Skip if this event isn't for our trip type
        if (eventTripType && eventTripType !== tripType) {
          console.log(`CabList: Skipping fare update for ${cabId} as it's for ${eventTripType} (we are ${tripType})`);
          return;
        }
        
        // Track this update to avoid duplicates
        fareTracker.trackFare(cabId, fare);
        
        console.log(`CabList: Received fare update for ${cabId}: ${fare}`);
        
        // Update our local fares
        setLocalFares(prev => {
          const updated = { ...prev, [cabId]: fare };
          return updated;
        });
        
        // Store to localStorage as well
        try {
          const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
          localStorage.setItem(localStorageKey, fare.toString());
        } catch (error) {
          console.error(`Error saving ${cabId} fare to localStorage:`, error);
        }
        
        setLastUpdated(Date.now());
      } finally {
        processingEventRef.current = false;
      }
    };
    
    // Handle fare cache cleared events
    const handleFareCacheCleared = () => {
      console.log('CabList: Fare cache cleared, refreshing fares');
      fareTracker.resetTracking();
      throttledRequestFareSync(true);
    };
    
    // Handle significant fare difference events
    const handleSignificantFareDifference = (event: CustomEvent) => {
      if (processingEventRef.current) return; // Prevent recursion
      if (!event.detail || !event.detail.calculatedFare || !event.detail.cabId) return;
      
      processingEventRef.current = true;
      
      try {
        const { calculatedFare, cabId } = event.detail;
        
        // Skip if the fare hasn't changed
        if (!fareTracker.isFareChanged(cabId, calculatedFare)) {
          console.log(`CabList: Calculated fare for ${cabId} is already ${calculatedFare}, skipping update`);
          return;
        }
        
        console.log(`CabList: Received significant fare difference for ${cabId}: ${calculatedFare}`);
        
        // Track this update to avoid duplicates
        fareTracker.trackFare(cabId, calculatedFare);
        
        // Update our local fares immediately with the BookingSummary calculation
        setLocalFares(prev => {
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
        
        setLastUpdated(Date.now());
      } finally {
        processingEventRef.current = false;
      }
    };
    
    // Listen for fare calculation events
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared as EventListener);
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared as EventListener);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
      if (syncThrottleTimeoutRef.current) {
        clearTimeout(syncThrottleTimeoutRef.current);
      }
    };
  }, [tripType, localFares]);
  
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 gap-4">
        {cabTypes.map((cab) => (
          <CabOptionCard
            key={cab.id}
            cab={cab}
            fare={localFares[cab.id] || 0}
            isSelected={selectedCabId === cab.id}
            onSelect={() => handleSelectCab(cab)}
            fareDetails={getFareDetails(cab)}
            isCalculating={isCalculatingFares}
          />
        ))}
      </div>
    </div>
  );
};
