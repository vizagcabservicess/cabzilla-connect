
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
            
            // Fallback pricing based on trip type, distance and vehicle
            let fallbackPrice = 0;
            
            if (tripType === 'outstation') {
              // Basic outstation pricing
              const baseRates: Record<string, number> = {
                'sedan': 14,
                'ertiga': 18,
                'innova_crysta': 20,
                'luxury': 25,
                'tempo': 22,
                'bus': 28
              };
              const rate = baseRates[cabId] || 15;
              fallbackPrice = Math.max(3000, distance * rate);
            } else if (tripType === 'airport') {
              // Basic airport pricing
              const baseRates: Record<string, number> = {
                'sedan': 1000,
                'ertiga': 1200,
                'innova_crysta': 1500,
                'luxury': 2000,
                'tempo': 2500,
                'bus': 3000
              };
              fallbackPrice = baseRates[cabId] || 1000;
              if (distance > 10) fallbackPrice += (distance - 10) * 15;
            } else {
              // Local package pricing
              const packageRates: Record<string, Record<string, number>> = {
                'sedan': { '4hrs-40km': 1400, '8hrs-80km': 2400, '10hrs-100km': 3000 },
                'ertiga': { '4hrs-40km': 1800, '8hrs-80km': 3000, '10hrs-100km': 3800 },
                'innova_crysta': { '4hrs-40km': 2200, '8hrs-80km': 3500, '10hrs-100km': 4200 },
                'luxury': { '4hrs-40km': 3000, '8hrs-80km': 4500, '10hrs-100km': 5500 },
                'tempo': { '4hrs-40km': 3500, '8hrs-80km': 5500, '10hrs-100km': 6500 },
                'bus': { '4hrs-40km': 4000, '8hrs-80km': 6000, '10hrs-100km': 7500 }
              };
              
              const defaultPackage = hourlyPackage || '8hrs-80km';
              fallbackPrice = packageRates[cabId]?.[defaultPackage] || packageRates['sedan'][defaultPackage];
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
          
          // Calculate a fallback price based on cab and trip type
          const fallbackPrice = calculateFallbackPrice(cab, tripType, distance, hourlyPackage);
          faresMap[cab.id] = fallbackPrice;
          console.log(`CabList: Using error fallback price for ${cab.id}: ${fallbackPrice}`);
          
          // Update fares for this cab
          setFares(prev => ({...prev, [cab.id]: fallbackPrice}));
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
  
  const calculateFallbackPrice = (cab: CabType, tripType: string, distance: number, hourlyPackage?: string): number => {
    if (tripType === 'outstation') {
      // Basic outstation pricing
      const baseRates: Record<string, number> = {
        'sedan': 14,
        'ertiga': 18,
        'innova_crysta': 20,
        'luxury': 25,
        'tempo': 22,
        'bus': 28
      };
      const rate = baseRates[cab.id] || 15;
      return Math.max(3000, distance * rate);
    } else if (tripType === 'airport') {
      // Basic airport pricing
      const baseRates: Record<string, number> = {
        'sedan': 1000,
        'ertiga': 1200,
        'innova_crysta': 1500,
        'luxury': 2000,
        'tempo': 2500,
        'bus': 3000
      };
      let price = baseRates[cab.id] || 1000;
      if (distance > 10) price += (distance - 10) * 15;
      return price;
    } else {
      // Local package pricing
      const packageRates: Record<string, Record<string, number>> = {
        'sedan': { '4hrs-40km': 1400, '8hrs-80km': 2400, '10hrs-100km': 3000 },
        'ertiga': { '4hrs-40km': 1800, '8hrs-80km': 3000, '10hrs-100km': 3800 },
        'innova_crysta': { '4hrs-40km': 2200, '8hrs-80km': 3500, '10hrs-100km': 4200 },
        'luxury': { '4hrs-40km': 3000, '8hrs-80km': 4500, '10hrs-100km': 5500 },
        'tempo': { '4hrs-40km': 3500, '8hrs-80km': 5500, '10hrs-100km': 6500 },
        'bus': { '4hrs-40km': 4000, '8hrs-80km': 6000, '10hrs-100km': 7500 }
      };
      
      const defaultPackage = hourlyPackage || '8hrs-80km';
      return packageRates[cab.id]?.[defaultPackage] || packageRates['sedan'][defaultPackage];
    }
  };
  
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
