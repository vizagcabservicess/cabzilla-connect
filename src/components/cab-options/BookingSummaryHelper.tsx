
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { normalizePackageId, normalizeVehicleId, fareManager, shouldThrottle } from '@/lib/packageUtils';

interface BookingSummaryHelperProps {
  tripType: string;
  selectedCabId: string | null;
  totalPrice: number;
  hourlyPackage?: string;
}

/**
 * A helper component that ensures fare consistency across components
 * This component doesn't render anything visible but handles fare synchronization
 */
export const BookingSummaryHelper: React.FC<BookingSummaryHelperProps> = ({
  tripType,
  selectedCabId,
  totalPrice,
  hourlyPackage
}) => {
  const [currentPackage, setCurrentPackage] = useState<string | undefined>(
    hourlyPackage ? normalizePackageId(hourlyPackage) : undefined
  );
  
  // Use refs to track state between renders and prevent excessive operations
  const lastCheckTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<boolean>(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track when we've dispatched a price update so we don't get into loops
  const lastDispatchTimeRef = useRef<Record<string, number>>({});
  const mountedRef = useRef<boolean>(true);
  const lastProcessedPriceRef = useRef<number>(0);
  
  // Update hourlyPackage in state when the prop changes
  useEffect(() => {
    if (hourlyPackage) {
      const normalizedPackage = normalizePackageId(hourlyPackage);
      if (normalizedPackage !== currentPackage) {
        console.log(`BookingSummaryHelper: hourlyPackage changed to ${hourlyPackage} (normalized: ${normalizedPackage})`);
        setCurrentPackage(normalizedPackage);
      }
    }
  }, [hourlyPackage, currentPackage]);

  // Main price synchronization effect - significantly more aggressive throttling to prevent loops
  useEffect(() => {
    // Skip if no cab selected or not a local trip
    if (!selectedCabId || tripType !== 'local' || !currentPackage || totalPrice <= 0) return;
    
    // Check if this is the same price we just processed to prevent loops
    if (totalPrice === lastProcessedPriceRef.current) {
      return; // Skip processing the same price multiple times
    }
    
    // Extremely aggressive throttling specifically for Innova Hycross to break the loop
    const normalizedCabId = normalizeVehicleId(selectedCabId);
    if (normalizedCabId === 'innova_hycross' || normalizedCabId === 'mpv') {
      // 15 second throttle for Innova Hycross which seems particularly problematic
      if (shouldThrottle(`booking-summary-hycross-${normalizedCabId}`, 15000)) {
        console.log(`BookingSummaryHelper: Extra throttling for ${normalizedCabId}`);
        return;
      }
    }
    
    // General throttle check with much higher timeout (5 seconds)
    if (shouldThrottle('booking-summary-check', 5000)) {
      return;
    }
    
    lastCheckTimeRef.current = Date.now();
    lastProcessedPriceRef.current = totalPrice;
    
    // Guard clause against recursive updates
    if (pendingUpdateRef.current) {
      console.log('BookingSummaryHelper: Update already in progress, skipping');
      return;
    }
    
    pendingUpdateRef.current = true;
    
    try {
      const normalizedCabId = normalizeVehicleId(selectedCabId);
      const normalizedPackageId = normalizePackageId(currentPackage!);
      const cacheKey = `${normalizedCabId}_${normalizedPackageId}`;
      
      // Get price from fare manager
      const cachedFare = fareManager.getFare(normalizedCabId, normalizedPackageId);
      
      // If we have a price and it's significantly different from current price, update UI
      if (cachedFare && Math.abs(cachedFare.price - totalPrice) > 10) {
        console.log(`BookingSummaryHelper: Cached fare (${cachedFare.price}) differs from current (${totalPrice}), syncing`);
        
        // Throttle notifications for this specific vehicle/package combination
        const now = Date.now();
        const lastTime = lastDispatchTimeRef.current[cacheKey] || 0;
        
        if (now - lastTime < 8000) { // 8 second throttle per vehicle/package
          console.log(`BookingSummaryHelper: Throttling price sync for ${cacheKey}`);
          pendingUpdateRef.current = false;
          return;
        }
        
        lastDispatchTimeRef.current[cacheKey] = now;
        
        // Notify components about updated price - but use setTimeout to defer execution
        // This helps break circular update patterns
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          
          fareManager.notifyFareUpdate(normalizedCabId, normalizedPackageId, cachedFare.price, 'booking-summary-helper');
          
          // Show toast for significant price changes - only for large differences
          if (Math.abs(cachedFare.price - totalPrice) > 100) {
            toast.info(`Updated price to ₹${cachedFare.price.toLocaleString('en-IN')}`, {
              duration: 3000,
              id: `price-update-${normalizedCabId}`
            });
          }
          
          pendingUpdateRef.current = false;
        }, 1000); // 1 second delay before dispatch to break potential loops
      } else if (!cachedFare && totalPrice > 0) {
        // If we don't have a cached fare but we do have a price, store it
        fareManager.storeFare(normalizedCabId, normalizedPackageId, totalPrice, 'booking-summary');
        pendingUpdateRef.current = false;
      } else {
        pendingUpdateRef.current = false;
      }
    } catch (error) {
      console.error('Error in BookingSummaryHelper:', error);
      pendingUpdateRef.current = false;
    }
  }, [selectedCabId, tripType, currentPackage, totalPrice]);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // This component doesn't render anything visible
  return null;
};
