
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
          const cabId = cab.id;
          console.log(`CabList: Fetching fare for vehicle ${cabId} with trip type ${tripType}`);
          
          const fareDetails = await fetchFare({
            vehicleId: cabId,
            tripType: tripType as FareType,
            distance,
            tripMode,
            packageId: hourlyPackage
          });
          
          // Store the totalPrice from the API directly
          if (fareDetails && fareDetails.totalPrice !== undefined) {
            faresMap[cabId] = Number(fareDetails.totalPrice);
            console.log(`CabList: Set fare for ${cabId} to ${fareDetails.totalPrice} (from API)`);
          } else {
            console.warn(`CabList: Received invalid fare details for ${cabId}`, fareDetails);
            faresMap[cabId] = 0;
          }
        } catch (error) {
          console.error(`Error fetching fare for ${cab.id}:`, error);
          faresMap[cab.id] = 0;
        }
      }
      
      setFares(faresMap);
    };
    
    if (cabTypes && cabTypes.length > 0 && distance > 0) {
      loadFares();
    } else {
      console.log('CabList: Not loading fares - cabTypes empty or distance is 0');
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
