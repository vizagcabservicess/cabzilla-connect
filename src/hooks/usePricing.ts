
import { useState, useEffect, useCallback } from 'react';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { normalizePackageId, normalizeVehicleId } from '../lib/packageUtils';
import { calculateFare } from '@/lib/fareCalculationService';

interface UsePricingProps {
  selectedCab: CabType | null;
  distance: number;
  tripType: TripType;
  tripMode: TripMode;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

interface PricingState {
  totalPrice: number;
  isCalculating: boolean;
  lastUpdate: number;
  error: string | null;
}

/**
 * Hook for handling pricing calculations consistently across components
 */
export const usePricing = ({
  selectedCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate
}: UsePricingProps) => {
  const [pricingState, setPricingState] = useState<PricingState>({
    totalPrice: 0,
    isCalculating: false,
    lastUpdate: Date.now(),
    error: null
  });

  const normalizedHourlyPackage = hourlyPackage ? normalizePackageId(hourlyPackage) : undefined;

  // Calculate price based on the current parameters
  const calculatePrice = useCallback(async (forceRefresh = false) => {
    if (!selectedCab) {
      setPricingState(prev => ({
        ...prev, 
        totalPrice: 0,
        isCalculating: false,
        error: "No cab selected"
      }));
      return 0;
    }

    try {
      setPricingState(prev => ({ ...prev, isCalculating: true, error: null }));
      console.log(`usePricing: Calculating price for ${selectedCab.name}, trip ${tripType}, package ${normalizedHourlyPackage}`);
      
      const fare = await calculateFare({
        cabType: selectedCab,
        distance,
        tripType,
        tripMode,
        hourlyPackage: normalizedHourlyPackage,
        pickupDate,
        returnDate,
        forceRefresh
      });
      
      // Round to nearest 10
      const roundedFare = Math.ceil(fare / 10) * 10;
      
      console.log(`usePricing: Calculated price: ${roundedFare} (raw: ${fare})`);
      
      setPricingState({
        totalPrice: roundedFare,
        isCalculating: false,
        lastUpdate: Date.now(),
        error: null
      });
      
      // Cache the calculated fare in localStorage for this specific combination
      try {
        const vehicleId = normalizeVehicleId(selectedCab.id);
        const fareKey = `calculated_fare_${vehicleId}_${tripType}_${normalizedHourlyPackage || ''}`;
        localStorage.setItem(fareKey, roundedFare.toString());
        console.log(`usePricing: Cached fare in localStorage: ${fareKey} = ${roundedFare}`);
      } catch (error) {
        console.error('Error caching fare in localStorage:', error);
      }
      
      return roundedFare;
    } catch (error) {
      console.error('Error calculating price:', error);
      setPricingState(prev => ({
        ...prev,
        isCalculating: false,
        error: error instanceof Error ? error.message : 'Unknown error calculating price'
      }));
      return 0;
    }
  }, [selectedCab, distance, tripType, tripMode, normalizedHourlyPackage, pickupDate, returnDate]);

  // Calculate price when relevant parameters change
  useEffect(() => {
    calculatePrice();
  }, [calculatePrice]);

  // Listen for force-fare-recalculation events
  useEffect(() => {
    const handleForceRecalculation = () => {
      console.log('usePricing: Forced recalculation triggered by event');
      calculatePrice(true);
    };
    
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    
    return () => {
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
    };
  }, [calculatePrice]);
  
  return {
    ...pricingState,
    calculatePrice,
    refreshPrice: () => calculatePrice(true)
  };
};
