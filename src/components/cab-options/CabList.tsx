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
  
  // Track when trip type changes to trigger re-sync
  useEffect(() => {
    if (tripTypeRef.current !== tripType) {
      console.log(`CabList: Trip type changed from ${tripTypeRef.current} to ${tripType}`);
      tripTypeRef.current = tripType;
      syncAttemptsRef.current = 0;
      processedUpdatesRef.current = {};
      
      // Request a fresh fare sync with minimal delay
      setTimeout(() => {
        requestAllFareSync();
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
  
  // On initial render, load fares from localStorage
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
        setLocalFares(prev => ({...prev, ...storedFares}));
      }
      
      // Request fare sync for all cabs
      requestAllFareSync();
      setIsInitialRender(false);
    }
  }, [isInitialRender, cabTypes, tripType]);
  
  // Request fare sync for all cab types
  const requestAllFareSync = () => {
    if (syncAttemptsRef.current > 5) {
      console.log('CabList: Max sync attempts reached, skipping');
      return;
    }
    
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
    
    // Request individual fare updates for each cab
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
  };
  
  // Listen for fare calculation events
  useEffect(() => {
    const handleFareCalculated = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.fare > 0) {
        const { cabId, fare, tripType: eventTripType } = event.detail;
        
        // Skip if this is a duplicate or unchanged update we've already processed
        if (processedUpdatesRef.current[cabId] === fare) {
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
    
    // Listen for fare calculation events
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
    };
  }, [tripType]);
  
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
