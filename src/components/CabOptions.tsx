
import { useState, useEffect, useRef } from "react";
import { CabList } from "./cab-options/CabList";
import { CabLoading } from "./cab-options/CabLoading";
import { CabType } from "@/types/cab";
import { calculateFare, clearFareCache } from "@/lib/fareCalculationService";

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode: string;
  pickupDate?: Date;
  returnDate?: Date;
  hourlyPackage?: string;
}

export function CabOptions({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  pickupDate,
  returnDate,
  hourlyPackage
}: CabOptionsProps) {
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [loadingCabs, setLoadingCabs] = useState(true);
  const [calculationAttempts, setCalculationAttempts] = useState(0);
  
  // Add refs to prevent unnecessary recalculations
  const calculationInProgressRef = useRef(false);
  const lastCalculationRef = useRef<number>(0);
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fareParamsRef = useRef({
    distance,
    tripType,
    tripMode,
    hourlyPackage,
    pickupDate,
    returnDate
  });

  // Initial loading animation
  useEffect(() => {
    setLoadingCabs(true);
    
    const timer = setTimeout(() => {
      setLoadingCabs(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Update params ref when dependencies change
  useEffect(() => {
    fareParamsRef.current = {
      distance,
      tripType,
      tripMode,
      hourlyPackage,
      pickupDate, 
      returnDate
    };
  }, [distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  // Fare calculation with debouncing and throttling
  useEffect(() => {
    // Skip if no distance or no cabs
    if (distance <= 0 || cabTypes.length === 0) {
      setIsCalculatingFares(false);
      return;
    }

    // Clear any pending timeout
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    // Debounce the calculation by 500ms
    calculationTimeoutRef.current = setTimeout(() => {
      // Don't recalculate if another calculation is in progress
      if (calculationInProgressRef.current) {
        console.log("Skipping fare calculation - another calculation in progress");
        return;
      }

      // Throttle calculations - don't recalculate more frequently than every 3 seconds
      const now = Date.now();
      if (now - lastCalculationRef.current < 3000 && calculationAttempts > 0) {
        console.log(`Throttling fare calculation - last calculation was ${now - lastCalculationRef.current}ms ago`);
        return;
      }

      // Check for cached fares in localStorage
      let hasCachedFares = false;
      const cachedFares: Record<string, number> = {};
      
      if (tripType === 'local' && hourlyPackage) {
        cabTypes.forEach(cab => {
          const localStorageKey = `local_fare_${cab.id}_${hourlyPackage}`;
          const storedPrice = localStorage.getItem(localStorageKey);
          if (storedPrice) {
            const price = parseInt(storedPrice, 10);
            if (price > 0) {
              cachedFares[cab.id] = price;
              hasCachedFares = true;
            }
          }
        });
      } else if (tripType === 'outstation') {
        cabTypes.forEach(cab => {
          const outstationKey = `outstation_${cab.id}_${distance}_${tripMode}`;
          const storedFare = localStorage.getItem(outstationKey);
          if (storedFare) {
            const price = parseInt(storedFare, 10);
            if (price > 0) {
              cachedFares[cab.id] = price;
              hasCachedFares = true;
            }
          }
        });
      }
      
      // If we have cached fares, use them first and then calculate in background
      if (hasCachedFares && Object.keys(cachedFares).length > 0) {
        console.log('Using cached fares from localStorage:', cachedFares);
        setCabFares(prev => ({...prev, ...cachedFares}));
      }

      const calculateFares = async () => {
        setIsCalculatingFares(true);
        calculationInProgressRef.current = true;
        lastCalculationRef.current = Date.now();
        
        try {
          // Calculate fares for each cab type in sequence to prevent API overload
          const results: Record<string, number> = {};
          
          for (const cab of cabTypes) {
            try {
              const fare = await calculateFare({
                cabType: cab,
                distance,
                tripType,
                tripMode,
                hourlyPackage,
                pickupDate,
                returnDate,
                forceRefresh: calculationAttempts > 0
              });
              
              if (fare > 0) {
                results[cab.id] = fare;
                
                // Also cache in localStorage
                if (tripType === 'local' && hourlyPackage) {
                  localStorage.setItem(`local_fare_${cab.id}_${hourlyPackage}`, fare.toString());
                } else if (tripType === 'outstation') {
                  const outstationKey = `outstation_${cab.id}_${distance}_${tripMode}`;
                  localStorage.setItem(outstationKey, fare.toString());
                }
              }
              
              // Update fares incrementally as they're calculated
              if (fare > 0) {
                setCabFares(prev => ({...prev, [cab.id]: fare}));
              }
              
              // Small delay between calculations to prevent API overload
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.error(`Error calculating fare for ${cab.name}:`, error);
            }
          }
        } catch (error) {
          console.error("Error calculating fares:", error);
        } finally {
          setIsCalculatingFares(false);
          calculationInProgressRef.current = false;
          setCalculationAttempts(prev => prev + 1);
        }
      };

      calculateFares();
    }, 500);

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [cabTypes, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, calculationAttempts]);

  const handleSelectCab = (cab: CabType) => {
    if (cab.id === selectedCab?.id) return; // Prevent unnecessary re-renders
    
    // Get the most accurate fare when selecting
    let fareToUse = cabFares[cab.id];
    
    // Check localStorage for cached fare
    if (tripType === 'local' && hourlyPackage) {
      const localStorageKey = `local_fare_${cab.id}_${hourlyPackage}`;
      const storedPrice = localStorage.getItem(localStorageKey);
      if (storedPrice) {
        const price = parseInt(storedPrice, 10);
        if (price > 0) {
          fareToUse = price;
        }
      }
    } else if (tripType === 'outstation') {
      const outstationKey = `outstation_${cab.id}_${distance}_${tripMode}`;
      const storedFare = localStorage.getItem(outstationKey);
      if (storedFare) {
        const price = parseInt(storedFare, 10);
        if (price > 0) {
          fareToUse = price;
        }
      }
    }
    
    // If we have a fare, update it in localStorage with the cab selection
    if (fareToUse > 0) {
      localStorage.setItem('lastSelectedFare', fareToUse.toString());
      localStorage.setItem('lastSelectedCabId', cab.id);
    }
    
    onSelectCab(cab);
  };

  const getFareDetails = (cab: CabType): string => {
    // Return fare details based on trip type
    if (tripType === "local") {
      return `${hourlyPackage || "8hrs-80km"} package`;
    } else if (tripType === "outstation") {
      return `${tripMode === "round-trip" ? "Round trip" : "One way"} - ${distance} km`;
    } else if (tripType === "airport") {
      return "Airport transfer";
    }
    return "";
  };

  if (loadingCabs) {
    return <CabLoading />;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Available Cabs</h3>
      <CabList
        cabTypes={cabTypes}
        selectedCabId={selectedCab?.id || null}
        cabFares={cabFares}
        isCalculatingFares={isCalculatingFares}
        handleSelectCab={handleSelectCab}
        getFareDetails={getFareDetails}
        tripType={tripType}
      />
    </div>
  );
}
