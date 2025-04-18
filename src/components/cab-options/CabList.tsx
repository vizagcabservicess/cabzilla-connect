
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  
  // Use refs to prevent excessive re-renders and state updates
  const initializedRef = useRef(false);
  const fareHistoryRef = useRef<Record<string, number[]>>({});
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const updateTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const updateQueueRef = useRef<Set<string>>(new Set());
  const throttleTimestampRef = useRef<Record<string, number>>({});
  
  const mapTripType = (type: string): TripFareType => {
    if (type === 'local') return 'local';
    if (type === 'airport') return 'airport';
    return 'outstation';
  };
  
  const { fares: hookFares, isLoading: isLoadingFares } = useTripFare(mapTripType(tripType));
  
  // Set up initial fares when they become available
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
  }, [cabFares]);
  
  // Process pending fare updates - throttled to prevent UI flickering
  const processPendingUpdates = useCallback(() => {
    if (Object.keys(pendingUpdatesRef.current).length === 0 || isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    
    const now = Date.now();
    const newFadeIn: Record<string, boolean> = {};
    const updatedFares: Record<string, number> = {...displayedFares};
    let hasChanges = false;
    
    Object.entries(pendingUpdatesRef.current).forEach(([cabId, fare]) => {
      // Only update if fare is valid and different from current display
      if (fare > 0 && fare !== displayedFares[cabId]) {
        // Throttle individual cab updates to prevent flickering
        const lastUpdate = throttleTimestampRef.current[cabId] || 0;
        if (now - lastUpdate < 2000) {
          // Just queue this update for later if too recent
          updateQueueRef.current.add(cabId);
          return;
        }
        
        newFadeIn[cabId] = true;
        updatedFares[cabId] = fare;
        throttleTimestampRef.current[cabId] = now;
        
        if (!fareHistoryRef.current[cabId]) {
          fareHistoryRef.current[cabId] = [];
        }
        fareHistoryRef.current[cabId].push(fare);
        
        if (fareHistoryRef.current[cabId].length > 5) {
          fareHistoryRef.current[cabId] = fareHistoryRef.current[cabId].slice(-5);
        }
        
        hasChanges = true;
        console.log(`CabList: Updating fare for ${cabId} to ${fare}`);
      }
    });
    
    pendingUpdatesRef.current = {};
    
    if (hasChanges) {
      setFadeIn(newFadeIn);
      setLastUpdateTimestamp(now);
      
      // Use minimal state updates for better performance
      setTimeout(() => {
        setDisplayedFares(updatedFares);
        
        setTimeout(() => {
          setFadeIn({});
          isProcessingRef.current = false;
          
          // Process any queued updates
          if (updateQueueRef.current.size > 0) {
            const queuedUpdates: Record<string, number> = {};
            updateQueueRef.current.forEach(cabId => {
              if (hookFares[cabId] && hookFares[cabId] > 0) {
                queuedUpdates[cabId] = hookFares[cabId];
              }
            });
            updateQueueRef.current.clear();
            
            if (Object.keys(queuedUpdates).length > 0) {
              pendingUpdatesRef.current = queuedUpdates;
              scheduleUpdate();
            }
          }
        }, 400);
      }, 50);
    } else {
      isProcessingRef.current = false;
    }
  }, [displayedFares, hookFares]);
  
  // Schedule an update with debouncing
  const scheduleUpdate = useCallback(() => {
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = window.setTimeout(() => {
      processPendingUpdates();
      updateTimeoutRef.current = null;
    }, 300) as unknown as number;
  }, [processPendingUpdates]);
  
  // Handle changes in hook fares
  useEffect(() => {
    if (Object.keys(hookFares).length > 0 && initializedRef.current) {
      const updates: Record<string, number> = {};
      let hasUpdates = false;
      
      Object.entries(hookFares).forEach(([cabId, fare]) => {
        // Only queue significant changes (e.g., more than 10 rupees difference)
        if (fare > 0 && (!displayedFares[cabId] || Math.abs(displayedFares[cabId] - fare) > 10)) {
          updates[cabId] = fare;
          hasUpdates = true;
        }
      });
      
      if (hasUpdates) {
        pendingUpdatesRef.current = {...pendingUpdatesRef.current, ...updates};
        scheduleUpdate();
      }
    }
  }, [hookFares, displayedFares, scheduleUpdate]);
  
  // Handle external events only when necessary
  useEffect(() => {
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare } = customEvent.detail;
        
        if (fare > 0) {
          // Throttle event handling
          const now = Date.now();
          const lastEventTime = throttleTimestampRef.current[`event_${cabId}`] || 0;
          if (now - lastEventTime < 3000) {
            return;
          }
          
          throttleTimestampRef.current[`event_${cabId}`] = now;
          pendingUpdatesRef.current[cabId] = fare;
          scheduleUpdate();
        }
      }
    };
    
    // Cleanup handler for fare-cache-cleared events
    const handleCacheCleared = () => {
      console.log('CabList: Fare cache cleared, resetting update flags');
      isProcessingRef.current = false;
      updateQueueRef.current.clear();
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated);
    window.addEventListener('fare-cache-cleared', handleCacheCleared);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('fare-cache-cleared', handleCacheCleared);
      
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [scheduleUpdate]);
  
  // Get the fare to display for a specific cab
  const getDisplayFare = useCallback((cab: CabType): number => {
    // Use hook fares if available (most up-to-date)
    if (hookFares[cab.id] && hookFares[cab.id] > 0) {
      return hookFares[cab.id];
    }
    
    // Use displayed fares if available (what user currently sees)
    if (displayedFares[cab.id] && displayedFares[cab.id] > 0) {
      return displayedFares[cab.id];
    }
    
    // Fall back to passed-in fares
    if (cabFares[cab.id] && cabFares[cab.id] > 0) {
      return cabFares[cab.id];
    }
    
    // Use cab's default price if available
    if (cab.price && cab.price > 0) {
      return cab.price;
    }
    
    // Fall back to fare history if available
    if (fareHistoryRef.current[cab.id] && fareHistoryRef.current[cab.id].length > 0) {
      for (let i = fareHistoryRef.current[cab.id].length - 1; i >= 0; i--) {
        if (fareHistoryRef.current[cab.id][i] > 0) {
          return fareHistoryRef.current[cab.id][i];
        }
      }
    }
    
    // Last resort - default fallback prices
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
  }, [hookFares, displayedFares, cabFares]);
  
  // Enhanced cab selection with reduced event dispatching
  const enhancedSelectCab = useCallback((cab: CabType) => {
    // Don't dispatch events for same cab selection
    if (cab.id === selectedCabId) {
      handleSelectCab(cab);
      return;
    }
    
    handleSelectCab(cab);
    
    setFadeIn(prev => ({
      ...prev,
      [cab.id]: true
    }));
    
    // Limit fare updating on selection to prevent loops
    const currentFare = getDisplayFare(cab);
    const now = Date.now();
    const lastSelectionTime = throttleTimestampRef.current.selection || 0;
    
    if (now - lastSelectionTime > 1000) {
      throttleTimestampRef.current.selection = now;
      
      // Simplified event with required data only
      window.dispatchEvent(new CustomEvent('cab-selected', {
        bubbles: true,
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: currentFare,
          timestamp: now
        }
      }));
    }
    
    setTimeout(() => {
      setFadeIn(prev => ({
        ...prev,
        [cab.id]: false
      }));
    }, 500);
  }, [selectedCabId, handleSelectCab, getDisplayFare]);
  
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
