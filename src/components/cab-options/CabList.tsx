
import React, { useEffect, useState, useRef } from 'react';
import { CabOptionCard } from '@/components/CabOptionCard';
import { CabType } from '@/types/cab';
import { useFareSyncTracker } from '@/hooks/useFareSyncTracker';
import { dispatchFareEvent, shouldShowDriverAllowance, ensureNoDriverAllowanceForAirport } from '@/lib';

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
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  
  const syncAttemptsRef = useRef<number>(0);
  const tripTypeRef = useRef<string>(tripType);
  const syncThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSyncedRef = useRef<boolean>(false);
  const processingEventRef = useRef<boolean>(false);
  const isProcessingFaresRef = useRef<boolean>(false);
  const dbSyncCompletedRef = useRef<boolean>(false);
  const initialFetchCompletedRef = useRef<boolean>(false);
  const lastFareDbUpdateRef = useRef<number>(Date.now());
  const syncLockRef = useRef<boolean>(false);
  
  // Use the fare sync tracker to prevent duplicate events
  const fareTracker = useFareSyncTracker();
  
  // Disable console logging from the tracker to reduce spam
  useEffect(() => {
    fareTracker.setLoggingEnabled(false);
    return () => fareTracker.setLoggingEnabled(true);
  }, []);
  
  // Track when trip type changes to trigger re-sync and clear old fare cache
  useEffect(() => {
    if (tripTypeRef.current !== tripType) {
      console.log(`CabList: Trip type changed from ${tripTypeRef.current} to ${tripType}`);
      tripTypeRef.current = tripType;
      syncAttemptsRef.current = 0;
      fareTracker.resetTracking();
      hasSyncedRef.current = false;
      dbSyncCompletedRef.current = false;
      initialFetchCompletedRef.current = false;
      
      // Clear local fares on trip type change
      setLocalFares({});
      
      // Request a fresh fare sync with minimal delay
      setTimeout(() => {
        requestFareSync(true);
      }, 50);
    }
  }, [tripType]);
  
  // When cabFares changes from parent, update our local fares
  useEffect(() => {
    if (isProcessingFaresRef.current) return;
    
    // Process each cab fare separately to ensure airport transfers are handled correctly
    const hasChanges = Object.entries(cabFares).some(([cabId, fare]) => {
      if (fare <= 0) return false; // Skip invalid fares
      
      // CRITICAL FIX: For airport transfers, ensure driver allowance is removed
      if (tripType === 'airport') {
        const cab = cabTypes.find(c => c.id === cabId);
        if (cab && cab.driverAllowance) {
          const adjustedFare = ensureNoDriverAllowanceForAirport(fare, cab.driverAllowance, tripType);
          return adjustedFare !== localFares[cabId];
        }
      }
      
      return fare !== localFares[cabId];
    });
    
    if (hasChanges) {
      // For airport transfers, ensure driver allowance is removed from all fares
      if (tripType === 'airport') {
        const adjustedFares: Record<string, number> = {};
        
        Object.entries(cabFares).forEach(([cabId, fare]) => {
          if (fare <= 0) return; // Skip invalid fares
          
          const cab = cabTypes.find(c => c.id === cabId);
          if (cab && cab.driverAllowance) {
            adjustedFares[cabId] = ensureNoDriverAllowanceForAirport(fare, cab.driverAllowance, tripType);
          } else {
            adjustedFares[cabId] = fare;
          }
        });
        
        setLocalFares(adjustedFares);
      } else {
        setLocalFares(cabFares);
      }
      
      setLastUpdated(Date.now());
    }
  }, [cabFares, cabTypes, tripType]);
  
  // Load fares from localStorage - only on initial render
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
              // For airport transfers, ensure driver allowance is removed
              if (tripType === 'airport' && cab.driverAllowance) {
                storedFares[cab.id] = ensureNoDriverAllowanceForAirport(
                  parsedFare, cab.driverAllowance, tripType
                );
              } else {
                storedFares[cab.id] = parsedFare;
              }
              
              fareTracker.trackFare(cab.id, storedFares[cab.id]);
              foundAny = true;
            }
          }
        } catch (error) {
          console.error(`Error loading ${cab.id} fare from localStorage:`, error);
        }
      });
      
      if (foundAny) {
        setLocalFares(prev => ({ ...prev, ...storedFares }));
      }
    } finally {
      isProcessingFaresRef.current = false;
    }
  };
  
  // Request fare sync for all cab types
  const requestFareSync = (forceSync = false) => {
    // Prevent multiple simultaneous sync requests
    if (syncLockRef.current && !forceSync) {
      return;
    }
    
    syncLockRef.current = true;
    
    try {
      // Check if we've exceeded max attempts (unless forcing)
      if (syncAttemptsRef.current > 3 && !forceSync) {
        syncLockRef.current = false;
        return;
      }
      
      // Try to acquire the sync lock
      if (!fareTracker.acquireSyncLock(forceSync)) {
        syncLockRef.current = false;
        return;
      }
      
      syncAttemptsRef.current++;
      
      // CRITICAL FIX: Get the appropriate driver allowance flag
      const noDriverAllowance = !shouldShowDriverAllowance(tripType);
      
      // Request fare sync at system level
      dispatchFareEvent('request-fare-sync', {
        tripType: tripType,
        forceSync: true,
        instant: true,
        noDriverAllowance: noDriverAllowance,
        showDriverAllowance: !noDriverAllowance
      });
      
      // Process cabs sequentially to avoid overwhelming the event system
      const processCab = (index: number) => {
        if (index >= cabTypes.length) {
          // All cabs processed, release lock
          setTimeout(() => {
            fareTracker.releaseSyncLock();
            syncLockRef.current = false;
            // Mark that we've completed initial fetch
            initialFetchCompletedRef.current = true;
          }, 50);
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
        
        // Track this dispatch
        fareTracker.trackFare(cab.id, localFares[cab.id] || 0);
        
        // Process next cab after a slight delay
        setTimeout(() => processCab(index + 1), 50);
      };
      
      // Start processing from the first cab
      processCab(0);
    } catch (error) {
      console.error("Error requesting fare sync:", error);
      syncLockRef.current = false;
      fareTracker.releaseSyncLock();
    }
  };
  
  // Listen for fare calculation events and other fare-related events
  useEffect(() => {
    // Handler for fare calculation events
    const handleFareCalculated = (event: CustomEvent) => {
      if (processingEventRef.current) return; // Prevent recursion
      if (!event.detail || !event.detail.cabId || !event.detail.fare) return;
      
      // Skip processing if already handling this exact fare
      if (event.detail.fare && event.detail.cabId && 
          fareTracker.isProcessing(event.detail.cabId, event.detail.fare)) {
        return;
      }
      
      processingEventRef.current = true;
      
      try {
        const { cabId, fare, tripType: eventTripType, source = 'unknown' } = event.detail;
        
        // Skip if this event isn't for our trip type
        if (eventTripType && eventTripType !== tripType) {
          processingEventRef.current = false;
          return;
        }
        
        // Skip if the fare hasn't changed in our local state and it's not a forced update
        if (!event.detail.forceSync && !fareTracker.isFareChanged(cabId, fare)) {
          processingEventRef.current = false;
          return;
        }
        
        // Track if this came from the database
        if (source === 'database') {
          dbSyncCompletedRef.current = true;
          lastFareDbUpdateRef.current = Date.now();
        }
        
        // Find the cab to get driver allowance value
        const cab = cabTypes.find(c => c.id === cabId);
        let finalFare = fare;
        
        // For airport transfers, ensure driver allowance is removed
        if (tripType === 'airport' && cab && cab.driverAllowance) {
          finalFare = ensureNoDriverAllowanceForAirport(fare, cab.driverAllowance, tripType);
        }
        
        // Track this update to avoid duplicates
        fareTracker.trackFare(cabId, finalFare);
        
        // Update our local fares
        setLocalFares(prev => {
          const updated = { ...prev, [cabId]: finalFare };
          return updated;
        });
        
        // Store to localStorage as well
        try {
          const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
          localStorage.setItem(localStorageKey, finalFare.toString());
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
      fareTracker.resetTracking();
      dbSyncCompletedRef.current = false;
      requestFareSync(true);
    };
    
    // Handle significant fare difference events
    const handleSignificantFareDifference = (event: CustomEvent) => {
      if (processingEventRef.current) return; // Prevent recursion
      if (!event.detail || !event.detail.calculatedFare || !event.detail.cabId) return;
      
      processingEventRef.current = true;
      
      try {
        const { calculatedFare, cabId, tripType: eventTripType } = event.detail;
        
        // Skip if this event isn't for our trip type
        if (eventTripType && eventTripType !== tripType) {
          processingEventRef.current = false;
          return;
        }
        
        // Skip if the fare hasn't changed
        if (!fareTracker.isFareChanged(cabId, calculatedFare)) {
          processingEventRef.current = false;
          return;
        }
        
        // Find the cab to get driver allowance value
        const cab = cabTypes.find(c => c.id === cabId);
        let finalFare = calculatedFare;
        
        // For airport transfers, ensure driver allowance is removed
        if (tripType === 'airport' && cab && cab.driverAllowance) {
          finalFare = ensureNoDriverAllowanceForAirport(calculatedFare, cab.driverAllowance, tripType);
        }
        
        // Track this update to avoid duplicates
        fareTracker.trackFare(cabId, finalFare);
        
        // Update our local fares
        setLocalFares(prev => {
          const updated = { ...prev, [cabId]: finalFare };
          return updated;
        });
        
        // Store to localStorage
        try {
          const localStorageKey = `fare_${tripType}_${cabId.toLowerCase()}`;
          localStorage.setItem(localStorageKey, finalFare.toString());
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
  }, [tripType, localFares, cabTypes]);
  
  // CRITICAL FIX: Initial setup - load localStorage and then sync on mount
  useEffect(() => {
    // Load cached fares from localStorage first
    loadFaresFromLocalStorage();
    
    // Force initial sync on mount and only do it once
    if (!initialFetchCompletedRef.current) {
      setTimeout(() => {
        requestFareSync(true);
      }, 200);
    }
    
    // Set up a periodic sync to ensure fares stay up to date
    // But do it with much less frequency to avoid performance issues
    const intervalId = setInterval(() => {
      // Only do periodic sync if we haven't completed DB sync yet
      // and if it's been more than 10 seconds since the last DB update
      if (!dbSyncCompletedRef.current && 
          Date.now() - lastFareDbUpdateRef.current > 10000) {
        requestFareSync(false);
      }
    }, 10000); // Every 10 seconds until we get DB values
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
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
