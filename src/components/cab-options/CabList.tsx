
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
  const [fetchAttempts, setFetchAttempts] = useState<Record<string, number>>({});
  const { fetchFare, isLoading } = useFare();
  
  useEffect(() => {
    const loadFares = async () => {
      console.log(`CabList: Loading fares for ${cabTypes.length} vehicles with type ${tripType}`);
      
      const faresMap: Record<string, number> = {};
      const loadingMap: Record<string, boolean> = {};
      const attemptsMap: Record<string, number> = {};
      
      // Initialize loading state for all cabs
      cabTypes.forEach(cab => {
        loadingMap[cab.id] = true;
        attemptsMap[cab.id] = 0;
      });
      setLoadingFares(loadingMap);
      setFetchAttempts(attemptsMap);
      
      // Load fares for each cab type with a small delay to prevent overwhelming the server
      for (const [index, cab] of cabTypes.entries()) {
        try {
          const cabId = cab.id;
          console.log(`CabList: Fetching fare for vehicle ${cabId} with trip type ${tripType}`);
          
          // Add a small delay between requests
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Make API request to fetch fare
          const fareDetails = await fetchFare({
            vehicleId: cabId,
            tripType: tripType as FareType,
            distance,
            tripMode,
            packageId: hourlyPackage
          });
          
          console.log(`CabList: Received fare details for ${cabId}:`, fareDetails);
          
          // Store the totalPrice from the API
          if (fareDetails && fareDetails.totalPrice !== undefined && fareDetails.totalPrice > 0) {
            faresMap[cabId] = Number(fareDetails.totalPrice);
            console.log(`CabList: Set fare for ${cabId} to ${fareDetails.totalPrice} (from API)`);
          } else {
            console.warn(`CabList: Received invalid fare details for ${cabId}`, fareDetails);
            
            // Retry the fare fetch once more with normalized ID if totalPrice is missing or 0
            if (attemptsMap[cabId] < 1) {
              attemptsMap[cabId]++;
              setFetchAttempts({...attemptsMap});
              
              // Try with normalized ID for the retry
              const normalizedId = cabId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
              console.log(`CabList: Retrying with normalized ID ${normalizedId}`);
              
              try {
                const retryFareDetails = await fetchFare({
                  vehicleId: normalizedId,
                  tripType: tripType as FareType,
                  distance,
                  tripMode,
                  packageId: hourlyPackage
                });
                
                if (retryFareDetails && retryFareDetails.totalPrice > 0) {
                  faresMap[cabId] = Number(retryFareDetails.totalPrice);
                  console.log(`CabList: Retry succeeded! Set fare for ${cabId} to ${retryFareDetails.totalPrice}`);
                } else {
                  // Use fallback pricing if retry also fails
                  const fallbackPrice = calculateFallbackPrice(cab, tripType, distance, hourlyPackage);
                  faresMap[cabId] = fallbackPrice;
                  console.log(`CabList: Retry failed, using fallback price for ${cabId}: ${fallbackPrice}`);
                }
              } catch (retryError) {
                console.error(`Error on retry for ${cabId}:`, retryError);
                const fallbackPrice = calculateFallbackPrice(cab, tripType, distance, hourlyPackage);
                faresMap[cabId] = fallbackPrice;
                console.log(`CabList: Retry error, using fallback price for ${cabId}: ${fallbackPrice}`);
              }
            } else {
              // If we've already retried, use fallback pricing
              const fallbackPrice = calculateFallbackPrice(cab, tripType, distance, hourlyPackage);
              faresMap[cabId] = fallbackPrice;
              console.log(`CabList: Max retries reached, using fallback price for ${cabId}: ${fallbackPrice}`);
            }
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
      // Find the closest matching key
      let rate = 15; // default
      let matchedKey = '';
      Object.keys(baseRates).forEach(key => {
        if (cab.id.toLowerCase().includes(key)) {
          if (matchedKey === '' || key.length > matchedKey.length) {
            matchedKey = key;
            rate = baseRates[key];
          }
        }
      });
      const basePrice = Math.max(3000, distance * rate);
      // Add driver allowance
      return basePrice + 250;
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
      // Find the closest matching key
      let basePrice = 1000; // default
      let matchedKey = '';
      Object.keys(baseRates).forEach(key => {
        if (cab.id.toLowerCase().includes(key)) {
          if (matchedKey === '' || key.length > matchedKey.length) {
            matchedKey = key;
            basePrice = baseRates[key];
          }
        }
      });
      // Add distance-based pricing
      if (distance > 10) {
        basePrice += (distance - 10) * 15;
      }
      // Add airport fee and round to nearest 10
      return Math.ceil((basePrice + 200) / 10) * 10;
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
      
      // Find the closest matching key
      let price = 2400; // default sedan 8hrs-80km price
      let matchedKey = '';
      Object.keys(packageRates).forEach(key => {
        if (cab.id.toLowerCase().includes(key)) {
          if (matchedKey === '' || key.length > matchedKey.length) {
            matchedKey = key;
            price = packageRates[key][defaultPackage] || packageRates[key]['8hrs-80km'];
          }
        }
      });
      
      return price;
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
