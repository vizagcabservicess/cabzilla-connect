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
  const maxRefreshesRef = useRef(3); // Limit total refreshes
  const initializedRef = useRef(false);
  const fareHistoryRef = useRef<Record<string, number[]>>({});
  
  // Initialize displayed fares from cabFares on first render or when cabTypes change
  useEffect(() => {
    if (!initializedRef.current && Object.keys(cabFares).length > 0) {
      console.log('CabList: Initial fare setup', cabFares);
      setDisplayedFares({...cabFares});
      
      // Initialize fare history for each cab
      const newFareHistory: Record<string, number[]> = {};
      Object.keys(cabFares).forEach(cabId => {
        newFareHistory[cabId] = [cabFares[cabId]];
      });
      fareHistoryRef.current = newFareHistory;
      
      initializedRef.current = true;
    }
  }, [cabFares, cabTypes]);
  
  // Update displayed fares when cabFares changes
  useEffect(() => {
    // Skip if still initializing or no fares are available
    if (!initializedRef.current || Object.keys(cabFares).length === 0) return;
    if (isProcessingRef.current) return;
    if (refreshCountRef.current >= maxRefreshesRef.current) {
      console.log(`CabList: Skipping update - reached maximum refresh count (${maxRefreshesRef.current})`);
      return;
    }
    
    isProcessingRef.current = true;
    
    const newFadeIn: Record<string, boolean> = {};
    const updatedCabs: string[] = [];
    const updatedFares: Record<string, number> = {...displayedFares};
    let hasChanges = false;
    
    // Check each cab for fare updates
    Object.keys(cabFares).forEach(cabId => {
      // Only process valid fares
      if (cabFares[cabId] === undefined || cabFares[cabId] === null) return;
      
      // Compare new fare with current displayed fare
      if (cabFares[cabId] !== displayedFares[cabId]) {
        // Validate fare - if zero and we had a non-zero value before, keep the old value
        if (cabFares[cabId] === 0 && displayedFares[cabId] && displayedFares[cabId] > 0) {
          console.log(`CabList: Ignoring zero fare for cab ${cabId}, keeping previous value ${displayedFares[cabId]}`);
          // Still add to history for reference
          if (!fareHistoryRef.current[cabId]) {
            fareHistoryRef.current[cabId] = [];
          }
          fareHistoryRef.current[cabId].push(displayedFares[cabId]);
        } else {
          // Valid fare update, apply it
          newFadeIn[cabId] = true;
          updatedCabs.push(cabId);
          updatedFares[cabId] = cabFares[cabId];
          
          // Update fare history
          if (!fareHistoryRef.current[cabId]) {
            fareHistoryRef.current[cabId] = [];
          }
          fareHistoryRef.current[cabId].push(cabFares[cabId]);
          
          hasChanges = true;
        }
      }
    });
    
    // Apply updates if any valid changes were detected
    if (hasChanges && refreshCountRef.current < maxRefreshesRef.current) {
      console.log('CabList: Detected fare changes for vehicles:', updatedCabs);
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
        }, 1000);
      }, 100);
    } else {
      isProcessingRef.current = false;
    }
  }, [cabFares, displayedFares]);
  
  // Reset refresh counter periodically (every 5 minutes)
  useEffect(() => {
    const resetInterval = setInterval(() => {
      refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(resetInterval);
  }, []);
  
  // Listen for direct fare update events from admin panel
  useEffect(() => {
    const handleDirectFareUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('CabList: Received direct fare update event', customEvent.detail);
      
      if (customEvent.detail && customEvent.detail.packageId && customEvent.detail.cabType) {
        // Force reset processing flag in case it got stuck
        isProcessingRef.current = false;
        
        // Reset refresh counter to allow this critical update
        refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
      }
    };
    
    window.addEventListener('local-fares-updated', handleDirectFareUpdate);
    window.addEventListener('fare-cache-cleared', () => {
      console.log('CabList: Fare cache cleared, resetting update flags');
      isProcessingRef.current = false;
      refreshCountRef.current = 0;
    });
    
    return () => {
      window.removeEventListener('local-fares-updated', handleDirectFareUpdate);
      window.removeEventListener('fare-cache-cleared', () => {});
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
    
    // Finally try the fare history
    if (fareHistoryRef.current[cab.id] && fareHistoryRef.current[cab.id].length > 0) {
      // Get the most recent non-zero fare
      for (let i = fareHistoryRef.current[cab.id].length - 1; i >= 0; i--) {
        if (fareHistoryRef.current[cab.id][i] > 0) {
          return fareHistoryRef.current[cab.id][i];
        }
      }
    }
    
    // If all else fails, return the displayedFare (which might be 0)
    return displayedFares[cab.id] || 0;
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
            className={`transition-all duration-500 ${fadeIn[cab.id] ? 'bg-yellow-50' : ''}`}
            data-last-update={lastUpdateTimestamp}
          >
            <CabOptionCard 
              cab={cab}
              fare={getDisplayFare(cab)}
              isSelected={selectedCabId === cab.id}
              onSelect={handleSelectCab}
              fareDetails={getFareDetails(cab)}
              isCalculating={isCalculatingFares}
            />
          </div>
        ))
      )}
    </div>
  );
}
