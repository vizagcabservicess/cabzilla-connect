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
  
  // Initialize displayed fares from cabFares on first render or when cabTypes change
  useEffect(() => {
    if (!initializedRef.current && Object.keys(cabFares).length > 0) {
      console.log('CabList: Initial fare setup', cabFares);
      setDisplayedFares({...cabFares});
      
      // Initialize fare history for each cab
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
  
  // Process any pending updates
  const processPendingUpdates = () => {
    if (Object.keys(pendingUpdatesRef.current).length === 0 || isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    console.log('CabList: Processing pending fare updates:', pendingUpdatesRef.current);
    
    const newFadeIn: Record<string, boolean> = {};
    const updatedFares: Record<string, number> = {...displayedFares};
    let hasChanges = false;
    
    // Process all pending updates
    Object.entries(pendingUpdatesRef.current).forEach(([cabId, fare]) => {
      if (fare > 0 && fare !== displayedFares[cabId]) {
        newFadeIn[cabId] = true;
        updatedFares[cabId] = fare;
        
        // Update fare history
        if (!fareHistoryRef.current[cabId]) {
          fareHistoryRef.current[cabId] = [];
        }
        fareHistoryRef.current[cabId].push(fare);
        
        // Keep history limited to last 5 fares
        if (fareHistoryRef.current[cabId].length > 5) {
          fareHistoryRef.current[cabId] = fareHistoryRef.current[cabId].slice(-5);
        }
        
        hasChanges = true;
        console.log(`CabList: Updating fare for ${cabId} to ${fare}`);
        
        // Immediately dispatch event for this fare update
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
    
    // Clear pending updates
    pendingUpdatesRef.current = {};
    
    // Apply updates if any valid changes were detected
    if (hasChanges) {
      setFadeIn(newFadeIn);
      refreshCountRef.current += 1;
      
      // Set a timestamp for this update
      const updateTime = Date.now();
      setLastUpdateTimestamp(updateTime);
      localStorage.setItem('lastFareUpdateTimestamp', updateTime.toString());
      
      // After a short delay, update the displayed fares
      setTimeout(() => {
        setDisplayedFares(updatedFares);
        
        // After animation completes, remove the fade-in effect
        setTimeout(() => {
          setFadeIn({});
          isProcessingRef.current = false;
        }, 400);
      }, 50);
    } else {
      isProcessingRef.current = false;
    }
  };
  
  // Schedule processing of updates
  const scheduleUpdate = () => {
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = window.setTimeout(() => {
      processPendingUpdates();
      updateTimeoutRef.current = null;
    }, 50) as unknown as number;
  };
  
  // Update displayed fares when cabFares changes
  useEffect(() => {
    // Skip if still initializing or no fares are available
    if (!initializedRef.current || Object.keys(cabFares).length === 0) return;
    
    // Check each cab for fare updates
    Object.keys(cabFares).forEach(cabId => {
      // Only process valid fares
      if (cabFares[cabId] === undefined || cabFares[cabId] === null || cabFares[cabId] <= 0) return;
      
      // Compare new fare with current displayed fare
      if (cabFares[cabId] !== displayedFares[cabId]) {
        console.log(`CabList: Adding pending update for ${cabId}, fare: ${cabFares[cabId]}`);
        pendingUpdatesRef.current[cabId] = cabFares[cabId];
      }
    });
    
    // Schedule an update if we have pending updates
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      scheduleUpdate();
    }
  }, [cabFares, displayedFares]);
  
  // Reset refresh counter periodically (every 2 minutes instead of 5)
  useEffect(() => {
    const resetInterval = setInterval(() => {
      refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
    }, 2 * 60 * 1000);
    
    return () => clearInterval(resetInterval);
  }, []);
  
  // Listen for direct cab selection with fare events
  useEffect(() => {
    const handleCabSelectedWithFare = (event: Event) => {
      if (!directUpdateEnabledRef.current) return;
      
      const customEvent = event as CustomEvent;
      console.log('CabList: Received cab-selected-with-fare event', customEvent.detail);
      
      if (customEvent.detail && customEvent.detail.cabType && customEvent.detail.fare) {
        const { cabType, fare } = customEvent.detail;
        
        // Add to pending updates
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
        
        // Add to pending updates
        if (fare > 0) {
          pendingUpdatesRef.current[cabId] = fare;
          scheduleUpdate();
        }
      }
    };
    
    // Process any immediate updates when a cab is selected
    const handleCabSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabType) {
        console.log('CabList: Received cab-selected event', customEvent.detail);
        
        // Update fadeIn effect for the selected cab
        setFadeIn(prev => ({
          ...prev,
          [customEvent.detail.cabType]: true
        }));
        
        // Schedule clearing the effect
        setTimeout(() => {
          setFadeIn(prev => ({
            ...prev,
            [customEvent.detail.cabType]: false
          }));
        }, 500);
      }
    };
    
    // Enable throttled direct updates after a short delay to prevent initial loops
    setTimeout(() => {
      directUpdateEnabledRef.current = true;
    }, 1000);
    
    window.addEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
    window.addEventListener('fare-calculated', handleFareCalculated);
    window.addEventListener('cab-selected', handleCabSelected);
    window.addEventListener('fare-cache-cleared', () => {
      console.log('CabList: Fare cache cleared, resetting update flags');
      isProcessingRef.current = false;
      refreshCountRef.current = 0;
    });
    
    return () => {
      window.removeEventListener('cab-selected-with-fare', handleCabSelectedWithFare);
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('cab-selected', handleCabSelected);
      window.removeEventListener('fare-cache-cleared', () => {});
      
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // Helper to get the most reliable fare
  const getDisplayFare = (cab: CabType): number => {
    // First try the displayed fare
    if (displayedFares[cab.id] && displayedFares[cab.id] > 0) {
      return displayedFares[cab.id];
    }
    
    // Then try the latest fare
    if (cabFares[cab.id] && cabFares[cab.id] > 0) {
      return cabFares[cab.id];
    }
    
    // Then try the price from the cab object itself
    if (cab.price && cab.price > 0) {
      return cab.price;
    }
    
    // Finally try the fare history
    if (fareHistoryRef.current[cab.id] && fareHistoryRef.current[cab.id].length > 0) {
      // Get the most recent non-zero fare
      for (let i = fareHistoryRef.current[cab.id].length - 1; i >= 0; i--) {
        if (fareHistoryRef.current[cab.id][i] > 0) {
          return fareHistoryRef.current[cab.id][i];
        }
      }
    }
    
    // If all else fails, return a fallback value based on vehicle type
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
  
  // Helper to create a more smooth cab selection and ensure fare updates
  const enhancedSelectCab = (cab: CabType) => {
    // Call the parent handler
    handleSelectCab(cab);
    
    // Provide immediate visual feedback
    setFadeIn(prev => ({
      ...prev,
      [cab.id]: true
    }));
    
    // Get the current fare for this cab
    const currentFare = getDisplayFare(cab);
    
    // Dispatch custom event with selected cab and fare
    window.dispatchEvent(new CustomEvent('cab-selected', {
      bubbles: true,
      detail: {
        cabType: cab.id,
        cabName: cab.name,
        fare: currentFare,
        timestamp: Date.now()
      }
    }));
    
    // If we have a valid fare, also dispatch a fare event
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
    }
    
    // Clear the highlight after animation
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
