
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
          
          // Extract the price from the response
          let totalPrice = 0;
          
          // First priority: Check for totalPrice property
          if (fareDetails && typeof fareDetails.totalPrice === 'number' && fareDetails.totalPrice > 0) {
            totalPrice = fareDetails.totalPrice;
            console.log(`CabList: Using totalPrice: ${totalPrice} for ${cabId}`);
          } 
          // Second priority: Check for price property
          else if (fareDetails && typeof fareDetails.price === 'number' && fareDetails.price > 0) {
            totalPrice = fareDetails.price;
            console.log(`CabList: Using price: ${totalPrice} for ${cabId}`);
          }
          // Third priority: Check for basePrice property
          else if (fareDetails && typeof fareDetails.basePrice === 'number' && fareDetails.basePrice > 0) {
            totalPrice = fareDetails.basePrice;
            console.log(`CabList: Using basePrice: ${totalPrice} for ${cabId}`);
          }
          // Local package special case
          else if (tripType === 'local' && fareDetails) {
            if (hourlyPackage === '4hrs-40km' && typeof fareDetails.price4hrs40km === 'number' && fareDetails.price4hrs40km > 0) {
              totalPrice = fareDetails.price4hrs40km;
              console.log(`CabList: Using price4hrs40km: ${totalPrice} for ${cabId}`);
            } else if (hourlyPackage === '8hrs-80km' && typeof fareDetails.price8hrs80km === 'number' && fareDetails.price8hrs80km > 0) {
              totalPrice = fareDetails.price8hrs80km;
              console.log(`CabList: Using price8hrs80km: ${totalPrice} for ${cabId}`);
            } else if (hourlyPackage === '10hrs-100km' && typeof fareDetails.price10hrs100km === 'number' && fareDetails.price10hrs100km > 0) {
              totalPrice = fareDetails.price10hrs100km;
              console.log(`CabList: Using price10hrs100km: ${totalPrice} for ${cabId}`);
            }
          }
          
          if (totalPrice > 0) {
            faresMap[cabId] = totalPrice;
            console.log(`CabList: Set fare for ${cabId} to ${totalPrice} (from API)`);
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
                
                // Extract price from retry response with the same priority order
                let retryTotalPrice = 0;
                
                if (retryFareDetails && typeof retryFareDetails.totalPrice === 'number' && retryFareDetails.totalPrice > 0) {
                  retryTotalPrice = retryFareDetails.totalPrice;
                } else if (retryFareDetails && typeof retryFareDetails.price === 'number' && retryFareDetails.price > 0) {
                  retryTotalPrice = retryFareDetails.price;
                } else if (retryFareDetails && typeof retryFareDetails.basePrice === 'number' && retryFareDetails.basePrice > 0) {
                  retryTotalPrice = retryFareDetails.basePrice;
                } else if (tripType === 'local' && retryFareDetails) {
                  // Check for local package specific pricing in retry
                  if (hourlyPackage === '4hrs-40km' && typeof retryFareDetails.price4hrs40km === 'number' && retryFareDetails.price4hrs40km > 0) {
                    retryTotalPrice = retryFareDetails.price4hrs40km;
                  } else if (hourlyPackage === '8hrs-80km' && typeof retryFareDetails.price8hrs80km === 'number' && retryFareDetails.price8hrs80km > 0) {
                    retryTotalPrice = retryFareDetails.price8hrs80km;
                  } else if (hourlyPackage === '10hrs-100km' && typeof retryFareDetails.price10hrs100km === 'number' && retryFareDetails.price10hrs100km > 0) {
                    retryTotalPrice = retryFareDetails.price10hrs100km;
                  }
                }
                
                if (retryTotalPrice > 0) {
                  faresMap[cabId] = retryTotalPrice;
                  console.log(`CabList: Retry succeeded! Set fare for ${cabId} to ${retryTotalPrice}`);
                } else {
                  // Use fallback pricing if retry also fails
                  const fallbackPrice = getFallbackPriceFromDatabase(cab, tripType, hourlyPackage);
                  faresMap[cabId] = fallbackPrice;
                  console.log(`CabList: Retry failed, using fallback price for ${cabId}: ${fallbackPrice}`);
                }
              } catch (retryError) {
                console.error(`Error on retry for ${cabId}:`, retryError);
                const fallbackPrice = getFallbackPriceFromDatabase(cab, tripType, hourlyPackage);
                faresMap[cabId] = fallbackPrice;
                console.log(`CabList: Retry error, using fallback price for ${cabId}: ${fallbackPrice}`);
              }
            } else {
              // If we've already retried, use fallback pricing from the database
              const fallbackPrice = getFallbackPriceFromDatabase(cab, tripType, hourlyPackage);
              faresMap[cabId] = fallbackPrice;
              console.log(`CabList: Max retries reached, using database fallback price for ${cabId}: ${fallbackPrice}`);
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
          
          // Calculate a fallback price from the database
          const fallbackPrice = getFallbackPriceFromDatabase(cab, tripType, hourlyPackage);
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
  
  // Retrieve direct database fallback values for local packages
  const getFallbackPriceFromDatabase = (cab: CabType, tripType: string, hourlyPackage?: string): number => {
    // Use the database values from the screenshot for local package fares
    const databaseLocalFares: Record<string, Record<string, number>> = {
      'sedan': { '4hrs-40km': 1400, '8hrs-80km': 2400, '10hrs-100km': 3000 },
      'ertiga': { '4hrs-40km': 1500, '8hrs-80km': 3000, '10hrs-100km': 3500 },
      'innova_crysta': { '4hrs-40km': 1800, '8hrs-80km': 3500, '10hrs-100km': 4000 },
      'tempo': { '4hrs-40km': 3000, '8hrs-80km': 4500, '10hrs-100km': 5500 },
      'luxury': { '4hrs-40km': 3500, '8hrs-80km': 5500, '10hrs-100km': 6500 },
      'mpv': { '4hrs-40km': 2000, '8hrs-80km': 4000, '10hrs-100km': 4500 },
      'toyota': { '4hrs-40km': 1400, '8hrs-80km': 2400, '10hrs-100km': 3000 },
      'dzire_cng': { '4hrs-40km': 1400, '8hrs-80km': 2400, '10hrs-100km': 3000 },
      'tempo_traveller': { '4hrs-40km': 6500, '8hrs-80km': 6500, '10hrs-100km': 7500 },
      'amaze': { '4hrs-40km': 1400, '8hrs-80km': 2400, '10hrs-100km': 3000 },
      'bus': { '4hrs-40km': 3000, '8hrs-80km': 7000, '10hrs-100km': 9000 }
    };
    
    // For local trip type, use the database values
    if (tripType === 'local') {
      // Direct match by cab ID
      if (databaseLocalFares[cab.id] && databaseLocalFares[cab.id][hourlyPackage || '8hrs-80km']) {
        const price = databaseLocalFares[cab.id][hourlyPackage || '8hrs-80km'];
        console.log(`Using direct database match for ${cab.id} ${hourlyPackage}: ${price}`);
        return price;
      }
      
      // Try with normalized ID
      const normalizedId = cab.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (databaseLocalFares[normalizedId] && databaseLocalFares[normalizedId][hourlyPackage || '8hrs-80km']) {
        const price = databaseLocalFares[normalizedId][hourlyPackage || '8hrs-80km'];
        console.log(`Using normalized database match for ${normalizedId} ${hourlyPackage}: ${price}`);
        return price;
      }
      
      // Try to find closest match in database
      for (const key in databaseLocalFares) {
        if (cab.id.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cab.id.toLowerCase())) {
          const price = databaseLocalFares[key][hourlyPackage || '8hrs-80km'];
          console.log(`Using partial database match (${key}) for ${cab.id} ${hourlyPackage}: ${price}`);
          return price;
        }
      }
      
      // Default to sedan if no match found
      return databaseLocalFares['sedan'][hourlyPackage || '8hrs-80km'];
    }
    
    // For non-local trip types, use the calculated fallback
    return calculateFallbackPrice(cab, tripType, distance, hourlyPackage);
  };
  
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
      // Use database-backed fallback
      return getFallbackPriceFromDatabase(cab, tripType, hourlyPackage);
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
