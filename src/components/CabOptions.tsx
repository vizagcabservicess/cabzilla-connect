
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

    // Debounce the calculation by 300ms
    calculationTimeoutRef.current = setTimeout(() => {
      // Don't recalculate if another calculation is in progress
      if (calculationInProgressRef.current) {
        console.log("Skipping fare calculation - another calculation in progress");
        return;
      }

      // Throttle calculations - don't recalculate more frequently than every 2 seconds
      const now = Date.now();
      if (now - lastCalculationRef.current < 2000 && calculationAttempts > 0) {
        console.log(`Throttling fare calculation - last calculation was ${now - lastCalculationRef.current}ms ago`);
        return;
      }

      const calculateFares = async () => {
        setIsCalculatingFares(true);
        calculationInProgressRef.current = true;
        lastCalculationRef.current = Date.now();
        
        try {
          // Clear the fare cache if we're recalculating
          if (calculationAttempts > 0) {
            clearFareCache();
          }
          
          // Calculate fares for each cab type
          const farePromises = cabTypes.map(async (cab) => {
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
              
              return { cabId: cab.id, fare };
            } catch (error) {
              console.error(`Error calculating fare for ${cab.name}:`, error);
              return { cabId: cab.id, fare: 0 };
            }
          });

          const results = await Promise.all(farePromises);
          const newFares: Record<string, number> = {};
          
          results.forEach(({cabId, fare}) => {
            if (fare > 0) {
              newFares[cabId] = fare;
            }
          });
          
          setCabFares(newFares);
        } catch (error) {
          console.error("Error calculating fares:", error);
        } finally {
          setIsCalculatingFares(false);
          calculationInProgressRef.current = false;
          setCalculationAttempts(prev => prev + 1);
        }
      };

      calculateFares();
    }, 300);

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [cabTypes, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, calculationAttempts]);

  const handleSelectCab = (cab: CabType) => {
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
