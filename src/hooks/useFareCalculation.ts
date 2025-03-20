
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
    if (distance <= 0 || !Array.isArray(cabTypes) || cabTypes.length === 0 || isCalculatingFares) {
      console.log(`Skipping fare calculation: distance=${distance}, cabTypes=${cabTypes?.length}, isCalculating=${isCalculatingFares}`);
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
        
        try {
          const fares = await fareService.calculateFaresForCabs(
            validCabs,
            distance,
            tripType,
            tripMode,
            hourlyPackage,
            pickupDate,
            returnDate
          );
          
          console.log('All fares calculated:', fares);
          setCabFares(fares);
        } catch (fareError) {
          console.error('Error in fare calculation service:', fareError);
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
              manualFares[cab.id] = 0;
            }
          }
          
          setCabFares(manualFares);
        }
      } catch (error) {
        console.error('Error in fare calculation loop:', error);
        toast.error('Error calculating fares. Please try refreshing.');
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
