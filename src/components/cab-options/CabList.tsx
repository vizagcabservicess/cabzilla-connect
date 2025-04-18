
import React from 'react';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import { useFare, FareType, TripDirectionType } from '@/hooks/useFare';
import { useState, useEffect } from 'react';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  tripType?: string;
  tripMode?: TripDirectionType;
  distance?: number;
  hourlyPackage?: string;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
}

export function CabList({
  cabTypes,
  selectedCabId,
  tripType = 'outstation',
  tripMode = 'one-way',
  distance = 0,
  hourlyPackage,
  handleSelectCab,
  getFareDetails
}: CabListProps) {
  const [fares, setFares] = useState<Record<string, number>>({});
  const { fetchFare, isLoading } = useFare();
  
  useEffect(() => {
    const loadFares = async () => {
      const promises = cabTypes.map(async (cab) => {
        try {
          const fareDetails = await fetchFare({
            vehicleId: cab.id,
            tripType: tripType as FareType,
            distance,
            tripMode,
            packageId: hourlyPackage
          });
          
          if (fareDetails.totalPrice > 0) {
            setFares(prev => ({
              ...prev,
              [cab.id]: fareDetails.totalPrice
            }));
          }
        } catch (error) {
          console.error(`Error fetching fare for ${cab.id}:`, error);
        }
      });
      
      await Promise.all(promises);
    };
    
    loadFares();
  }, [cabTypes, tripType, tripMode, distance, hourlyPackage, fetchFare]);
  
  if (!cabTypes || cabTypes.length === 0) {
    return (
      <div className="bg-amber-50 p-4 rounded-md text-amber-800 text-center">
        <p className="font-medium">No cab options available</p>
        <p className="text-sm mt-1">Please try refreshing the page.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {cabTypes.map((cab) => (
        <div key={cab.id} className="transition-all duration-300">
          <CabOptionCard 
            cab={cab}
            fare={fares[cab.id] || 0}
            isSelected={selectedCabId === cab.id}
            onSelect={() => handleSelectCab(cab)}
            fareDetails={getFareDetails(cab)}
            isCalculating={isLoading(cab.id)}
          />
        </div>
      ))}
    </div>
  );
}
