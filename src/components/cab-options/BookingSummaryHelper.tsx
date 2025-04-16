
import { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { 
  normalizePackageId, 
  normalizeVehicleId, 
  shouldThrottle,
  fareManager 
} from '@/lib/packageUtils';

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
  const [lastPriceCheck, setLastPriceCheck] = useState<number>(0);
  const [lastApiCall, setLastApiCall] = useState<number>(0);
  const [checkAttempts, setCheckAttempts] = useState<number>(0);
  const [currentPackage, setCurrentPackage] = useState<string | undefined>(
    hourlyPackage ? normalizePackageId(hourlyPackage) : undefined
  );

  // Update hourlyPackage in state when the prop changes
  useEffect(() => {
    if (hourlyPackage) {
      const normalizedPackage = normalizePackageId(hourlyPackage);
      if (normalizedPackage !== currentPackage) {
        console.log(`BookingSummaryHelper: hourlyPackage prop changed to ${hourlyPackage} (normalized: ${normalizedPackage})`);
        setCurrentPackage(normalizedPackage);
        
        // Force a fare check when package changes
        if (selectedCabId) {
          const normalizedCabId = normalizeVehicleId(selectedCabId);
          // Store the currently selected package
          localStorage.setItem(`selected_package_${normalizedCabId}`, normalizedPackage);
          
          // When package changes, trigger a price check
          setCheckAttempts(prev => prev + 1);
        }
      }
    }
  }, [hourlyPackage, currentPackage, selectedCabId]);

  // Listen for package changes specifically
  useEffect(() => {
    const handlePackageChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId) {
        const { packageId } = customEvent.detail;
        const normalizedPackageId = normalizePackageId(packageId);
        console.log(`BookingSummaryHelper: Detected package change to ${packageId} (normalized: ${normalizedPackageId})`);
        
        // Update our current package
        setCurrentPackage(normalizedPackageId);
        
        // Trigger a check to get new price for updated package
        setCheckAttempts(prev => prev + 1);
        
        // Store the currently selected package
        if (selectedCabId) {
          const normalizedCabId = normalizeVehicleId(selectedCabId);
          localStorage.setItem(`selected_package_${normalizedCabId}`, normalizedPackageId);
        }
      }
    };
    
    // Listen for various package change events
    window.addEventListener('hourly-package-selected', handlePackageChanged as EventListener);
    
    return () => {
      window.removeEventListener('hourly-package-selected', handlePackageChanged as EventListener);
    };
  }, [selectedCabId]);

  // Main price check and synchronization effect
  useEffect(() => {
    // Skip if no cab selected or not a local trip
    if (!selectedCabId || tripType !== 'local' || !currentPackage) return;

    // Throttle check frequency
    const now = Date.now();
    if (now - lastPriceCheck < 5000 && checkAttempts > 1) { // 5 second throttle after first check
      return;
    }
    setLastPriceCheck(now);
    
    const normalizedCabId = normalizeVehicleId(selectedCabId);
    const normalizedPackageId = normalizePackageId(currentPackage);

    // Get price from fare manager
    const storedFare = fareManager.getFare(normalizedCabId, normalizedPackageId);
    
    // If stored fare exists and significantly differs from current price, update UI
    if (storedFare && Math.abs(storedFare.price - totalPrice) > 10) {
      console.log(`BookingSummaryHelper: Stored fare (${storedFare.price}) differs from current price (${totalPrice}), updating booking summary`);
      
      fareManager.notifyFareUpdate(normalizedCabId, normalizedPackageId, storedFare.price, 'booking-summary-helper');
      
      // Also show toast to make the price change more noticeable
      toast.info(`Updated price for ${getPackageDisplayName(normalizedPackageId)}: ₹${storedFare.price}`, {
        duration: 3000,
        id: `price-update-${normalizedCabId}-${normalizedPackageId}`
      });
      
      return;
    }
    
    // If we have no stored fare or it's time to refresh, fetch from API
    const shouldFetchFromApi = !storedFare || now - lastApiCall > 30000; // 30 second throttle for API calls
    
    if (shouldFetchFromApi) {
      setLastApiCall(now);
      
      // Fetch price from API with reasonable timeout
      const fetchFare = async () => {
        try {
          const apiUrl = getApiUrl(`api/user/direct-booking-data.php?vehicle_id=${normalizedCabId}&package_id=${normalizedPackageId}`);
          
          console.log(`BookingSummaryHelper: Fetching fare from API for ${normalizedCabId}, ${normalizedPackageId}`);
          
          const response = await axios.get(apiUrl, {
            headers: { 'Cache-Control': 'no-cache' },
            timeout: 5000 // 5 second timeout
          });
          
          if (response.data && response.data.status === 'success' && response.data.price) {
            const price = Number(response.data.price);
            if (price > 0) {
              console.log(`BookingSummaryHelper: Retrieved fare from API: ₹${price}`);
              
              // Store in fare manager
              fareManager.storeFare(normalizedCabId, normalizedPackageId, price, 'api-direct');
              
              // If price significantly differs from current price, update UI
              if (Math.abs(price - totalPrice) > 10) {
                fareManager.notifyFareUpdate(normalizedCabId, normalizedPackageId, price, 'api-direct');
                
                // Show toast for significant price change
                toast.info(`Updated price for ${getPackageDisplayName(normalizedPackageId)}: ₹${price}`, {
                  duration: 3000,
                  id: `price-update-${normalizedCabId}-${normalizedPackageId}`
                });
              }
            }
          }
        } catch (error) {
          console.error('BookingSummaryHelper: Error fetching fare:', error);
          // No need to show error to user - we'll use cached/estimated prices
        }
      };
      
      fetchFare();
    }
  }, [selectedCabId, tripType, currentPackage, totalPrice, checkAttempts, lastPriceCheck, lastApiCall]);
  
  // This component doesn't render anything visible
  return null;
};

// Helper function to get package display name
const getPackageDisplayName = (packageId: string): string => {
  switch (normalizePackageId(packageId)) {
    case '4hrs-40km':
      return '4 Hours / 40 KM';
    case '8hrs-80km':
      return '8 Hours / 80 KM';
    case '10hrs-100km':
      return '10 Hours / 100 KM';
    default:
      return packageId.replace(/-/g, ' ').replace(/_/g, ' ');
  }
};
