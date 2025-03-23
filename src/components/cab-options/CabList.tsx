
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
  const lastEventTimesRef = useRef<Record<string, number>>({});
  const maxRefreshesRef = useRef(3); // Limit total refreshes to 3 per page load
  
  // Initialize displayed fares from cabFares on first render
  useEffect(() => {
    // Only set initial values when cabFares has data and displayedFares is empty
    if (Object.keys(cabFares).length > 0 && Object.keys(displayedFares).length === 0) {
      console.log('CabList: Setting initial fares', cabFares);
      setDisplayedFares({...cabFares});
    }
  }, [cabFares]);
  
  // Update displayed fares when cabFares changes with visual feedback and prevent infinite loops
  useEffect(() => {
    if (isProcessingRef.current || Object.keys(cabFares).length === 0) return;
    if (refreshCountRef.current >= maxRefreshesRef.current) {
      console.log(`CabList: Skipping update - reached maximum refresh count (${maxRefreshesRef.current})`);
      return;
    }
    
    isProcessingRef.current = true;
    
    const newFadeIn: Record<string, boolean> = {};
    const updatedCabs: string[] = [];
    
    // Check for updated fares with visual emphasis
    Object.keys(cabFares).forEach(cabId => {
      // Only highlight changes if fare actually exists and has changed
      if (cabFares[cabId] && cabFares[cabId] !== displayedFares[cabId]) {
        newFadeIn[cabId] = true;
        updatedCabs.push(cabId);
      }
    });
    
    // If any fares have changed, create visual effect and log
    if (Object.keys(newFadeIn).length > 0 && refreshCountRef.current < maxRefreshesRef.current) {
      console.log('CabList: Detected fare changes for vehicles:', updatedCabs);
      setFadeIn(newFadeIn);
      refreshCountRef.current += 1;
      
      // Set a timestamp for this update
      const updateTime = Date.now();
      setLastUpdateTimestamp(updateTime);
      localStorage.setItem('lastFareUpdateTimestamp', updateTime.toString());
      
      // After a short delay, update the displayed fares
      setTimeout(() => {
        setDisplayedFares({...cabFares});
        
        // After animation completes, remove the fade-in effect
        setTimeout(() => {
          setFadeIn({});
          isProcessingRef.current = false;
        }, 1000);
      }, 100);
    } else if (JSON.stringify(displayedFares) !== JSON.stringify(cabFares) && refreshCountRef.current < maxRefreshesRef.current) {
      // Even if individual fares haven't changed, ensure displayedFares matches cabFares
      console.log('CabList: Syncing displayed fares with current fares');
      setDisplayedFares({...cabFares});
      refreshCountRef.current += 1;
      isProcessingRef.current = false;
    } else {
      isProcessingRef.current = false;
    }
  }, [cabFares, displayedFares]);
  
  // Reset refresh counter periodically (every 5 minutes)
  useEffect(() => {
    const resetInterval = setInterval(() => {
      refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
    }, 5 * 60 * 1000); // Reset counter gradually every 5 minutes
    
    return () => clearInterval(resetInterval);
  }, []);
  
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
              fare={displayedFares[cab.id] || cabFares[cab.id] || 0}
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
