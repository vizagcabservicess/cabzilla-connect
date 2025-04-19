
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
          
          // Prepare the fare params based on trip type
          const fareParams = {
            vehicleId: cabId,
            tripType: tripType as FareType,
            distance,
            tripMode,
            packageId: hourlyPackage
          };
          
          // Force refresh for first attempt
          console.log(`CabList: Making API request for ${cabId} with params:`, fareParams);
          const fareDetails = await fetchFare(fareParams);
          
          console.log(`CabList: Received fare details for ${cabId}:`, fareDetails);
          
          let totalPrice = 0;
          
          // Extract the correct price based on trip type
          if (tripType === 'local') {
            // For local, check the specific package price
            if (hourlyPackage === '4hrs-40km' && fareDetails && fareDetails.price4hrs40km > 0) {
              totalPrice = fareDetails.price4hrs40km;
            } else if (hourlyPackage === '8hrs-80km' && fareDetails && fareDetails.price8hrs80km > 0) {
              totalPrice = fareDetails.price8hrs80km;
            } else if (hourlyPackage === '10hrs-100km' && fareDetails && fareDetails.price10hrs100km > 0) {
              totalPrice = fareDetails.price10hrs100km;
            } else if (fareDetails && fareDetails.totalPrice > 0) {
              totalPrice = fareDetails.totalPrice;
            } else if (fareDetails && fareDetails.price > 0) {
              totalPrice = fareDetails.price;
            } else if (fareDetails && fareDetails.basePrice > 0) {
              totalPrice = fareDetails.basePrice;
            }
          } else {
            // For outstation and airport
            if (fareDetails && fareDetails.totalPrice > 0) {
              totalPrice = fareDetails.totalPrice;
            } else if (fareDetails && fareDetails.price > 0) {
              totalPrice = fareDetails.price;
            } else if (fareDetails && fareDetails.basePrice > 0) {
              totalPrice = fareDetails.basePrice;
            }
          }
          
          if (totalPrice > 0) {
            console.log(`CabList: Setting fare for ${cabId} to ${totalPrice}`);
            faresMap[cabId] = totalPrice;
            setFares(prev => ({...prev, [cabId]: totalPrice}));
          } else {
            console.warn(`CabList: No valid price found for ${cabId}, using database fallback`);
            
            // No valid price, use accurate database fallback based on vehicle type and trip type
            const fallbackPrice = getDatabaseFallbackPrice(cab, tripType as string, hourlyPackage);
            console.log(`CabList: Using fallback price for ${cabId}: ${fallbackPrice}`);
            
            faresMap[cabId] = fallbackPrice;
            setFares(prev => ({...prev, [cabId]: fallbackPrice}));
          }
          
          // Update loading state
          loadingMap[cabId] = false;
          setLoadingFares({...loadingMap});
          
        } catch (error) {
          console.error(`Error fetching fare for ${cab.id}:`, error);
          
          // Update loading state
          loadingMap[cab.id] = false;
          setLoadingFares({...loadingMap});
          
          // Use fallback price on error
          const fallbackPrice = getDatabaseFallbackPrice(cab, tripType as string, hourlyPackage);
          console.log(`CabList: Error occurred, using fallback price for ${cab.id}: ${fallbackPrice}`);
          
          faresMap[cab.id] = fallbackPrice;
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
  
  // Get an accurate fallback price from the actual database values
  const getDatabaseFallbackPrice = (cab: CabType, tripType: string, hourlyPackage?: string): number => {
    // Normalize vehicle ID for matching
    const normalizedId = cab.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // Use the database values from the actual database for local package fares
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
    
    // Additional mappings for special cases
    const vehicleMappings: Record<string, string> = {
      'mpv': 'MPV',
      'toyota': 'Toyota',
      'dzire_cng': 'Dzire CNG',
      'innova_hycross': 'MPV',
      'innova_crysta': 'innova_crysta',
      'etios': 'Toyota'
    };
    
    // For local trip type, use the database values
    if (tripType === 'local') {
      const package_id = hourlyPackage || '8hrs-80km';
      
      // Direct match by cab ID
      if (databaseLocalFares[cab.id] && databaseLocalFares[cab.id][package_id]) {
        return databaseLocalFares[cab.id][package_id];
      }
      
      // Try mapped ID
      const mappedId = vehicleMappings[cab.id.toLowerCase()] || vehicleMappings[normalizedId];
      if (mappedId && databaseLocalFares[mappedId.toLowerCase()] && databaseLocalFares[mappedId.toLowerCase()][package_id]) {
        return databaseLocalFares[mappedId.toLowerCase()][package_id];
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
    
    // For outstation and airport, calculate based on distance
    const calculateOutstationFare = (baseRate: number): number => {
      const minDistance = 150;
      const basePrice = baseRate * minDistance;
      const driverAllowance = 250;
      
      if (distance <= minDistance) {
        return basePrice + driverAllowance;
      }
      
      const extraDistance = distance - minDistance;
      return basePrice + (extraDistance * baseRate) + driverAllowance;
    };
    
    const calculateAirportFare = (basePrice: number, airportFee: number): number => {
      let tier;
      if (distance <= 10) {
        tier = basePrice;
      } else if (distance <= 20) {
        tier = basePrice * 1.5;
      } else if (distance <= 30) {
        tier = basePrice * 2;
      } else {
        tier = basePrice * 2.5 + ((distance - 30) * 15);
      }
      return tier + airportFee;
    };
    
    if (tripType === 'outstation') {
      const rates: Record<string, number> = {
        'sedan': 14,
        'ertiga': 18,
        'innova_crysta': 20,
        'MPV': 20,
        'Toyota': 14,
        'Dzire CNG': 14,
        'tempo_traveller': 35,
        'bus': 40,
        'amaze': 14
      };
      
      // Find the rate for this vehicle
      let rate = 14; // Default
      
      // Try direct match
      if (rates[cab.id]) {
        rate = rates[cab.id];
      } else if (rates[normalizedId]) {
        rate = rates[normalizedId];
      } else if (vehicleMappings[cab.id.toLowerCase()] && rates[vehicleMappings[cab.id.toLowerCase()]]) {
        rate = rates[vehicleMappings[cab.id.toLowerCase()]];
      } else {
        // Try to find partial match
        for (const key in rates) {
          if (cab.id.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cab.id.toLowerCase())) {
            rate = rates[key];
            break;
          }
        }
      }
      
      return calculateOutstationFare(rate);
    } else if (tripType === 'airport') {
      const basePrices: Record<string, [number, number]> = {
        'sedan': [800, 200],
        'ertiga': [1000, 300],
        'innova_crysta': [1200, 400],
        'MPV': [1200, 400],
        'Toyota': [800, 200],
        'Dzire CNG': [800, 200],
        'tempo_traveller': [2000, 500],
        'bus': [3000, 800],
        'amaze': [800, 200]
      };
      
      // Find the base price for this vehicle
      let basePriceInfo: [number, number] = [800, 200]; // Default
      
      // Try direct match
      if (basePrices[cab.id]) {
        basePriceInfo = basePrices[cab.id];
      } else if (basePrices[normalizedId]) {
        basePriceInfo = basePrices[normalizedId];
      } else if (vehicleMappings[cab.id.toLowerCase()] && basePrices[vehicleMappings[cab.id.toLowerCase()]]) {
        basePriceInfo = basePrices[vehicleMappings[cab.id.toLowerCase()]];
      } else {
        // Try to find partial match
        for (const key in basePrices) {
          if (cab.id.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cab.id.toLowerCase())) {
            basePriceInfo = basePrices[key];
            break;
          }
        }
      }
      
      return calculateAirportFare(basePriceInfo[0], basePriceInfo[1]);
    }
    
    // Fallback default price if none of the above matched
    return 2000;
  };
  
  return (
    <div className="space-y-2">
      {cabTypes.map(cab => (
        <CabOptionCard
          key={cab.id}
          cab={cab}
          fare={fares[cab.id] || 0}
          isSelected={cab.id === selectedCabId}
          onSelect={handleSelectCab}
          fareDetails={getFareDetails(cab)}
          isCalculating={loadingFares[cab.id] || false}
        />
      ))}
    </div>
  );
}
