import React, { useEffect, useState, useRef } from 'react';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import { useTripFare, TripFareType } from '@/hooks/useTripFare';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  tripType?: string;
}

export function CabList({
  cabTypes,
  selectedCabId,
  cabFares,
  isCalculatingFares,
  handleSelectCab,
  getFareDetails,
  tripType = 'outstation'
}: CabListProps) {
  const [displayedFares, setDisplayedFares] = useState<Record<string, number>>({});
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  const refreshCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const maxRefreshesRef = useRef(5);
  const initializedRef = useRef(false);
  const fareHistoryRef = useRef<Record<string, number[]>>({});
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const updateTimeoutRef = useRef<number | null>(null);
  const directUpdateEnabledRef = useRef<boolean>(true);
  
  const mapTripType = (type: string): TripFareType => {
    if (type === 'local') return 'local';
    if (type === 'airport') return 'airport';
    return 'outstation';
  };
  
  const { 
    fares: hookFares, 
    isLoading: isLoadingFares, 
    fetchFares,
    fetchFare
  } = useTripFare(mapTripType(tripType));
  
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
  
  useEffect(() => {
    if (cabTypes.length > 0) {
      const vehicleIds = cabTypes.map(cab => cab.id);
      fetchFares(vehicleIds, mapTripType(tripType), {}, false);
    }
  }, [cabTypes, tripType, fetchFares]);
  
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
        
        window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
          detail: {
            cabType: cabId,
            cabName: cabTypes.find(cab => cab.id === cabId)?.name || cabId,
            fare: fare,
            timestamp: Date.now()
          }
        }));
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
        const { cabType, fare } = customEvent.detail;
        
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
        const { cabId, fare } = customEvent.detail;
        
        if (fare > 0) {
          pendingUpdatesRef.current[cabId] = fare;
          scheduleUpdate();
        }
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
      
      if (customEvent.detail && customEvent.detail.tripType) {
        const tripType = customEvent.detail.tripType;
        
        setDisplayedFares({});
        fareHistoryRef.current = {};
      }
    };
    
    setTimeout(() => {
      directUpdateEnabledRef.current = true;
    }, 1000);
    
    window.addEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
    window.addEventListener('fare-calculated', handleFareCalculated);
    window.addEventListener('cab-selected', handleCabSelected);
    window.addEventListener('trip-type-changed', handleTripTypeChanged);
    window.addEventListener('fare-cache-cleared', () => {
      console.log('CabList: Fare cache cleared, resetting update flags');
      isProcessingRef.current = false;
      refreshCountRef.current = 0;
    });
    
    return () => {
      window.removeEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('cab-selected', handleCabSelected);
      window.removeEventListener('trip-type-changed', handleTripTypeChanged);
      window.removeEventListener('fare-cache-cleared', () => {});
      
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [cabTypes]);
  
  const getDisplayFare = (cab: CabType): number => {
    if (hookFares[cab.id] && hookFares[cab.id] > 0) {
      return hookFares[cab.id];
    }
    
    if (displayedFares[cab.id] && displayedFares[cab.id] > 0) {
      return displayedFares[cab.id];
    }
    
    if (cabFares[cab.id] && cabFares[cab.id] > 0) {
      return cabFares[cab.id];
    }
    
    if (cab.price && cab.price > 0) {
      return cab.price;
    }
    
    if (fareHistoryRef.current[cab.id] && fareHistoryRef.current[cab.id].length > 0) {
      for (let i = fareHistoryRef.current[cab.id].length - 1; i >= 0; i--) {
        if (fareHistoryRef.current[cab.id][i] > 0) {
          return fareHistoryRef.current[cab.id][i];
        }
      }
    }
    
    const fallbackPrices: Record<string, number> = {
      'sedan': 1500,
      'ertiga': 2000,
      'innova': 2500,
      'innova_crysta': 2500,
      'luxury': 3500,
      'tempo': 4000
    };
    
    const vehicleType = cab.id.toLowerCase();
    return fallbackPrices[vehicleType] || 2000;
  };
  
  const enhancedSelectCab = (cab: CabType) => {
    fetchFare(cab.id, mapTripType(tripType), {}, true)
      .then(freshFare => {
        if (freshFare > 0) {
          pendingUpdatesRef.current[cab.id] = freshFare;
          scheduleUpdate();
          
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            bubbles: true,
            detail: {
              cabType: cab.id,
              cabName: cab.name,
              fare: freshFare,
              timestamp: Date.now()
            }
          }));
        }
      })
      .catch(err => {
        console.error(`Error fetching fresh fare for ${cab.id}:`, err);
      });
    
    handleSelectCab(cab);
    
    setFadeIn(prev => ({
      ...prev,
      [cab.id]: true
    }));
    
    const currentFare = getDisplayFare(cab);
    
    window.dispatchEvent(new CustomEvent('cab-selected', {
      bubbles: true,
      detail: {
        cabType: cab.id,
        cabName: cab.name,
        fare: currentFare,
        timestamp: Date.now()
      }
    }));
    
    setTimeout(() => {
      setFadeIn(prev => ({
        ...prev,
        [cab.id]: false
      }));
    }, 500);
  };
  
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
              isCalculating={isCalculatingFares || (isLoadingFares && displayedFares[cab.id] === undefined)}
            />
          </div>
        ))
      )}
    </div>
  );
}
