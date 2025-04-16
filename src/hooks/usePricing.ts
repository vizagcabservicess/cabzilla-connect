
import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Add reference to track the last calculation time and prevent excessive recalculations
  const lastCalculationTimeRef = useRef<number>(0);
  const calculationThrottleRef = useRef<number>(5000); // 5 second throttle
  const pendingCalculationRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const priceCache = useRef<Record<string, { price: number, timestamp: number }>>({});

  const normalizedHourlyPackage = hourlyPackage ? normalizePackageId(hourlyPackage) : undefined;
  const vehicleId = selectedCab ? normalizeVehicleId(selectedCab.id) : '';

  // Generate a cache key for the current parameters
  const getCacheKey = useCallback(() => {
    if (!selectedCab) return '';
    return `${vehicleId}_${tripType}_${normalizedHourlyPackage || ''}`;
  }, [vehicleId, tripType, normalizedHourlyPackage]);

  // Check if calculation is allowed based on throttling
  const canCalculate = useCallback((forceRefresh: boolean = false): boolean => {
    const now = Date.now();
    const timeSinceLastCalculation = now - lastCalculationTimeRef.current;
    
    if (pendingCalculationRef.current) {
      console.log(`usePricing: Calculation already in progress, skipping (${timeSinceLastCalculation}ms since last attempt)`);
      return false;
    }
    
    if (!forceRefresh && timeSinceLastCalculation < calculationThrottleRef.current) {
      console.log(`usePricing: Throttling calculation (${timeSinceLastCalculation}ms < ${calculationThrottleRef.current}ms)`);
      return false;
    }
    
    // Allow calculation if forced or throttle time has passed
    return true;
  }, []);

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

    // Check throttling and skip if not allowed
    if (!canCalculate(forceRefresh)) {
      // If we have a cached price, use it
      const cacheKey = getCacheKey();
      const cachedPrice = priceCache.current[cacheKey];
      if (cachedPrice && cachedPrice.price > 0) {
        console.log(`usePricing: Using cached price for ${cacheKey}: ${cachedPrice.price}`);
        setPricingState(prev => ({
          ...prev,
          totalPrice: cachedPrice.price,
          isCalculating: false,
          error: null
        }));
        return cachedPrice.price;
      }
      
      return pricingState.totalPrice;
    }

    // Mark calculation as in progress
    pendingCalculationRef.current = true;
    lastCalculationTimeRef.current = Date.now();

    try {
      setPricingState(prev => ({ ...prev, isCalculating: true, error: null }));
      console.log(`usePricing: Calculating price for ${selectedCab.name}, trip ${tripType}, package ${normalizedHourlyPackage}`);
      
      // Try to get from localStorage first
      const fareKey = `calculated_fare_${vehicleId}_${tripType}_${normalizedHourlyPackage || ''}`;
      const storedFare = localStorage.getItem(fareKey);
      
      if (!forceRefresh && storedFare) {
        const parsedFare = parseInt(storedFare, 10);
        if (!isNaN(parsedFare) && parsedFare > 0) {
          console.log(`usePricing: Using stored fare from localStorage: ${parsedFare}`);
          setPricingState({
            totalPrice: parsedFare,
            isCalculating: false,
            lastUpdate: Date.now(),
            error: null
          });
          
          // Update cache
          priceCache.current[getCacheKey()] = {
            price: parsedFare,
            timestamp: Date.now()
          };
          
          pendingCalculationRef.current = false;
          return parsedFare;
        }
      }
      
      // Set a timeout to prevent hanging calculations
      const timeoutPromise = new Promise<number>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Calculation timed out"));
        }, 5000); // 5 second timeout
      });
      
      // Actual calculation
      const calculationPromise = calculateFare({
        cabType: selectedCab,
        distance,
        tripType,
        tripMode,
        hourlyPackage: normalizedHourlyPackage,
        pickupDate,
        returnDate,
        forceRefresh
      });
      
      // Use Promise.race to handle timeout
      const fare = await Promise.race([calculationPromise, timeoutPromise]);
      
      // Round to nearest 10
      const roundedFare = Math.ceil(fare / 10) * 10;
      
      console.log(`usePricing: Calculated price: ${roundedFare} (raw: ${fare})`);
      
      if (!mountedRef.current) {
        console.log('usePricing: Component unmounted, skipping state update');
        pendingCalculationRef.current = false;
        return roundedFare;
      }
      
      setPricingState({
        totalPrice: roundedFare,
        isCalculating: false,
        lastUpdate: Date.now(),
        error: null
      });
      
      // Update cache
      priceCache.current[getCacheKey()] = {
        price: roundedFare,
        timestamp: Date.now()
      };
      
      // Cache the calculated fare in localStorage for this specific combination
      try {
        localStorage.setItem(fareKey, roundedFare.toString());
        console.log(`usePricing: Cached fare in localStorage: ${fareKey} = ${roundedFare}`);
      } catch (error) {
        console.error('Error caching fare in localStorage:', error);
      }
      
      pendingCalculationRef.current = false;
      return roundedFare;
    } catch (error) {
      console.error('Error calculating price:', error);
      
      if (!mountedRef.current) {
        console.log('usePricing: Component unmounted, skipping error update');
        pendingCalculationRef.current = false;
        return 0;
      }
      
      setPricingState(prev => ({
        ...prev,
        isCalculating: false,
        error: error instanceof Error ? error.message : 'Unknown error calculating price'
      }));
      
      // Try to use cached price as fallback
      const cacheKey = getCacheKey();
      const cachedPrice = priceCache.current[cacheKey];
      if (cachedPrice && cachedPrice.price > 0) {
        console.log(`usePricing: Using cached price after error: ${cachedPrice.price}`);
        setPricingState(prev => ({
          ...prev,
          totalPrice: cachedPrice.price
        }));
        pendingCalculationRef.current = false;
        return cachedPrice.price;
      }
      
      pendingCalculationRef.current = false;
      return 0;
    }
  }, [selectedCab, distance, tripType, tripMode, normalizedHourlyPackage, pickupDate, returnDate, canCalculate, getCacheKey, pricingState.totalPrice]);

  // Calculate price when relevant parameters change, with debounce
  useEffect(() => {
    // Use setTimeout for debouncing instead of immediate calculation
    const debounceTimeout = setTimeout(() => {
      if (mountedRef.current) {
        calculatePrice();
      }
    }, 300); // 300ms debounce
    
    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [calculatePrice]);

  // Listen for force-fare-recalculation events with throttling
  useEffect(() => {
    mountedRef.current = true;
    
    const handleForceRecalculation = (event: Event) => {
      if (!mountedRef.current) return;
      
      // Apply additional throttling for events
      const now = Date.now();
      const timeSinceLastCalculation = now - lastCalculationTimeRef.current;
      
      if (timeSinceLastCalculation < 10000) { // 10s throttle for forced recalculations
        console.log('usePricing: Ignoring forced recalculation due to throttling');
        return;
      }
      
      console.log('usePricing: Forced recalculation triggered by event');
      calculatePrice(true);
    };
    
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    
    return () => {
      mountedRef.current = false;
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
    };
  }, [calculatePrice]);
  
  return {
    ...pricingState,
    calculatePrice,
    refreshPrice: () => calculatePrice(true)
  };
};
