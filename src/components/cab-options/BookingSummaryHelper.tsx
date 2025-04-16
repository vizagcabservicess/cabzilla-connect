
import { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
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
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [disableOverrides, setDisableOverrides] = useState<boolean>(false);
  
  // Track fare sources for debugging
  useEffect(() => {
    // Listen for fare source updates to track where fares are coming from
    const handleFareSourceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.source) {
        const { cabId, source } = customEvent.detail;
        if (selectedCabId && cabId === selectedCabId.toLowerCase().replace(/\s+/g, '_')) {
          console.log(`BookingSummaryHelper: Fare source for ${cabId} is ${source}`);
        }
      }
    };

    window.addEventListener('fare-source-update', handleFareSourceUpdate as EventListener);
    
    return () => {
      window.removeEventListener('fare-source-update', handleFareSourceUpdate as EventListener);
    };
  }, [selectedCabId]);

  // Core synchronization logic - respects the latest selected fare
  useEffect(() => {
    if (!selectedCabId || !tripType || !hourlyPackage) return;
    
    // Prevent excessive sync attempts (throttle to once per second)
    const now = Date.now();
    if (now - lastSyncTime < 1000) return;
    setLastSyncTime(now);

    // Normalize the cab ID for consistency with stored values
    const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
    
    // Get the selected fare from CabList's selection event
    const selectedFareKey = `selected_fare_${normalizedCabId}_${hourlyPackage}`;
    const selectedFare = localStorage.getItem(selectedFareKey);
    
    if (selectedFare) {
      const parsedFare = parseFloat(selectedFare);
      if (!isNaN(parsedFare) && parsedFare > 0) {
        console.log(`BookingSummaryHelper: Using selected fare from CabList: ₹${parsedFare} for ${normalizedCabId} with ${hourlyPackage}`);
        
        // Only update if there's a significant difference (more than ₹10)
        if (Math.abs(parsedFare - totalPrice) > 10) {
          console.log(`BookingSummaryHelper: Updating fare from ${totalPrice} to ${parsedFare}`);
          
          // Dispatch booking summary update event
          window.dispatchEvent(new CustomEvent('booking-summary-update', {
            detail: {
              cabId: normalizedCabId,
              tripType: tripType,
              packageId: hourlyPackage,
              fare: parsedFare,
              source: 'cab-list-selected',
              timestamp: now
            }
          }));
          
          // Also dispatch a fare calculated event
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: normalizedCabId,
              tripType: tripType,
              calculated: true,
              fare: parsedFare,
              packageId: hourlyPackage,
              source: 'booking-summary-helper',
              timestamp: now
            }
          }));
        }
        return;
      }
    }
    
    // Only fetch from database if we don't have a valid selected fare
    // and it's been at least 3 seconds since last fetch attempt
    if (now - lastFetchAttempt < 3000) return;
    setLastFetchAttempt(now);
    
    const fetchFareFromDatabase = async () => {
      try {
        console.log(`BookingSummaryHelper: Fetching fare for ${normalizedCabId} with ${hourlyPackage}`);
        
        // Direct package api endpoint
        const packageApiUrl = getApiUrl(`api/local-package-fares.php?vehicle_id=${normalizedCabId}&package_id=${hourlyPackage}`);
        
        const response = await axios.get(packageApiUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          },
          timeout: 5000
        });
        
        if (response.data && response.data.status === 'success' && response.data.price) {
          const price = Number(response.data.price);
          if (price > 0) {
            console.log(`BookingSummaryHelper: Retrieved fare directly from API: ₹${price}`);
            
            // Store this price in localStorage
            localStorage.setItem(selectedFareKey, price.toString());
            
            // Only update if there's a significant difference (more than ₹10)
            if (Math.abs(price - totalPrice) > 10) {
              console.log(`BookingSummaryHelper: Updating fare from ${totalPrice} to ${price}`);
              
              // Dispatch booking summary update event
              window.dispatchEvent(new CustomEvent('booking-summary-update', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: tripType,
                  packageId: hourlyPackage,
                  fare: price,
                  source: 'direct-api',
                  timestamp: now
                }
              }));
            }
            
            return price;
          }
        }
        
        return null;
      } catch (error) {
        console.error(`Error fetching fare from database: ${error}`);
        return null;
      }
    };
    
    fetchFareFromDatabase();
  }, [tripType, selectedCabId, hourlyPackage, totalPrice, lastSyncTime, lastFetchAttempt]);
  
  // Listen for cab selection events to immediately update fare
  useEffect(() => {
    const handleCabSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, cabName, fare, packageId } = customEvent.detail;
        
        if (selectedCabId === cabName || selectedCabId === cabId) {
          console.log(`BookingSummaryHelper: Cab selected: ${cabName} with fare ${fare}`);
          
          // Temporary disable overrides to prevent conflicts
          setDisableOverrides(true);
          setTimeout(() => setDisableOverrides(false), 1000);
          
          // Dispatch booking summary update event
          window.dispatchEvent(new CustomEvent('booking-summary-update', {
            detail: {
              cabId: cabId,
              tripType: tripType,
              packageId: packageId,
              cabName: cabName,
              fare: fare,
              source: 'cab-selection',
              timestamp: Date.now()
            }
          }));
        }
      }
    };
    
    window.addEventListener('cab-selected', handleCabSelected as EventListener);
    
    return () => {
      window.removeEventListener('cab-selected', handleCabSelected as EventListener);
    };
  }, [selectedCabId, tripType]);
  
  // Listen for package selection changes
  useEffect(() => {
    const handlePackageSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId) {
        const { packageId } = customEvent.detail;
        console.log(`BookingSummaryHelper: Package selected: ${packageId}`);
        
        // After package selection, force a fare check after a short delay
        // to ensure the fare is updated for the new package
        if (selectedCabId) {
          setTimeout(() => {
            setLastFetchAttempt(0); // Reset to trigger a fetch
          }, 500);
        }
      }
    };
    
    window.addEventListener('hourly-package-selected', handlePackageSelected as EventListener);
    
    return () => {
      window.removeEventListener('hourly-package-selected', handlePackageSelected as EventListener);
    };
  }, [selectedCabId]);

  // This component doesn't render anything visible
  return null;
};
