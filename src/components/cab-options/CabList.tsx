
import React, { useEffect, useState, useRef } from 'react';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import fareStateManager from '@/services/FareStateManager';

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
  const [displayedFares, setDisplayedFares] = useState<Record<string, number>>(cabFares);
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  
  const refreshCountRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fareCalculatedTimestamps = useRef<Record<string, number>>({});
  const initializedRef = useRef<boolean>(false);
  const eventDebounceRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!initializedRef.current && Object.keys(cabFares).length > 0) {
      console.log('CabList: Initial fare setup', cabFares);
      setDisplayedFares({...cabFares});
      initializedRef.current = true;
      
      if (selectedCabId && cabFares[selectedCabId]) {
        const selectedCabFare = cabFares[selectedCabId];
        const cabType = cabTypes.find(cab => cab.id === selectedCabId);
        
        if (cabType && selectedCabFare > 0) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
              detail: {
                cabType: selectedCabId,
                cabName: cabType.name,
                fare: selectedCabFare,
                timestamp: Date.now()
              }
            }));
          }, 100);
        }
      }
    }
  }, [cabFares, selectedCabId, cabTypes]);

  const processPendingUpdates = () => {
    if (isProcessingRef.current || Object.keys(pendingUpdatesRef.current).length === 0) {
      return;
    }
    
    isProcessingRef.current = true;
    console.log('CabList: Processing pending fare updates', pendingUpdatesRef.current);
    
    const newFadeIn: Record<string, boolean> = {};
    const updatedFares: Record<string, number> = {...displayedFares};
    let hasChanges = false;
    
    Object.entries(pendingUpdatesRef.current).forEach(([cabId, fare]) => {
      if (fare > 0 && (!updatedFares[cabId] || updatedFares[cabId] !== fare)) {
        newFadeIn[cabId] = true;
        updatedFares[cabId] = fare;
        hasChanges = true;
        
        if (cabId === selectedCabId) {
          const cabType = cabTypes.find(cab => cab.id === cabId);
          if (cabType) {
            window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
              detail: {
                cabType: cabId,
                cabName: cabType.name,
                fare: fare,
                timestamp: Date.now()
              }
            }));
          }
        }
      }
    });
    
    pendingUpdatesRef.current = {};
    
    if (hasChanges) {
      const updateTime = Date.now();
      setLastUpdateTimestamp(updateTime);
      setFadeIn(newFadeIn);
      
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

  useEffect(() => {
    if (!initializedRef.current || isProcessingRef.current) return;
    
    const currentTime = Date.now();
    const lastUpdate = eventDebounceRef.current['fares'] || 0;
    
    if (currentTime - lastUpdate < 500) return;
    
    eventDebounceRef.current['fares'] = currentTime;
    
    const newUpdates: Record<string, number> = {};
    let hasChanges = false;
    
    Object.entries(cabFares).forEach(([cabId, fare]) => {
      if (fare > 0 && (!displayedFares[cabId] || displayedFares[cabId] !== fare)) {
        newUpdates[cabId] = fare;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      console.log('CabList: Detected fare updates from props', newUpdates);
      pendingUpdatesRef.current = {...pendingUpdatesRef.current, ...newUpdates};
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        processPendingUpdates();
      }, 50);
    }
  }, [cabFares, displayedFares, selectedCabId, cabTypes]);

  useEffect(() => {
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) return;
      
      const { cabId, fare, timestamp = Date.now() } = customEvent.detail;
      
      if (!cabId || !fare || fare <= 0) return;
      
      const lastUpdate = fareCalculatedTimestamps.current[cabId] || 0;
      if (timestamp - lastUpdate < 500) return;
      
      fareCalculatedTimestamps.current[cabId] = timestamp;
      
      console.log(`CabList: Received fare calculation for ${cabId}: ${fare}`);
      pendingUpdatesRef.current[cabId] = fare;
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        processPendingUpdates();
      }, 50);
    };
    
    const handleDirectFare = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) return;
      
      const { cabType, fare, timestamp = Date.now() } = customEvent.detail;
      
      if (!cabType || !fare || fare <= 0) return;
      
      const lastUpdate = fareCalculatedTimestamps.current[cabType] || 0;
      if (timestamp - lastUpdate < 500) return;
      
      fareCalculatedTimestamps.current[cabType] = timestamp;
      
      console.log(`CabList: Received direct fare update for ${cabType}: ${fare}`);
      pendingUpdatesRef.current[cabType] = fare;
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        processPendingUpdates();
      }, 50);
    };
    
    const handleFareCacheCleared = () => {
      console.log('CabList: Fare cache cleared event received');
      fareCalculatedTimestamps.current = {};
      refreshCountRef.current = 0;
      initializedRef.current = false;
      
      // Refresh fare data from database
      const tripType = localStorage.getItem('tripType') || 'outstation';
      
      cabTypes.forEach(cab => {
        if (cab.id) {
          if (tripType === 'outstation') {
            fareStateManager.getOutstationFareForVehicle(cab.id)
              .then(() => console.log(`Refreshed outstation fare for ${cab.id}`))
              .catch(err => console.error(`Error refreshing outstation fare for ${cab.id}:`, err));
          } else if (tripType === 'local') {
            fareStateManager.getLocalFareForVehicle(cab.id)
              .then(() => console.log(`Refreshed local fare for ${cab.id}`))
              .catch(err => console.error(`Error refreshing local fare for ${cab.id}:`, err));
          } else if (tripType === 'airport') {
            fareStateManager.getAirportFareForVehicle(cab.id)
              .then(() => console.log(`Refreshed airport fare for ${cab.id}`))
              .catch(err => console.error(`Error refreshing airport fare for ${cab.id}:`, err));
          }
        }
      });
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('cab-selected-with-fare', handleDirectFare as EventListener);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('cab-selected-with-fare', handleDirectFare as EventListener);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared as EventListener);
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [cabTypes]);

  const handleCabSelection = (cab: CabType) => {
    handleSelectCab(cab);
    
    const fare = displayedFares[cab.id] || cabFares[cab.id] || 0;
    
    if (fare > 0) {
      console.log(`CabList: Dispatching fare update for selected cab ${cab.id}: ${fare}`);
      
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: fare,
          timestamp: Date.now()
        }
      }));
    } else {
      // If no fare is available, request a calculation from the database
      const tripType = localStorage.getItem('tripType') || 'outstation';
      console.log(`CabList: Requesting fare calculation for ${cab.id}`);
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('request-fare-calculation', {
          detail: {
            cabId: cab.id,
            cabName: cab.name,
            tripType,
            timestamp: Date.now()
          }
        }));
      }, 100);
    }
  };

  return (
    <div className="space-y-3 relative">
      {isCalculatingFares && (
        <div className="mb-3 flex items-center justify-center p-2 bg-blue-50 rounded-md">
          <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-600 text-sm">Calculating fares...</span>
        </div>
      )}
      
      {cabTypes.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
          No vehicles available at the moment
        </div>
      ) : (
        cabTypes.map((cab) => (
          <div
            key={cab.id || `cab-${Math.random()}`}
            className={`transition-all duration-300 ${fadeIn[cab.id] ? 'bg-yellow-50' : ''}`}
          >
            <CabOptionCard
              cab={cab}
              isSelected={selectedCabId === cab.id}
              fare={displayedFares[cab.id] || cabFares[cab.id] || 0}
              onSelect={() => handleCabSelection(cab)}
              fareDetails={getFareDetails(cab)}
              isCalculating={isCalculatingFares}
            />
          </div>
        ))
      )}
    </div>
  );
}
