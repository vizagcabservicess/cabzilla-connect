
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
  const operationInProgressRef = useRef<boolean>(false);

  // Immediately update references when props change
  useEffect(() => {
    selectedCabIdRef.current = selectedCabId;
    lastHourlyPackageRef.current = hourlyPackage;
    currentFareRef.current = totalPrice;
  }, [selectedCabId, hourlyPackage, totalPrice]);

  // Normalize vehicle ID to ensure consistency
  const normalizeVehicleId = (id: string): string => {
    return id.toLowerCase().replace(/\s+/g, '_');
  };

  // Ensures booking summary always has the correct fare
  const fetchCorrectFareForSelectedCab = async () => {
    // Don't do anything if we don't have a selected cab or not in local package mode
    if (!selectedCabId || tripType !== 'local' || !hourlyPackage) return 0;
    
    // Avoid excessive API calls
    const currentTime = Date.now();
    if (currentTime - lastFetchAttempt < 2000) {
      console.log(`BookingSummaryHelper: Throttling API call (last attempt ${currentTime - lastFetchAttempt}ms ago)`);
      return 0;
    }
    
    // Avoid concurrent operations
    if (operationInProgressRef.current) {
      console.log(`BookingSummaryHelper: Operation already in progress, skipping`);
      return 0;
    }
    
    operationInProgressRef.current = true;
    setLastFetchAttempt(currentTime);
    
    try {
      const normalizedCabId = normalizeVehicleId(selectedCabId);
      console.log(`BookingSummaryHelper: Fetching local fares for vehicle ${normalizedCabId}, package: ${hourlyPackage}`);
      
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      console.log(`Fetching price from API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: forceRefreshHeaders,
        timeout: 8000
      });
      
      // Important: Verify the selectedCabId hasn't changed during the API call
      if (selectedCabIdRef.current !== selectedCabId || lastHourlyPackageRef.current !== hourlyPackage) {
        console.log('BookingSummaryHelper: Cab or package changed during API call, discarding result');
        operationInProgressRef.current = false;
        return 0;
      }
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        
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
          console.log(`BookingSummaryHelper: Retrieved fare directly from database API: ₹${price}`);
          
          // One more verification before dispatching the event
          if (selectedCabIdRef.current === selectedCabId && lastHourlyPackageRef.current === hourlyPackage) {
            // Clear any previous stored fares to prevent confusion
            try {
              // Clear only the fare for this specific vehicle to avoid multiple selection conflicts
              localStorage.removeItem(`fare_local_${normalizedCabId}`);
            } catch (e) {
              console.warn('Failed to clear localStorage:', e);
            }
            
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
                originalVehicleId: selectedCabId // Extra verification field
              }
            }));
            
            operationInProgressRef.current = false;
            return price;
          } else {
            console.log('BookingSummaryHelper: Cab or package changed after API call, discarding result');
            operationInProgressRef.current = false;
            return 0;
          }
        } else {
          console.warn(`No valid price found for ${normalizedCabId} with package ${hourlyPackage}`);
          operationInProgressRef.current = false;
          return 0;
        }
      } else {
        console.warn(`No fare data returned for ${normalizedCabId}`);
        operationInProgressRef.current = false;
        return 0;
      }
    } catch (error) {
      console.error('Error fetching fare from direct API:', error);
      operationInProgressRef.current = false;
      return 0;
    }
  };
  
  // Fetch the fare when the component mounts or when cab/package changes
  useEffect(() => {
    if (selectedCabId && tripType === "local" && hourlyPackage) {
      const delay = setTimeout(() => {
        fetchCorrectFareForSelectedCab();
      }, 200); // Small delay to avoid race conditions
      
      return () => clearTimeout(delay);
    }
  }, [selectedCabId, hourlyPackage, tripType]);
  
  // Setup listener for cab selection events
  useEffect(() => {
    const handleCabSelection = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (customEvent.detail && customEvent.detail.cabType) {
        const { cabType, tripType: eventTripType } = customEvent.detail;
        
        // Only process if this event is relevant to our current state and matches the current cab
        if (selectedCabId === cabType && eventTripType === 'local' && cabType === selectedCabIdRef.current) {
          console.log(`BookingSummaryHelper: Detected cab selection event for ${cabType}, scheduling fare fetch`);
          
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
    // Only setup retry for local trips with valid cab selection
    if (selectedCabId && tripType === "local" && hourlyPackage) {
      // Check if we should trigger a retry (every 5 seconds)
      const retryInterval = setInterval(() => {
        // Only increment retry count if the selectedCabId hasn't changed
        if (selectedCabIdRef.current === selectedCabId) {
          setRetryCount(prev => prev + 1);
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
    if (retryCount > 0 && selectedCabIdRef.current === selectedCabId) {
      fetchCorrectFareForSelectedCab();
    }
  }, [retryCount]);
  
  // This component doesn't render anything visible
  return null;
};
