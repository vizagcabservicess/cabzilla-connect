
import { useState, useEffect, useRef } from 'react';
import { CabType } from '@/types/cab';

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
  const processedUpdatesRef = useRef<Record<string, number>>({});
  
  // Track when trip type changes to force re-sync
  useEffect(() => {
    if (previousTripTypeRef.current !== tripType) {
      console.log(`useFareSync: Trip type changed from ${previousTripTypeRef.current} to ${tripType}`);
      previousTripTypeRef.current = tripType;
      syncAttemptsRef.current = 0;
      processedUpdatesRef.current = {};
      setCabFares({});
      
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
  
  // Initial load of fares from localStorage
  useEffect(() => {
    if (shouldSync && cabTypes.length > 0) {
      loadFaresFromStorage();
      
      // Request immediate sync on mount
      requestFareSync();
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
      console.log('useFareSync: Max sync attempts reached, skipping');
      return;
    }
    
    if (syncInProgress && !forceSync) {
      console.log('useFareSync: Sync already in progress, skipping');
      return;
    }
    
    syncAttemptsRef.current++;
    setSyncInProgress(true);
    
    console.log(`useFareSync: Requesting fare sync (attempt ${syncAttemptsRef.current})`);
    
    // System-wide fare sync request
    window.dispatchEvent(new CustomEvent('request-fare-sync', {
      detail: {
        tripType: tripType,
        forceSync: true,
        instant: true,
        timestamp: Date.now()
      }
    }));
    
    // Individual requests for each cab
    cabTypes.forEach((cab, index) => {
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
      }, index * 20);
    });
    
    // Finish sync
    setTimeout(() => {
      setSyncInProgress(false);
      setLastSyncTime(Date.now());
    }, cabTypes.length * 20 + 100);
  };
  
  // Listen for fare calculation events
  useEffect(() => {
    if (!shouldSync) return;
    
    const handleFareCalculated = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.fare > 0) {
        const { cabId, fare, tripType: eventTripType } = event.detail;
        
        // Skip if this is the same value we already have
        if (cabFares[cabId] === fare) {
          return;
        }
        
        // Skip if we've already processed this exact update
        if (processedUpdatesRef.current[cabId] === fare) {
          return;
        }
        
        // Track this update to avoid duplicates
        processedUpdatesRef.current[cabId] = fare;
        
        console.log(`useFareSync: Received fare update for ${cabId}: ${fare}`);
        
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
      }
    };
    
    // Listen for fare events
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
    };
  }, [cabFares, shouldSync, tripType]);
  
  // When selected cab changes, ensure its fare is up to date
  useEffect(() => {
    if (selectedCab && shouldSync) {
      const currentFare = cabFares[selectedCab.id];
      
      if (currentFare && currentFare > 0) {
        // If we have a valid fare, emit update
        window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
          detail: {
            cabType: selectedCab.id,
            cabName: selectedCab.name,
            fare: currentFare,
            tripType: tripType,
            forceSync: true,
            timestamp: Date.now()
          }
        }));
      } else {
        // If no valid fare, request calculation
        window.dispatchEvent(new CustomEvent('request-fare-calculation', {
          detail: {
            cabId: selectedCab.id,
            cabName: selectedCab.name,
            tripType: tripType,
            forceSync: true,
            timestamp: Date.now()
          }
        }));
      }
    }
  }, [selectedCab, cabFares, shouldSync, tripType]);
  
  return {
    cabFares,
    syncInProgress,
    lastSyncTime,
    requestFareSync,
    loadFaresFromStorage
  };
};
