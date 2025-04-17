
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { toast } from 'sonner';

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
  const [lastFetchAttempt, setLastFetchAttempt] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const selectedCabIdRef = useRef<string | null>(selectedCabId);
  const lastHourlyPackageRef = useRef<string | undefined>(hourlyPackage);
  const currentFareRef = useRef<number>(totalPrice);
  const lastFetchResultRef = useRef<{cabId?: string, fare?: number, timestamp?: number}>({});
  const pendingFetchRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Normalize vehicle ID consistently across the application with stricter rules
  const normalizeVehicleId = (id: string | null): string => {
    if (!id) return '';
    // Convert to lowercase, remove any spaces, and replace any special characters
    return id.toLowerCase().replace(/[\s.,-]+/g, '_').replace(/__+/g, '_');
  };

  // Verify if two vehicle IDs match, using strict normalization
  const doVehicleIdsMatch = (id1: string | null, id2: string | null): boolean => {
    if (!id1 || !id2) return false;
    return normalizeVehicleId(id1) === normalizeVehicleId(id2);
  };

  // Immediately update references when props change and reset state if needed
  useEffect(() => {
    // Check if the cab has actually changed
    const cabChanged = !doVehicleIdsMatch(selectedCabIdRef.current, selectedCabId);
    const packageChanged = lastHourlyPackageRef.current !== hourlyPackage;
    
    // Update refs
    selectedCabIdRef.current = selectedCabId;
    lastHourlyPackageRef.current = hourlyPackage;
    currentFareRef.current = totalPrice;
    
    // If the cab or package changed, cancel any pending requests and reset state
    if (cabChanged || packageChanged) {
      console.log(`BookingSummaryHelper: Cab or package changed, resetting state`);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      setRetryCount(0);
      lastFetchResultRef.current = {};
      pendingFetchRef.current = false;
      
      // Set a slight delay before allowing a new fetch
      setLastFetchAttempt(Date.now() - 1800); // Almost ready to fetch again
    }
  }, [selectedCabId, hourlyPackage, totalPrice]);

  // Ensures booking summary always has the correct fare
  const fetchCorrectFareForSelectedCab = async () => {
    // Don't do anything if we don't have a selected cab or not in local package mode
    if (!selectedCabId || tripType !== 'local' || !hourlyPackage) return;
    
    // Avoid excessive API calls
    const currentTime = Date.now();
    if (currentTime - lastFetchAttempt < 2000) {
      console.log(`BookingSummaryHelper: Throttling API call (last attempt ${currentTime - lastFetchAttempt}ms ago)`);
      return;
    }
    
    // Check if there's already a fetch in progress
    if (pendingFetchRef.current) {
      console.log(`BookingSummaryHelper: Fetch already in progress, will retry later`);
      return;
    }
    
    pendingFetchRef.current = true;
    setLastFetchAttempt(currentTime);
    
    // Cancel any existing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      const normalizedCabId = normalizeVehicleId(selectedCabId);
      console.log(`BookingSummaryHelper: Fetching local fares for vehicle ${normalizedCabId}, package: ${hourlyPackage}, timestamp: ${currentTime}`);
      
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      console.log(`BookingSummaryHelper: Fetching price from API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          ...forceRefreshHeaders,
          'X-Request-ID': `fare-${normalizedCabId}-${currentTime}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        timeout: 8000,
        signal: abortControllerRef.current.signal
      });
      
      // CRITICAL: Verify the selectedCabId hasn't changed during the API call
      if (!doVehicleIdsMatch(selectedCabIdRef.current, selectedCabId) || lastHourlyPackageRef.current !== hourlyPackage) {
        console.log('BookingSummaryHelper: Cab or package changed during API call, discarding result');
        pendingFetchRef.current = false;
        return 0;
      }
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        console.log(`BookingSummaryHelper: Retrieved fare data for ${normalizedCabId}:`, fareData);
        
        // Extract the correct price for the selected package
        let price = 0;
        if (hourlyPackage.includes('4hrs-40km') && fareData.price4hrs40km) {
          price = Number(fareData.price4hrs40km);
        } else if (hourlyPackage.includes('8hrs-80km') && fareData.price8hrs80km) {
          price = Number(fareData.price8hrs80km);
        } else if (hourlyPackage.includes('10hrs-100km') && fareData.price10hrs100km) {
          price = Number(fareData.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`BookingSummaryHelper: Retrieved fare directly from database API: ₹${price} for ${normalizedCabId}`);
          lastFetchResultRef.current = {
            cabId: normalizedCabId,
            fare: price,
            timestamp: currentTime
          };
          
          // One more verification before dispatching the event
          if (doVehicleIdsMatch(selectedCabIdRef.current, selectedCabId) && lastHourlyPackageRef.current === hourlyPackage) {
            // Broadcast the update to ensure consistency
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                packageId: hourlyPackage,
                fare: price,
                source: 'direct-api-helper',
                timestamp: currentTime,
                selectedCabId: selectedCabId, // Include the original selected cab ID for verification
                vehicleName: response.data.fares[0].vehicle_name // Include vehicle name for logging
              }
            }));
            
            pendingFetchRef.current = false;
            return price;
          } else {
            console.log('BookingSummaryHelper: Cab or package changed after API call, discarding result');
            pendingFetchRef.current = false;
            return 0;
          }
        } else {
          console.warn(`BookingSummaryHelper: No valid price found for ${normalizedCabId} with package ${hourlyPackage}`);
          pendingFetchRef.current = false;
          return 0;
        }
      } else {
        console.warn(`BookingSummaryHelper: No fare data returned for ${normalizedCabId}`);
        pendingFetchRef.current = false;
        return 0;
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('BookingSummaryHelper: Request was cancelled');
      } else {
        console.error('BookingSummaryHelper: Error fetching fare from direct API:', error);
      }
      pendingFetchRef.current = false;
      return 0;
    }
  };
  
  // Fetch the fare when the component mounts or when cab/package changes
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchCorrectFareForSelectedCab();
    }, 500); // Small delay to avoid race conditions
    
    return () => clearTimeout(delay);
  }, [selectedCabId, hourlyPackage, tripType]);
  
  // Setup listener for cab selection events
  useEffect(() => {
    const handleCabSelection = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (customEvent.detail && customEvent.detail.cabType) {
        const { cabType, tripType: eventTripType } = customEvent.detail;
        
        // Only process if this event is relevant to our current state and matches the current cab
        if (doVehicleIdsMatch(selectedCabId, cabType) && eventTripType === 'local' && doVehicleIdsMatch(cabType, selectedCabIdRef.current)) {
          console.log(`BookingSummaryHelper: Detected cab selection event for ${cabType}, scheduling fare fetch`);
          
          // Reset fetch state
          pendingFetchRef.current = false;
          
          // Add a small delay to allow other state changes to complete
          setTimeout(() => {
            fetchCorrectFareForSelectedCab();
          }, 200);
        }
      }
    };
    
    window.addEventListener('cab-selected', handleCabSelection as EventListener);
    
    return () => {
      window.removeEventListener('cab-selected', handleCabSelection as EventListener);
    };
  }, [selectedCabId, hourlyPackage]);
  
  // Setup regular retries to ensure correct fare
  useEffect(() => {
    // If total price is suspiciously low or not matching expected values, retry
    if (selectedCabId && tripType === 'local' && hourlyPackage) {
      // Check if we should trigger a retry (every 5 seconds)
      const retryInterval = setInterval(() => {
        // Only increment retry count if the selectedCabId hasn't changed
        if (doVehicleIdsMatch(selectedCabIdRef.current, selectedCabId)) {
          setRetryCount(prev => Math.min(prev + 1, 5)); // Cap retries at 5
        } else {
          // Reset retry count for new cab ID
          setRetryCount(0);
        }
      }, 5000);
      
      return () => clearInterval(retryInterval);
    }
  }, [selectedCabId, tripType, hourlyPackage]);
  
  // Execute fetch on retry counter change
  useEffect(() => {
    if (retryCount > 0 && doVehicleIdsMatch(selectedCabIdRef.current, selectedCabId)) {
      console.log(`BookingSummaryHelper: Executing retry attempt ${retryCount} for ${selectedCabId}`);
      pendingFetchRef.current = false; // Reset to allow a new fetch
      fetchCorrectFareForSelectedCab();
    }
  }, [retryCount]);
  
  // This component doesn't render anything visible
  return null;
};
