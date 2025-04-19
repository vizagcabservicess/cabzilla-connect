
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
  const [loadingFares, setLoadingFares] = useState<Record<string, boolean>>({});
  const { fetchFare, isLoading } = useFare();
  
  useEffect(() => {
    const loadFares = async () => {
      console.log(`CabList: Loading fares for ${cabTypes.length} vehicles with type ${tripType}`);
      
      const faresMap: Record<string, number> = {};
      const loadingMap: Record<string, boolean> = {};
      
      // Initialize loading state for all cabs
      cabTypes.forEach(cab => {
        loadingMap[cab.id] = true;
      });
      setLoadingFares(loadingMap);
      
      // Load fares for each cab type with a small delay to prevent overwhelming the server
      for (const [index, cab] of cabTypes.entries()) {
        try {
          const cabId = cab.id;
          console.log(`CabList: Fetching fare for vehicle ${cabId} with trip type ${tripType}`);
          
          // Add a small delay between requests
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          const fareDetails = await fetchFare({
            vehicleId: cabId,
            tripType: tripType as FareType,
            distance,
            tripMode,
            packageId: hourlyPackage
          });
          
          // Store the totalPrice from the API
          if (fareDetails && fareDetails.totalPrice !== undefined) {
            faresMap[cabId] = Number(fareDetails.totalPrice);
            console.log(`CabList: Set fare for ${cabId} to ${fareDetails.totalPrice} (from API)`);
          } else {
            console.warn(`CabList: Received invalid fare details for ${cabId}`, fareDetails);
            
            // Fallback pricing based on distance and vehicle
            let fallbackPrice = 0;
            if (tripType === 'outstation') {
              // Basic outstation pricing
              const baseRates = {
                'sedan': 14,
                'ertiga': 18,
                'innova_crysta': 20,
                'luxury': 25,
                'tempo': 22,
                'bus': 28
              };
              const rate = baseRates[cabId as keyof typeof baseRates] || 15;
              fallbackPrice = Math.max(3000, distance * rate);
            } else if (tripType === 'airport') {
              // Basic airport pricing
              const baseRates = {
                'sedan': 800,
                'ertiga': 1000,
                'innova_crysta': 1200,
                'luxury': 1500,
                'tempo': 2000,
                'bus': 2500
              };
              fallbackPrice = baseRates[cabId as keyof typeof baseRates] || 1000;
              if (distance > 10) fallbackPrice += (distance - 10) * 15;
            } else {
              // Local package pricing
              const baseRates = {
                'sedan': 800,
                'ertiga': 1000,
                'innova_crysta': 1200,
                'luxury': 1500,
                'tempo': 2000,
                'bus': 2500
              };
              fallbackPrice = baseRates[cabId as keyof typeof baseRates] || 1000;
            }
            
            // Round to nearest 10
            fallbackPrice = Math.ceil(fallbackPrice / 10) * 10;
            faresMap[cabId] = fallbackPrice;
            console.log(`CabList: Using fallback price for ${cabId}: ${fallbackPrice}`);
          }
          
          // Update fares immediately for this cab
          setFares(prev => ({...prev, [cabId]: faresMap[cabId]}));
          
          // Update loading state for this cab
          loadingMap[cabId] = false;
          setLoadingFares({...loadingMap});
          
        } catch (error) {
          console.error(`Error fetching fare for ${cab.id}:`, error);
          loadingMap[cab.id] = false;
          setLoadingFares({...loadingMap});
          
          // Ensure we at least have a non-zero price
          if (!faresMap[cab.id] || faresMap[cab.id] <= 0) {
            const fallbackPrice = cab.id === 'sedan' ? 3500 : 
                                 cab.id === 'ertiga' ? 4500 : 
                                 cab.id === 'innova_crysta' ? 5500 : 
                                 cab.id === 'luxury' ? 6500 : 
                                 cab.id === 'tempo' ? 7500 : 5000;
                                 
            faresMap[cab.id] = fallbackPrice;
            console.log(`CabList: Using error fallback price for ${cab.id}: ${fallbackPrice}`);
            
            // Update fares for this cab
            setFares(prev => ({...prev, [cab.id]: fallbackPrice}));
          }
        }
      }
    };
    
    if (cabTypes && cabTypes.length > 0 && distance > 0) {
      loadFares();
    } else {
      console.log('CabList: Not loading fares - cabTypes empty or distance is 0');
      
      // Reset loading states if we're not loading fares
      const loadingMap: Record<string, boolean> = {};
      cabTypes.forEach(cab => {
        loadingMap[cab.id] = false;
      });
      setLoadingFares(loadingMap);
    }
    
    // Clear all fare state when trip parameters change
    return () => {
      console.log('CabList: Clearing fare state due to parameter change');
      setFares({});
    };
  }, [cabTypes, tripType, tripMode, distance, hourlyPackage, fetchFare]);
  
  const isCabLoading = (cabId: string): boolean => {
    return loadingFares[cabId] || isLoading(cabId);
  };
  
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
            isCalculating={isCabLoading(cab.id)}
          />
        </div>
      ))}
    </div>
  );
}
