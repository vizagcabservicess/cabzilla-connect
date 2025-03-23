
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
  
  // Update displayed fares when cabFares changes
  useEffect(() => {
    const newFadeIn: Record<string, boolean> = {};
    const updatedCabs: string[] = [];
    
    // Check for updated fares
    Object.keys(cabFares).forEach(cabId => {
      if (cabFares[cabId] !== displayedFares[cabId]) {
        newFadeIn[cabId] = true;
        updatedCabs.push(cabId);
      }
    });
    
    // Set fade-in effect for updated fares
    if (Object.keys(newFadeIn).length > 0) {
      setFadeIn(newFadeIn);
      
      // After a short delay, update the displayed fares
      setTimeout(() => {
        setDisplayedFares(cabFares);
        
        // After animation completes, remove the fade-in effect
        setTimeout(() => {
          setFadeIn({});
        }, 1000);
      }, 100);
      
      // Log the updated fares
      console.log('Updated fares for cabs:', updatedCabs);
    } else {
      setDisplayedFares(cabFares);
    }
  }, [cabFares]);
  
  // Listen for fare update events
  useEffect(() => {
    const handleFareUpdated = () => {
      console.log('CabList: Detected fare update event');
      // Force a refresh by clearing the fadeIn state
      setFadeIn({});
      // Force update displayed fares
      setDisplayedFares(cabFares);
    };
    
    window.addEventListener('fare-cache-cleared', handleFareUpdated);
    window.addEventListener('local-fares-updated', handleFareUpdated);
    window.addEventListener('trip-fares-updated', handleFareUpdated);
    window.addEventListener('airport-fares-updated', handleFareUpdated);
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleFareUpdated);
      window.removeEventListener('local-fares-updated', handleFareUpdated);
      window.removeEventListener('trip-fares-updated', handleFareUpdated);
      window.removeEventListener('airport-fares-updated', handleFareUpdated);
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
