
import React, { useEffect, useState } from 'react';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import { useFare, FareType, TripDirectionType } from '@/hooks/useFare';
import { formatPrice } from '@/lib/cabData';

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
      console.log(`CabList: Loading fares for ${cabTypes.length} vehicles with type ${tripType}`);
      
      const faresMap: Record<string, number> = {};
      
      // Load fares for each cab type
      for (const cab of cabTypes) {
        try {
          const fareDetails = await fetchFare({
            vehicleId: cab.id,
            tripType: tripType as FareType,
            distance,
            tripMode,
            packageId: hourlyPackage
          });
          
          // Store the totalPrice from the API directly
          if (fareDetails && fareDetails.totalPrice !== undefined) {
            faresMap[cab.id] = fareDetails.totalPrice;
            console.log(`CabList: Set fare for ${cab.id} to ${fareDetails.totalPrice} (from API)`);
          } else {
            console.warn(`CabList: Received invalid fare details for ${cab.id}`, fareDetails);
            faresMap[cab.id] = 0;
          }
        } catch (error) {
          console.error(`Error fetching fare for ${cab.id}:`, error);
          faresMap[cab.id] = 0;
        }
      }
      
      setFares(faresMap);
    };
    
    if (cabTypes && cabTypes.length > 0) {
      loadFares();
    }
    
    // Clear all fare state when trip parameters change
    return () => {
      console.log('CabList: Clearing fare state due to parameter change');
      setFares({});
    };
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
