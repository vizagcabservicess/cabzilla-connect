
import { useState, useEffect, useCallback, useRef } from 'react';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { 
  normalizePackageId, 
  normalizeVehicleId, 
  shouldThrottle,
  getCachedPrice,
  saveCachedPrice,
  synchronizeFareAcrossComponents,
  fareManager
} from '../lib/packageUtils';
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
  const calculationThrottleRef = useRef<number>(7000); // 7 second throttle
  const pendingCalculationRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Normalize package ID and vehicle ID for consistency
  const normalizedHourlyPackage = hourlyPackage ? normalizePackageId(hourlyPackage) : undefined;
  const vehicleId = selectedCab ? normalizeVehicleId(selectedCab.id) : '';

  // Log normalized values for debugging
  useEffect(() => {
    if (hourlyPackage) {
      console.log(`[DEBUG] usePricing: Package normalized from ${hourlyPackage} to ${normalizedHourlyPackage}`);
    }
    if (selectedCab) {
      console.log(`[DEBUG] usePricing: Vehicle normalized from ${selectedCab.id} to ${vehicleId}`);
    }
  }, [hourlyPackage, selectedCab, normalizedHourlyPackage, vehicleId]);

  // Generate a cache key for the current parameters
  const getCacheKey = useCallback(() => {
    if (!selectedCab) return '';
    return `${vehicleId}_${tripType}_${normalizedHourlyPackage || ''}`;
  }, [vehicleId, tripType, normalizedHourlyPackage]);

  // Check if calculation is allowed based on throttling
  const canCalculate = useCallback((forceRefresh: boolean = false): boolean => {
    if (!mountedRef.current) return false;
    
    const now = Date.now();
    const timeSinceLastCalculation = now - lastCalculationTimeRef.current;
    
    if (pendingCalculationRef.current) {
      console.log(`usePricing: Calculation already in progress, skipping (${timeSinceLastCalculation}ms since last attempt)`);
      return false;
    }
    
    if (!forceRefresh && timeSinceLastCalculation < calculationThrottleRef.current) {
      console.log(`usePricing: Throttling calculation (${timeSinceLastCalculation}ms < ${calculationThrottleRef.current}ms)`);
      
      // If we have a cached price, this is perfectly fine
      if (selectedCab && tripType === 'local' && normalizedHourlyPackage) {
        const cachedResult = fareManager.getFare(vehicleId, normalizedHourlyPackage);
        return !cachedResult || cachedResult.price <= 0 ? (timeSinceLastCalculation > 1000) : false;
      }
      
      return timeSinceLastCalculation > 1000;
    }
    
    // Allow calculation if forced or throttle time has passed
    return true;
  }, [vehicleId, tripType, normalizedHourlyPackage]);

  // Get a price from all available caching mechanisms
  const getPriceFromAllCaches = useCallback(() => {
    if (!selectedCab) return 0;
    
    // Try the centralized fare manager first
    if (tripType === 'local' && normalizedHourlyPackage) {
      const cachedResult = fareManager.getFare(vehicleId, normalizedHourlyPackage);
      if (cachedResult && cachedResult.price > 0) {
        console.log(`usePricing: Found price in fare manager: ${cachedResult.price} (source: ${cachedResult.source})`);
        return cachedResult.price;
      }
    }
    
    // Fallback to default price from cab object
    if (selectedCab.price && selectedCab.price > 0) {
      console.log(`usePricing: Using default price from cab object: ${selectedCab.price}`);
      // Store this in the fare manager for future use
      if (tripType === 'local' && normalizedHourlyPackage) {
        fareManager.storeFare(vehicleId, normalizedHourlyPackage, selectedCab.price, 'cab-default');
      }
      return selectedCab.price;
    }
    
    // Last resort: estimate based on vehicle type
    const estimatedPrice = vehicleId.includes('innova_hycross') ? 4500 :
                          vehicleId.includes('innova_crysta') ? 4000 :
                          vehicleId.includes('ertiga') ? 3500 :
                          vehicleId.includes('tempo') ? 5500 : 2500;
    
    console.log(`usePricing: Using estimated price: ${estimatedPrice}`);
    // Store this in the fare manager for future use
    if (tripType === 'local' && normalizedHourlyPackage) {
      fareManager.storeFare(vehicleId, normalizedHourlyPackage, estimatedPrice, 'estimated');
    }
    return estimatedPrice;
  }, [selectedCab, tripType, normalizedHourlyPackage, vehicleId]);

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
      // Get price from cache or fallback mechanisms instead of skipping completely
      const fallbackPrice = getPriceFromAllCaches();
      
      if (fallbackPrice > 0) {
        console.log(`usePricing: Using fallback price due to throttling: ${fallbackPrice}`);
        setPricingState(prev => ({
          ...prev,
          totalPrice: fallbackPrice,
          isCalculating: false,
          error: null
        }));
        return fallbackPrice;
      }
      
      return pricingState.totalPrice;
    }

    // Mark calculation as in progress
    pendingCalculationRef.current = true;
    lastCalculationTimeRef.current = Date.now();

    try {
      setPricingState(prev => ({ ...prev, isCalculating: true, error: null }));
      console.log(`usePricing: Calculating price for ${selectedCab.name}, trip ${tripType}, package ${normalizedHourlyPackage}`);
      
      // Try to get from fare manager first (if not forcing refresh)
      if (!forceRefresh && tripType === 'local' && normalizedHourlyPackage) {
        const cachedResult = fareManager.getFare(vehicleId, normalizedHourlyPackage);
        if (cachedResult && cachedResult.price > 0) {
          console.log(`usePricing: Using price from fare manager: ${cachedResult.price} (source: ${cachedResult.source})`);
          setPricingState({
            totalPrice: cachedResult.price,
            isCalculating: false,
            lastUpdate: Date.now(),
            error: null
          });
          
          pendingCalculationRef.current = false;
          return cachedResult.price;
        }
      }
      
      // Set up timeout control for the API call
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
      }
      
      // If calculation takes too long, use fallback price
      apiTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current || !pendingCalculationRef.current) return;
        
        console.log('usePricing: API calculation timeout reached, using fallback price');
        const fallbackPrice = getPriceFromAllCaches();
        
        if (fallbackPrice > 0) {
          setPricingState(prev => ({
            ...prev,
            totalPrice: fallbackPrice,
            isCalculating: false,
            error: "API timeout - using estimated price"
          }));
          
          pendingCalculationRef.current = false;
        }
      }, 4000); // 4 second timeout
      
      // Actual calculation
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
      
      // Clear the timeout since we got a successful response
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
        apiTimeoutRef.current = null;
      }
      
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
      
      // Store the calculated price in the fare manager
      if (tripType === 'local' && normalizedHourlyPackage) {
        fareManager.storeFare(vehicleId, normalizedHourlyPackage, roundedFare, 'api-calculation');
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
      
      // Try to use cached price as fallback
      const fallbackPrice = getPriceFromAllCaches();
      
      if (fallbackPrice > 0) {
        console.log(`usePricing: Using fallback price after error: ${fallbackPrice}`);
        setPricingState(prev => ({
          ...prev,
          totalPrice: fallbackPrice,
          isCalculating: false,
          error: "Using estimated price due to calculation error"
        }));
        
        pendingCalculationRef.current = false;
        return fallbackPrice;
      }
      
      setPricingState(prev => ({
        ...prev,
        isCalculating: false,
        error: error instanceof Error ? error.message : 'Unknown error calculating price'
      }));
      
      pendingCalculationRef.current = false;
      return 0;
    }
  }, [selectedCab, distance, tripType, tripMode, normalizedHourlyPackage, pickupDate, returnDate, canCalculate, pricingState.totalPrice, getPriceFromAllCaches, vehicleId]);

  // Calculate price when relevant parameters change, with debounce
  useEffect(() => {
    // Clear any existing timeout to prevent multiple calculations
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Use setTimeout for debouncing instead of immediate calculation
    debounceTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        calculatePrice(false);
      }
      debounceTimeoutRef.current = null;
    }, 300); // 300ms debounce
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [calculatePrice]);

  // Listen for fare update events
  useEffect(() => {
    const handleFareUpdated = (event: CustomEvent) => {
      if (!mountedRef.current) return;
      
      if (selectedCab && normalizedHourlyPackage && event.detail && 
          event.detail.vehicleId === vehicleId && 
          event.detail.packageId === normalizedHourlyPackage) {
        
        console.log(`usePricing: Received fare update: ${event.detail.price} (source: ${event.detail.source})`);
        
        // Update pricing state with updated fare
        setPricingState(prev => ({
          ...prev,
          totalPrice: event.detail.price,
          isCalculating: false,
          lastUpdate: Date.now(),
          error: null
        }));
      }
    };
    
    // Listen for force-fare-recalculation events with throttling
    const handleForceRecalculation = () => {
      if (!mountedRef.current) return;
      
      // Apply additional throttling for events
      if (shouldThrottle('priceCalculation', 10000)) {
        console.log('usePricing: Ignoring forced recalculation due to throttling');
        return;
      }
      
      console.log('usePricing: Forced recalculation triggered by event');
      calculatePrice(true);
    };
    
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    window.addEventListener('fare-updated', handleFareUpdated as EventListener);
    
    return () => {
      mountedRef.current = false;
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
      window.removeEventListener('fare-updated', handleFareUpdated as EventListener);
      
      // Clear any pending timeouts
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);
    };
  }, [calculatePrice, vehicleId, normalizedHourlyPackage, selectedCab]);
  
  return {
    ...pricingState,
    calculatePrice,
    refreshPrice: () => calculatePrice(true),
    getCachedPrice: (specificCab?: CabType) => {
      if (specificCab && tripType === 'local' && normalizedHourlyPackage) {
        const specificVehicleId = normalizeVehicleId(specificCab.id);
        const cachedResult = fareManager.getFare(specificVehicleId, normalizedHourlyPackage);
        return cachedResult ? cachedResult.price : getPriceFromAllCaches();
      }
      return getPriceFromAllCaches();
    }
  };
};
