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
  const maxRefreshesRef = useRef(5);
  const initializedRef = useRef(false);
  const fareHistoryRef = useRef<Record<string, number[]>>({});
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const updateTimeoutRef = useRef<number | null>(null);
  const directUpdateEnabledRef = useRef<boolean>(true);
  const fareCalculatedTimestampsRef = useRef<Record<string, number>>({});
  const calculatedFaresRef = useRef<Record<string, {fare: number, timestamp: number}>>({});
  
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
        const { cabType, fare, timestamp } = customEvent.detail;
        
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
        const { cabId, fare, calculated = false, timestamp = Date.now(), tripType } = customEvent.detail;
        
        const tripTypeFromStorage = localStorage.getItem('tripType');
        const isAirportTransfer = tripType === 'airport' || tripTypeFromStorage === 'airport';
        
        if (calculated) {
          calculatedFaresRef.current[cabId] = { fare, timestamp };
          console.log(`CabList: Stored calculated fare for ${cabId}: ${fare}`);
        }
        
        fareCalculatedTimestampsRef.current[cabId] = timestamp;
        
        if (fare > 0) {
          if (isAirportTransfer && calculated) {
            pendingUpdatesRef.current[cabId] = fare;
            try {
              const localStorageKey = `fare_${tripType || 'airport'}_${cabId.toLowerCase()}`;
              localStorage.setItem(localStorageKey, fare.toString());
            } catch (e) {
              console.error('Error updating localStorage with calculated fare:', e);
            }
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
        
        pendingUpdatesRef.current[cabId] = calculatedFare;
        processPendingUpdates();
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
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference);
    window.addEventListener('fare-cache-cleared', () => {
      console.log('CabList: Fare cache cleared, resetting update flags');
      isProcessingRef.current = false;
      refreshCountRef.current = 0;
      fareCalculatedTimestampsRef.current = {};
      calculatedFaresRef.current = {};
    });
    
    return () => {
      window.removeEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('cab-selected', handleCabSelected);
      window.removeEventListener('trip-type-changed', handleTripTypeChanged);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference);
      window.removeEventListener('fare-cache-cleared', () => {});
      
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [cabTypes, selectedCabId]);
  
  const getDisplayFare = (cab: CabType): number => {
    const cabId = cab.id;
    const isSelected = selectedCabId === cabId;
    
    const tripType = localStorage.getItem('tripType');
    const currentPackage = localStorage.getItem('currentHourlyPackage');
    
    if (tripType === 'local' && 
        (cabId === 'mpv' || cabId === 'innova_hycross' || cabId.toLowerCase().includes('hycross')) && 
        (currentPackage?.includes('8hrs') || currentPackage?.includes('8hr') || 
         currentPackage?.includes('08hrs') || currentPackage?.includes('08hr'))) {
      console.log(`CabList: Special handling for MPV/${cabId} with 8hrs package - using fixed price 4000`);
      return 4000;
    }
    
    const isAirportTransfer = tripType === 'airport';
    
    if (isAirportTransfer && calculatedFaresRef.current[cabId] && calculatedFaresRef.current[cabId].fare > 0) {
      console.log(`CabList: Using calculated fare for ${cabId}: ${calculatedFaresRef.current[cabId].fare}`);
      return calculatedFaresRef.current[cabId].fare;
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
    
    const fallbackPrices: Record<string, number> = {
      'sedan': 1500,
      'ertiga': 2000,
      'innova': 2500,
      'innova_crysta': 2500,
      'luxury': 3500,
      'tempo': 4000
    };
    
    const vehicleType = cabId.toLowerCase();
    return fallbackPrices[vehicleType] || 2000;
  };
  
  const enhancedSelectCab = (cab: CabType) => {
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
    
    if (currentFare > 0) {
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        bubbles: true,
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: currentFare,
          timestamp: Date.now()
        }
      }));
      
      const tripType = localStorage.getItem('tripType');
      if (tripType === 'airport') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('request-fare-calculation', {
            bubbles: true,
            detail: {
              cabId: cab.id,
              cabName: cab.name,
              timestamp: Date.now()
            }
          }));
        }, 50);
      }
    }
    
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
              isCalculating={isCalculatingFares}
            />
          </div>
        ))
      )}
    </div>
  );
}
