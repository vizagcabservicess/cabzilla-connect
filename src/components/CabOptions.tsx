
import { useState, useEffect, useRef, useCallback } from "react";
import { CabList } from "./cab-options/CabList";
import { CabLoading } from "./cab-options/CabLoading";
import { CabType } from "@/types/cab";
import { useFare, FareType, TripDirectionType } from "@/hooks/useFare";

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
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [loadingCabs, setLoadingCabs] = useState(true);
  
  // Initialize the fare hook
  const { fetchFare, fetchFares, clearCacheForTripType } = useFare();
  
  // Add refs to prevent unnecessary recalculations
  const lastCalculationRef = useRef<number>(0);
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initial loading animation
  useEffect(() => {
    setLoadingCabs(true);
    
    const timer = setTimeout(() => {
      setLoadingCabs(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Clear fare cache when trip type or mode changes
  useEffect(() => {
    clearCacheForTripType(tripType as FareType);
  }, [tripType, clearCacheForTripType]);
  
  // Fetch fares for all cabs when component mounts or parameters change
  useEffect(() => {
    // Skip if no distance or no cabs
    if (distance <= 0 || cabTypes.length === 0) {
      return;
    }
    
    // Clear any pending timeout
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }
    
    // Debounce the calculation by 500ms
    calculationTimeoutRef.current = setTimeout(async () => {
      // Throttle calculations - don't recalculate more frequently than every 3 seconds
      const now = Date.now();
      if (now - lastCalculationRef.current < 3000) {
        console.log(`Throttling fare calculation - last calculation was ${now - lastCalculationRef.current}ms ago`);
        return;
      }
      
      lastCalculationRef.current = now;
      
      try {
        const fareRequests = cabTypes.map(cab => ({
          vehicleId: cab.id,
          tripType: tripType as FareType,
          distance,
          tripMode: tripMode as TripDirectionType,
          packageId: hourlyPackage,
          pickupDate,
          returnDate
        }));
        
        const results = await fetchFares(fareRequests);
        
        // Build fare map
        const fares: Record<string, number> = {};
        Object.entries(results).forEach(([cabId, fareDetails]) => {
          if (fareDetails && fareDetails.totalPrice > 0) {
            fares[cabId] = fareDetails.totalPrice;
          }
        });
        
        if (Object.keys(fares).length > 0) {
          setCabFares(fares);
          console.log("CabList: Initial fare setup", fares);
        }
      } catch (error) {
        console.error("Error fetching initial fares:", error);
      }
    }, 500);
    
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [cabTypes, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, fetchFares]);
  
  const handleSelectCab = useCallback((cab: CabType) => {
    if (cab.id === selectedCab?.id) return; // Prevent unnecessary re-renders
    
    // Get the most accurate fare
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
  }, [selectedCab, cabFares, tripType, tripMode, distance, hourlyPackage, onSelectCab]);
  
  const getFareDetails = (cab: CabType): string => {
    // Return fare details based on trip type
    if (tripType === "local") {
      return `${hourlyPackage || "8hrs-80km"} package`;
    } else if (tripType === "outstation") {
      return `${tripMode === "round-trip" ? "Round trip" : "One way"} - ${distance} km`;
    } else if (tripType === "airport") {
      return "Airport transfer";
    } else if (tripType === "tour") {
      return "Tour package";
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
        handleSelectCab={handleSelectCab}
        getFareDetails={getFareDetails}
        tripType={tripType}
        tripMode={tripMode as TripDirectionType}
        distance={distance}
        hourlyPackage={hourlyPackage}
      />
    </div>
  );
}
