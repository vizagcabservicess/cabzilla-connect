
import React, { useEffect, useState, useRef } from 'react';
import { CabOptionCard } from '@/components/CabOptionCard';
import { CabType } from '@/types/cab';

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
  const processedUpdatesRef = useRef<Record<string, number>>({});
  const tripTypeRef = useRef<string>(tripType);
  const syncThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const syncLockRef = useRef<boolean>(false);
  const hasSyncedRef = useRef<boolean>(false);
  const lastDispatchedFares = useRef<Record<string, number>>({});
  
  // Track when trip type changes to trigger re-sync and clear old fare cache
  useEffect(() => {
    if (tripTypeRef.current !== tripType) {
      console.log(`CabList: Trip type changed from ${tripTypeRef.current} to ${tripType}`);
      tripTypeRef.current = tripType;
      syncAttemptsRef.current = 0;
      processedUpdatesRef.current = {};
      lastDispatchedFares.current = {};
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
      const storedFares: Record<string, number> = {};
      let foundAny = false;
      
      // First try to load from localStorage
      cabTypes.forEach(cab => {
        try {
          const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
          const storedFare = localStorage.getItem(localStorageKey);
          
          if (storedFare) {
            const parsedFare = parseInt(storedFare, 10);
            if (!isNaN(parsedFare) && parsedFare > 0) {
              storedFares[cab.id] = parsedFare;
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
      
      if (!hasSyncedRef.current) {
        // Only request fare sync once after initial render
        throttledRequestFareSync(true);
        hasSyncedRef.current = true;
      }
      
      setIsInitialRender(false);
    }
  }, [isInitialRender, cabTypes, tripType, cabFares]);
  
  // Throttled function to request fare sync to avoid spamming the event system
  const throttledRequestFareSync = (forceSync = false) => {
    // If we're already sync locked or attempted too many times, skip
    if (syncLockRef.current && !forceSync) {
      console.log('CabList: Sync locked, skipping request');
      return;
    }
    
    const now = Date.now();
    // Minimum time between syncs (300ms for forced, 2000ms for regular)
    const throttleTime = forceSync ? 300 : 2000;
    
    // Check if we're within throttle window
    if (now - lastSyncTimeRef.current < throttleTime && !forceSync) {
      console.log(`CabList: Throttling fare sync request (${now - lastSyncTimeRef.current}ms < ${throttleTime}ms)`);
      
      // Set a timeout to try again later if we don't already have one
      if (!syncThrottleTimeoutRef.current) {
        syncThrottleTimeoutRef.current = setTimeout(() => {
          lastSyncTimeRef.current = Date.now();
          requestAllFareSync(forceSync);
          syncThrottleTimeoutRef.current = null;
        }, throttleTime);
      }
      return;
    }
    
    // Update last sync time and request sync
    lastSyncTimeRef.current = now;
    requestAllFareSync(forceSync);
  };
  
  // Request fare sync for all cab types
  const requestAllFareSync = (forceSync = false) => {
    // Check if we've exceeded max attempts (unless forcing)
    if (syncAttemptsRef.current > 5 && !forceSync) {
      console.log('CabList: Max sync attempts reached, skipping');
      return;
    }
    
    // Set sync lock to prevent multiple simultaneous sync attempts
    if (syncLockRef.current && !forceSync) {
      console.log('CabList: Sync already in progress, skipping');
      return;
    }
    
    syncLockRef.current = true;
    syncAttemptsRef.current++;
    console.log(`CabList: Requesting fare sync for all cabs (attempt ${syncAttemptsRef.current})`);
    
    // Request fare sync at system level
    window.dispatchEvent(new CustomEvent('request-fare-sync', {
      detail: {
        tripType: tripType,
        forceSync: true,
        instant: true,
        timestamp: Date.now()
      }
    }));
    
    // Only dispatch individual requests if we don't have fares yet or we're forcing
    const needsIndividualRequests = cabTypes.some(cab => !localFares[cab.id] || forceSync);
    
    if (needsIndividualRequests) {
      // Request individual fare updates for each cab with throttling
      cabTypes.forEach((cab, index) => {
        // Skip if we already have this cab's fare and not forcing
        if (localFares[cab.id] > 0 && !forceSync) {
          return;
        }
        
        // Check if we've already requested this fare recently
        if (lastDispatchedFares.current[cab.id] === localFares[cab.id] && !forceSync) {
          return;
        }
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('request-fare-calculation', {
            detail: {
              cabId: cab.id,
              cabName: cab.name,
              tripType: tripType,
              forceSync: true,
              timestamp: Date.now() + index
            }
          }));
          
          // Track this dispatch
          lastDispatchedFares.current[cab.id] = localFares[cab.id] || 0;
        }, index * 20);
      });
    }
    
    // Release sync lock after a short delay
    setTimeout(() => {
      syncLockRef.current = false;
    }, cabTypes.length * 20 + 300);
  };
  
  // Listen for fare calculation events and other fare-related events
  useEffect(() => {
    // Handler for fare calculation events
    const handleFareCalculated = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.fare > 0) {
        const { cabId, fare, tripType: eventTripType } = event.detail;
        
        // Skip if this is a duplicate or unchanged update we've already processed
        if (processedUpdatesRef.current[cabId] === fare) {
          console.log(`CabList: Skipping duplicate fare update for ${cabId}: ${fare}`);
          return;
        }
        
        // Skip if the fare hasn't changed in our local state
        if (localFares[cabId] === fare) {
          console.log(`CabList: Fare for ${cabId} is already ${fare}, skipping update`);
          return;
        }
        
        // Skip if this event isn't for our trip type
        if (eventTripType && eventTripType !== tripType) {
          console.log(`CabList: Skipping fare update for ${cabId} as it's for ${eventTripType} (we are ${tripType})`);
          return;
        }
        
        // Track this update to avoid duplicates
        processedUpdatesRef.current[cabId] = fare;
        
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
      }
    };
    
    // Handle fare cache cleared events
    const handleFareCacheCleared = () => {
      console.log('CabList: Fare cache cleared, refreshing fares');
      processedUpdatesRef.current = {};
      lastDispatchedFares.current = {};
      throttledRequestFareSync(true);
    };
    
    // Handle significant fare difference events
    const handleSignificantFareDifference = (event: CustomEvent) => {
      if (event.detail && event.detail.calculatedFare && event.detail.cabId) {
        const { calculatedFare, cabId } = event.detail;
        
        // Skip if the fare hasn't changed
        if (localFares[cabId] === calculatedFare) {
          console.log(`CabList: Calculated fare for ${cabId} is already ${calculatedFare}, skipping update`);
          return;
        }
        
        console.log(`CabList: Received significant fare difference for ${cabId}: ${calculatedFare}`);
        
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
