
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { fareService } from '@/services/fareService';
import { calculateFare } from '@/lib/fareCalculationService';
import { toast } from 'sonner';

export function useFareCalculation(
  cabTypes: CabType[],
  distance: number,
  tripType: TripType = 'outstation',
  tripMode: TripMode = 'one-way',
  hourlyPackage?: string,
  pickupDate?: Date,
  returnDate?: Date
) {
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);
  const [lastCalculationParams, setLastCalculationParams] = useState<string>('');

  const currentCalculationParams = useMemo(() => {
    return `${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.getTime() || 0}-${returnDate?.getTime() || 0}`;
  }, [tripType, tripMode, hourlyPackage, distance, pickupDate, returnDate]);

  // Calculate fares when parameters change
  useEffect(() => {
    // Skip empty or invalid calculations
    if (!Array.isArray(cabTypes) || cabTypes.length === 0) {
      console.log(`Skipping fare calculation: cabTypes=${cabTypes?.length}`);
      return;
    }
    
    // Skip if we're already calculating
    if (isCalculatingFares) {
      console.log(`Skipping fare calculation: already calculating`);
      return;
    }
    
    console.log(`Calculating fares for ${tripType} trip, ${distance}km, package: ${hourlyPackage || 'none'}`);
    
    const calculateFares = async () => {
      setIsCalculatingFares(true);
      
      try {
        if (distance > 500) {
          toast.info('Calculating fares for long distance...', {
            duration: 3000
          });
        }
        
        console.log(`Starting fare calculation for ${cabTypes.length} cab types`);
        
        const validCabs = cabTypes.filter(cab => {
          if (!cab || typeof cab !== 'object' || !cab.id) {
            console.warn('Skipping invalid cab object:', cab);
            return false;
          }
          
          if (typeof cab.price !== 'number') cab.price = 0;
          if (typeof cab.pricePerKm !== 'number') cab.pricePerKm = 0;
          if (typeof cab.nightHaltCharge !== 'number') cab.nightHaltCharge = 0;
          if (typeof cab.driverAllowance !== 'number') cab.driverAllowance = 0;
          
          return true;
        });
        
        console.log(`Proceeding with ${validCabs.length} valid cabs for fare calculation`);
        
        if (validCabs.length === 0) {
          console.error('No valid cab types to calculate fares for');
          toast.error('No valid vehicle types available. Try refreshing.');
          return;
        }
        
        // Handle the case when distance is 0 - calculate dummy fares for display
        if (distance <= 0) {
          const manualFares: Record<string, number> = {};
          for (const cab of validCabs) {
            if (tripType === 'local' && hourlyPackage) {
              // Use package price if hourly package
              if (hourlyPackage === '8hr_80km') {
                manualFares[cab.id] = cab.hr8km80Price || cab.basePrice || 1000;
              } else if (hourlyPackage === '10hr_100km') {
                manualFares[cab.id] = cab.hr10km100Price || cab.basePrice || 1200;
              } else {
                manualFares[cab.id] = cab.basePrice || 1000;
              }
            } else {
              // Use base price for other trip types
              manualFares[cab.id] = cab.basePrice || 1000;
            }
          }
          setCabFares(manualFares);
          console.log("Using base prices for fares:", manualFares);
          return;
        }
        
        try {
          // Try using the fare service
          const fares = await fareService.calculateFaresForCabs(
            validCabs,
            distance,
            tripType,
            tripMode,
            hourlyPackage,
            pickupDate,
            returnDate
          );
          
          console.log('All fares calculated via service:', fares);
          setCabFares(fares);
        } catch (fareError) {
          console.error('Error in fare calculation service, falling back to manual calculation:', fareError);
          
          // Fall back to manual calculation
          const manualFares: Record<string, number> = {};
          
          for (const cab of validCabs) {
            try {
              const fare = await calculateFare({
                cabType: cab,
                distance,
                tripType,
                tripMode,
                hourlyPackage,
                pickupDate,
                returnDate
              });
              manualFares[cab.id] = fare;
            } catch (err) {
              console.error(`Error calculating fare for ${cab.name}:`, err);
              
              // Fallback calculation
              if (tripType === 'local' && hourlyPackage) {
                if (hourlyPackage === '8hr_80km') {
                  manualFares[cab.id] = cab.hr8km80Price || cab.basePrice || 1000;
                } else if (hourlyPackage === '10hr_100km') {
                  manualFares[cab.id] = cab.hr10km100Price || cab.basePrice || 1200;
                }
              } else if (tripType === 'airport') {
                manualFares[cab.id] = cab.basePrice + (cab.pricePerKm * distance);
              } else {
                // Outstation
                const baseFare = cab.basePrice + (cab.pricePerKm * distance);
                if (tripMode === 'round-trip' && pickupDate && returnDate) {
                  const days = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 3600 * 24));
                  manualFares[cab.id] = baseFare + (days * cab.driverAllowance) + (Math.max(0, days-1) * cab.nightHaltCharge);
                } else {
                  manualFares[cab.id] = baseFare + cab.driverAllowance;
                }
              }
            }
          }
          
          console.log('Manually calculated fares:', manualFares);
          setCabFares(manualFares);
        }
      } catch (error) {
        console.error('Error in fare calculation loop:', error);
        toast.error('Error calculating fares. Please try refreshing.');
        
        // Set default fares as last resort
        const defaultFares: Record<string, number> = {};
        cabTypes.forEach(cab => {
          defaultFares[cab.id] = cab.basePrice || 1000;  
        });
        setCabFares(defaultFares);
      } finally {
        setIsCalculatingFares(false);
      }
    };
    
    calculateFares();
  }, [cabTypes, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  // Monitor changes in calculation parameters
  useEffect(() => {
    if (lastCalculationParams && lastCalculationParams !== currentCalculationParams) {
      console.log('Trip parameters changed, resetting fares');
      setCabFares({});
    }
    
    setLastCalculationParams(currentCalculationParams);
  }, [currentCalculationParams, lastCalculationParams]);

  // Get fare explanation
  const getFareDetails = useCallback((): string => {
    return fareService.getFareExplanation(
      distance,
      tripType,
      tripMode,
      hourlyPackage,
      pickupDate,
      returnDate
    );
  }, [distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  return {
    cabFares,
    isCalculatingFares,
    getFareDetails,
    currentCalculationParams
  };
}
