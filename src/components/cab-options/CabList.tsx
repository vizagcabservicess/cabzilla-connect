
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
  const [loadingSources, setLoadingSources] = useState<Record<string, string>>({});
  const { fetchFare, isLoading } = useFare();
  
  useEffect(() => {
    const loadFares = async () => {
      if (!cabTypes || cabTypes.length === 0) {
        console.log('CabList: Not loading fares - cabTypes empty');
        return;
      }
      
      console.log(`CabList: Loading fares for ${cabTypes.length} vehicles with type ${tripType}`);
      
      const faresMap: Record<string, number> = {};
      const loadingMap: Record<string, boolean> = {};
      const sourcesMap: Record<string, string> = {};
      
      // Initialize loading state for all cabs
      cabTypes.forEach(cab => {
        loadingMap[cab.id] = true;
        sourcesMap[cab.id] = 'pending';
      });
      
      setLoadingFares(loadingMap);
      setLoadingSources(sourcesMap);
      
      // Clear localStorage cache to force fresh data
      localStorage.removeItem('fare_cache_timestamp');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`fare_${tripType}_`)) {
          localStorage.removeItem(key);
        }
      });
      
      // Load fares for each cab type with a small delay to prevent overwhelming the server
      for (const [index, cab] of cabTypes.entries()) {
        try {
          const cabId = cab.id;
          console.log(`CabList: Fetching fare for vehicle ${cabId} with trip type ${tripType}`);
          
          // Add a small delay between requests
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Prepare the fare params based on trip type
          const fareParams = {
            vehicleId: cabId,
            tripType: tripType as FareType,
            distance,
            tripMode,
            packageId: hourlyPackage,
            forceRefresh: true  // Force refresh to ensure we get the latest data
          };
          
          // Request fare data
          console.log(`CabList: Making API request for ${cabId} with params:`, fareParams);
          const fareDetails = await fetchFare(fareParams);
          
          console.log(`CabList: Received fare details for ${cabId}:`, fareDetails);
          
          let totalPrice = 0;
          let dataSource = 'unknown';
          
          // Extract the correct price based on trip type
          if (tripType === 'local') {
            // For local, check the specific package price
            if (hourlyPackage === '4hrs-40km' && fareDetails && fareDetails.price4hrs40km > 0) {
              totalPrice = fareDetails.price4hrs40km;
              dataSource = 'api-package-4hrs';
            } else if (hourlyPackage === '8hrs-80km' && fareDetails && fareDetails.price8hrs80km > 0) {
              totalPrice = fareDetails.price8hrs80km;
              dataSource = 'api-package-8hrs';
            } else if (hourlyPackage === '10hrs-100km' && fareDetails && fareDetails.price10hrs100km > 0) {
              totalPrice = fareDetails.price10hrs100km;
              dataSource = 'api-package-10hrs';
            } else if (fareDetails && fareDetails.totalPrice > 0) {
              totalPrice = fareDetails.totalPrice;
              dataSource = 'api-total-price';
            } else if (fareDetails && fareDetails.price > 0) {
              totalPrice = fareDetails.price;
              dataSource = 'api-price';
            } else if (fareDetails && fareDetails.basePrice > 0) {
              totalPrice = fareDetails.basePrice;
              dataSource = 'api-base-price';
            }
          } else {
            // For outstation and airport
            if (fareDetails && fareDetails.totalPrice > 0) {
              totalPrice = fareDetails.totalPrice;
              dataSource = 'api-total-price';
            } else if (fareDetails && fareDetails.price > 0) {
              totalPrice = fareDetails.price;
              dataSource = 'api-price';
            } else if (fareDetails && fareDetails.basePrice > 0) {
              totalPrice = fareDetails.basePrice;
              dataSource = 'api-base-price';
            }
          }
          
          // Check if the price is valid
          if (totalPrice > 0) {
            console.log(`CabList: Setting fare for ${cabId} to ${totalPrice} (source: ${dataSource})`);
            faresMap[cabId] = totalPrice;
            sourcesMap[cabId] = dataSource;
          } else {
            console.warn(`CabList: No valid price found for ${cabId}, attempting to extract from response`);
            
            // Try to extract price from the raw response
            let extractedPrice = 0;
            
            if (fareDetails && typeof fareDetails === 'object') {
              if (fareDetails.fares && Array.isArray(fareDetails.fares) && fareDetails.fares.length > 0) {
                const matchingFare = fareDetails.fares.find((f: any) => 
                  (f.vehicleId === cabId || f.vehicle_id === cabId));
                
                const fare = matchingFare || fareDetails.fares[0];
                
                if (hourlyPackage === '4hrs-40km' && fare.price4hrs40km) {
                  extractedPrice = parseFloat(fare.price4hrs40km);
                  dataSource = 'direct-fares-array-4hrs';
                } else if (hourlyPackage === '8hrs-80km' && fare.price8hrs80km) {
                  extractedPrice = parseFloat(fare.price8hrs80km);
                  dataSource = 'direct-fares-array-8hrs';
                } else if (hourlyPackage === '10hrs-100km' && fare.price10hrs100km) {
                  extractedPrice = parseFloat(fare.price10hrs100km);
                  dataSource = 'direct-fares-array-10hrs';
                }
              }
            }
            
            if (extractedPrice > 0) {
              console.log(`CabList: Extracted price ${extractedPrice} for ${cabId} from response`);
              faresMap[cabId] = extractedPrice;
              sourcesMap[cabId] = dataSource;
            } else {
              console.warn(`CabList: Still no valid price for ${cabId}, using database fallback`);
              
              // No valid price, use database fallback
              const fallbackPrice = getDatabaseFallbackPrice(cab, tripType as string, hourlyPackage);
              console.log(`CabList: Using fallback price for ${cabId}: ${fallbackPrice}`);
              
              faresMap[cabId] = fallbackPrice;
              sourcesMap[cabId] = 'database-fallback';
            }
          }
          
          // Store calculated price in localStorage for fallback
          if (faresMap[cabId] > 0) {
            const storageKey = `fare_${tripType}_${cabId}_${hourlyPackage || 'default'}`;
            localStorage.setItem(storageKey, faresMap[cabId].toString());
            localStorage.setItem(`${storageKey}_source`, sourcesMap[cabId]);
          }
          
          // Update fares and sources
          setFares(prev => ({ ...prev, [cabId]: faresMap[cabId] }));
          setLoadingSources(prev => ({ ...prev, [cabId]: sourcesMap[cabId] }));
          
          // Update loading state
          loadingMap[cabId] = false;
          setLoadingFares(prev => ({ ...prev, [cabId]: false }));
          
        } catch (error) {
          console.error(`Error fetching fare for ${cab.id}:`, error);
          
          // Update loading state
          setLoadingFares(prev => ({ ...prev, [cab.id]: false }));
          
          // Try to get previously cached price from localStorage
          const storageKey = `fare_${tripType}_${cab.id}_${hourlyPackage || 'default'}`;
          const cachedPrice = localStorage.getItem(storageKey);
          const cachedSource = localStorage.getItem(`${storageKey}_source`) || 'cache';
          
          if (cachedPrice && Number(cachedPrice) > 0) {
            console.log(`CabList: Using cached price for ${cab.id}: ${cachedPrice}`);
            setFares(prev => ({ ...prev, [cab.id]: Number(cachedPrice) }));
            setLoadingSources(prev => ({ ...prev, [cab.id]: `cached-${cachedSource}` }));
          } else {
            // Use fallback price on error
            const fallbackPrice = getDatabaseFallbackPrice(cab, tripType as string, hourlyPackage);
            console.log(`CabList: Error occurred, using fallback price for ${cab.id}: ${fallbackPrice}`);
            
            setFares(prev => ({ ...prev, [cab.id]: fallbackPrice }));
            setLoadingSources(prev => ({ ...prev, [cab.id]: 'error-fallback' }));
            
            // Store in localStorage
            localStorage.setItem(storageKey, fallbackPrice.toString());
            localStorage.setItem(`${storageKey}_source`, 'error-fallback');
          }
        }
      }
    };
    
    loadFares();
    
    // Clear all fare state when trip parameters change
    return () => {
      console.log('CabList: Clearing fare state due to parameter change');
      setFares({});
    };
  }, [cabTypes, tripType, tripMode, distance, hourlyPackage, fetchFare]);
  
  // Get an accurate fallback price from the actual database values
  const getDatabaseFallbackPrice = (cab: CabType, tripType: string, hourlyPackage?: string): number => {
    // Normalize vehicle ID for matching
    const normalizedId = cab.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // Use the exact values from the database screenshots for local package fares
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
      const package_id = hourlyPackage || '8hrs-80km';
      
      // Direct match by cab ID
      if (databaseLocalFares[cab.id] && databaseLocalFares[cab.id][package_id]) {
        return databaseLocalFares[cab.id][package_id];
      }
      
      // Try with normalized ID
      if (databaseLocalFares[normalizedId] && databaseLocalFares[normalizedId][package_id]) {
        return databaseLocalFares[normalizedId][package_id];
      }
      
      // Try to find closest match in database
      for (const key in databaseLocalFares) {
        if (cab.id.toLowerCase().includes(key) || key.includes(cab.id.toLowerCase())) {
          return databaseLocalFares[key][package_id];
        }
      }
      
      // Default to sedan if no match found
      return databaseLocalFares['sedan'][package_id];
    }
    
    // For outstation and airport, we'll need to implement appropriate fallbacks
    return 0;
  };
  
  // Render the list of cabs with their fares
  return (
    <div className="space-y-4">
      {cabTypes.map((cab) => (
        <CabOptionCard
          key={cab.id}
          cab={cab}
          isSelected={selectedCabId === cab.id}
          onSelect={() => handleSelectCab(cab)}
          priceDisplay={
            loadingFares[cab.id] 
              ? "Loading..." 
              : fares[cab.id] 
                ? formatPrice(fares[cab.id]) 
                : "Price unavailable"
          }
          fareDetails={getFareDetails(cab)}
        />
      ))}
    </div>
  );
}
