
import { useState, useEffect } from "react";
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

  useEffect(() => {
    setLoadingCabs(true);
    
    const timer = setTimeout(() => {
      setLoadingCabs(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const calculateFares = async () => {
      if (distance <= 0 || cabTypes.length === 0) {
        setIsCalculatingFares(false);
        return;
      }

      setIsCalculatingFares(true);
      
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
        setCalculationAttempts(prev => prev + 1);
      }
    };

    calculateFares();
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
