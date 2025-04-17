
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
  const requestAbortControllerRef = useRef<AbortController | null>(null);
  
  // Map to track fare calculations in progress for specific vehicles
  const fareCalculationInProgressMap = useRef<Record<string, boolean>>({});

  // Immediately update references when props change
  useEffect(() => {
    // If the cab ID changed, abort any pending requests for the previous cab
    if (selectedCabIdRef.current !== selectedCabId && requestAbortControllerRef.current) {
      console.log(`BookingSummaryHelper: Aborting pending requests for previous cab ${selectedCabIdRef.current}`);
      requestAbortControllerRef.current.abort();
      requestAbortControllerRef.current = null;
      
      // Clear operation flag for the previous cab ID if it exists
      if (selectedCabIdRef.current) {
        fareCalculationInProgressMap.current[selectedCabIdRef.current] = false;
      }
    }
    
    selectedCabIdRef.current = selectedCabId;
    lastHourlyPackageRef.current = hourlyPackage;
    
    // Only update the fare reference if the total price is valid
    if (totalPrice > 0) {
      currentFareRef.current = totalPrice;
    }
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
    
    // Use a vehicle-specific lock to prevent concurrent operations for the same vehicle
    const normalizedCabId = normalizeVehicleId(selectedCabId);
    if (fareCalculationInProgressMap.current[normalizedCabId]) {
      console.log(`BookingSummaryHelper: Fare calculation already in progress for ${normalizedCabId}, skipping`);
      return 0;
    }
    
    // Set the flag to indicate this vehicle's fare is being calculated
    fareCalculationInProgressMap.current[normalizedCabId] = true;
    operationInProgressRef.current = true;
    setLastFetchAttempt(currentTime);
    
    // Create an abort controller for this request
    if (requestAbortControllerRef.current) {
      requestAbortControllerRef.current.abort();
    }
    requestAbortControllerRef.current = new AbortController();
    
    try {
      console.log(`BookingSummaryHelper: Fetching local fares for vehicle ${normalizedCabId}, package: ${hourlyPackage}`);
      
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      console.log(`Fetching price from API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: forceRefreshHeaders,
        timeout: 8000,
        signal: requestAbortControllerRef.current.signal
      });
      
      // Important: Verify the selectedCabId hasn't changed during the API call
      if (selectedCabIdRef.current !== selectedCabId || lastHourlyPackageRef.current !== hourlyPackage) {
        console.log('BookingSummaryHelper: Cab or package changed during API call, discarding result');
        fareCalculationInProgressMap.current[normalizedCabId] = false;
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
            
            // Also dispatch the fare-updated event for component consistency
            window.dispatchEvent(new CustomEvent('fare-updated', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                packageId: hourlyPackage,
                fare: price,
                source: 'booking-summary-helper',
                timestamp: currentTime
              }
            }));
            
            fareCalculationInProgressMap.current[normalizedCabId] = false;
            operationInProgressRef.current = false;
            return price;
          } else {
            console.log('BookingSummaryHelper: Cab or package changed after API call, discarding result');
            fareCalculationInProgressMap.current[normalizedCabId] = false;
            operationInProgressRef.current = false;
            return 0;
          }
        } else {
          console.warn(`No valid price found for ${normalizedCabId} with package ${hourlyPackage}`);
          fareCalculationInProgressMap.current[normalizedCabId] = false;
          operationInProgressRef.current = false;
          return 0;
        }
      } else {
        console.warn(`No fare data returned for ${normalizedCabId}`);
        fareCalculationInProgressMap.current[normalizedCabId] = false;
        operationInProgressRef.current = false;
        return 0;
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log(`BookingSummaryHelper: Request for ${normalizedCabId} was cancelled`);
      } else {
        console.error('Error fetching fare from direct API:', error);
      }
      fareCalculationInProgressMap.current[normalizedCabId] = false;
      operationInProgressRef.current = false;
      return 0;
    }
  };
  
  // Fetch the fare when the component mounts or when cab/package changes
  useEffect(() => {
    if (selectedCabId && tripType === "local" && hourlyPackage) {
      const delay = setTimeout(() => {
        // Clear any previous calculation flags for this vehicle
        const normalizedCabId = normalizeVehicleId(selectedCabId);
        fareCalculationInProgressMap.current[normalizedCabId] = false;
        
        // Then trigger a new fetch
        fetchCorrectFareForSelectedCab();
      }, 200); // Small delay to avoid race conditions
      
      return () => clearTimeout(delay);
    }
  }, [selectedCabId, hourlyPackage, tripType]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Abort any pending requests
      if (requestAbortControllerRef.current) {
        requestAbortControllerRef.current.abort();
      }
      
      // Clear calculation flags
      fareCalculationInProgressMap.current = {};
    };
  }, []);
  
  // This component doesn't render anything visible
  return null;
};
