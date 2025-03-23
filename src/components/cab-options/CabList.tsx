
import React, { useEffect, useState } from 'react';
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
  const [displayedFares, setDisplayedFares] = useState<Record<string, number>>(cabFares);
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  
  // Update displayed fares when cabFares changes with visual feedback
  useEffect(() => {
    const newFadeIn: Record<string, boolean> = {};
    const updatedCabs: string[] = [];
    
    // Check for updated fares with visual emphasis
    Object.keys(cabFares).forEach(cabId => {
      if (cabFares[cabId] !== displayedFares[cabId]) {
        newFadeIn[cabId] = true;
        updatedCabs.push(cabId);
      }
    });
    
    // If any fares have changed, create visual effect and log
    if (Object.keys(newFadeIn).length > 0) {
      console.log('CabList: Detected fare changes for vehicles:', updatedCabs);
      setFadeIn(newFadeIn);
      
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
        }, 1000);
      }, 100);
    } else if (JSON.stringify(displayedFares) !== JSON.stringify(cabFares)) {
      // Even if individual fares haven't changed, ensure displayedFares matches cabFares
      console.log('CabList: Syncing displayed fares with current fares');
      setDisplayedFares({...cabFares});
    }
  }, [cabFares]);
  
  // Enhanced event listener system for fare updates
  useEffect(() => {
    const handleFareEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventName = event.type;
      
      console.log(`CabList: Detected ${eventName} event`, customEvent.detail);
      
      // Force a refresh by clearing the fadeIn state
      setFadeIn({});
      
      // Set a timestamp for this update
      const updateTime = Date.now();
      setLastUpdateTimestamp(updateTime);
      
      // Force update displayed fares with a delay to ensure we get fresh data
      setTimeout(() => {
        setDisplayedFares({...cabFares});
        console.log('CabList: Forced update of displayed fares after event');
      }, 200);
      
      // Dispatch a secondary event to ensure CabOptions recalculates
      window.dispatchEvent(new CustomEvent('force-fare-recalculation', {
        detail: { source: 'CabList', timestamp: updateTime }
      }));
    };
    
    // Setup event listeners for all fare-related events
    const events = [
      'fare-cache-cleared',
      'local-fares-updated',
      'trip-fares-updated',
      'airport-fares-updated',
      'cab-selected-for-local',
      'hourly-package-selected'
    ];
    
    events.forEach(eventName => {
      window.addEventListener(eventName, handleFareEvent);
    });
    
    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, handleFareEvent);
      });
    };
  }, [cabFares]);
  
  return (
    <div className="space-y-3">
      {isCalculatingFares && (
        <div className="bg-blue-50 p-3 rounded-md flex items-center justify-center mb-3">
          <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-600 text-sm">Calculating fares...</span>
        </div>
      )}
      
      {cabTypes.map((cab) => (
        <div 
          key={cab.id || `cab-${Math.random()}`}
          className={`transition-all duration-500 ${fadeIn[cab.id] ? 'bg-yellow-50' : ''}`}
          data-last-update={lastUpdateTimestamp}
        >
          <CabOptionCard 
            cab={cab}
            fare={displayedFares[cab.id] || 0}
            isSelected={selectedCabId === cab.id}
            onSelect={handleSelectCab}
            fareDetails={getFareDetails(cab)}
            isCalculating={isCalculatingFares}
          />
        </div>
      ))}
    </div>
  );
}
