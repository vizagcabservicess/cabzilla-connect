
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { 
  CabCard, 
  CabCardLoading,
  CabCardHeader, 
  CabCardContent, 
  CabCardFooter 
} from './CabCard';
import { cn } from "@/lib/utils";
import { CabType } from '@/types/cab';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X } from 'lucide-react';
import { formatPrice } from '@/lib/cabData';

type CabListProps = {
  cabTypes: CabType[];
  selectedCabId: string | null;
  handleSelectCab: (cab: CabType) => void;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  getFareDetails: (cab: CabType) => string;
};

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  handleSelectCab,
  cabFares,
  isCalculatingFares,
  getFareDetails
}) => {
  const [localStorageFares, setLocalStorageFares] = useState<Record<string, number>>({});
  
  // Load any fares cached in localStorage
  useEffect(() => {
    try {
      const fares: Record<string, number> = {};
      // Load any previously stored fares from localStorage
      cabTypes.forEach(cab => {
        const airportFareKey = `airport_fare_${cab.id.toLowerCase()}`;
        const storedFare = localStorage.getItem(airportFareKey);
        if (storedFare) {
          fares[cab.id] = parseInt(storedFare, 10);
        }
      });
      
      if (Object.keys(fares).length > 0) {
        setLocalStorageFares(fares);
        console.log("Found localStorage airport fares:", fares);
      }
    } catch (error) {
      console.error("Error loading localStorage fares:", error);
    }
  }, [cabTypes]);
  
  // For debug purposes - print cab fares
  useEffect(() => {
    console.log("CabList: Initial fare setup", cabFares);
  }, [cabFares]);
  
  // Combine provided fares with any localStorage fares
  const mergedFares = { ...cabFares };
  
  if (isCalculatingFares) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <CabCardLoading key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="w-full">
        {cabTypes.map((cab) => {
          // Get the fare for this cab type, with fallback
          const fare = mergedFares[cab.id] || cab.price || 2500;
          
          return (
            <CabCard
              key={cab.id}
              className={cn(
                "cursor-pointer hover:border-blue-200 hover:shadow-md transition-all",
                selectedCabId === cab.id && "border-blue-500 ring-2 ring-blue-200 shadow-md"
              )}
              onClick={() => handleSelectCab(cab)}
            >
              <CabCardHeader image={cab.image} name={cab.name} />
              
              <CabCardContent
                capacity={cab.capacity}
                luggageCapacity={cab.luggageCapacity || 2}
                ac={cab.ac !== false}
                description={cab.description || `${cab.name} with AC`}
              />
              
              <CabCardFooter
                price={fare}
                fareDetails={getFareDetails(cab)}
                isSelected={selectedCabId === cab.id}
              />
            </CabCard>
          );
        })}
      </ScrollArea>
    </div>
  );
};
