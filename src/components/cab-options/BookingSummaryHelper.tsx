
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { normalizePackageId, normalizeVehicleId, fareManager } from '@/lib/packageUtils';

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
  const lastDispatchTimeRef = useRef<number>(0);
  
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

  // Main price synchronization effect - simplified to reduce overhead
  useEffect(() => {
    // Skip if no cab selected or not a local trip
    if (!selectedCabId || tripType !== 'local' || !currentPackage || totalPrice <= 0) return;
    
    // Throttle check frequency
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 3000) { // 3 second throttle
      // If we need to update but are throttled, set a flag for later
      if (!pendingUpdateRef.current) {
        pendingUpdateRef.current = true;
        
        // Clear any existing timeout
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // Schedule a check after throttle period
        updateTimeoutRef.current = setTimeout(() => {
          lastCheckTimeRef.current = Date.now();
          pendingUpdateRef.current = false;
          
          // Re-check for price difference
          checkAndUpdatePrice();
        }, 3000);
      }
      return;
    }
    
    lastCheckTimeRef.current = now;
    pendingUpdateRef.current = false;
    
    checkAndUpdatePrice();
    
    function checkAndUpdatePrice() {
      const normalizedCabId = normalizeVehicleId(selectedCabId);
      const normalizedPackageId = normalizePackageId(currentPackage!);
      
      // Get price from fare manager
      const cachedFare = fareManager.getFare(normalizedCabId, normalizedPackageId);
      
      // If we have a price and it's significantly different from current price, update UI
      if (cachedFare && Math.abs(cachedFare.price - totalPrice) > 10) {
        console.log(`BookingSummaryHelper: Cached fare (${cachedFare.price}) differs from current (${totalPrice}), syncing`);
        
        // Throttle notifications to prevent excessive dispatches
        const now = Date.now();
        if (now - lastDispatchTimeRef.current < 5000) {
          return;
        }
        lastDispatchTimeRef.current = now;
        
        // Notify components about updated price
        fareManager.notifyFareUpdate(normalizedCabId, normalizedPackageId, cachedFare.price, 'booking-summary-helper');
        
        // Show toast for significant price changes
        toast.info(`Updated price to ₹${cachedFare.price.toLocaleString('en-IN')}`, {
          duration: 3000,
          id: `price-update-${normalizedCabId}`
        });
      } else if (!cachedFare && totalPrice > 0) {
        // If we don't have a cached fare but we do have a price, store it
        fareManager.storeFare(normalizedCabId, normalizedPackageId, totalPrice, 'booking-summary');
      }
    }
  }, [selectedCabId, tripType, currentPackage, totalPrice]);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // This component doesn't render anything visible
  return null;
};
