
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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Don't do anything if we don't have a selected cab
    if (!selectedCabId || tripType !== 'local' || !hourlyPackage) return;
    
    const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
    const currentTime = Date.now();
    setLastFetchAttempt(currentTime);

    // Directly fetch from the API endpoint
    const fetchFareDirectly = async () => {
      try {
        console.log(`BookingSummary: Fetching local fares for vehicle ${normalizedCabId} with timestamp: ${currentTime}`);
        const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
        
        const response = await axios.get(apiUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          },
          timeout: 5000
        });
        
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
            console.log(`Retrieved fare directly from database API: ₹${price}`);
            
            // Broadcast the update to ensure consistency
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                packageId: hourlyPackage,
                fare: price,
                source: 'direct-api',
                timestamp: currentTime
              }
            }));
          } else {
            console.warn(`No valid price found for ${normalizedCabId} with package ${hourlyPackage}`);
          }
        } else {
          console.warn(`No fare data returned for ${normalizedCabId}`);
        }
      } catch (error) {
        console.error('Error fetching fare from direct API:', error);
      }
    };
    
    // Execute the direct fetch
    fetchFareDirectly();
    
  }, [tripType, selectedCabId, hourlyPackage, retryCount]);
  
  // Listen for updates from CabList component when a cab is selected
  useEffect(() => {
    const handleCabSelection = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, tripType: eventTripType, packageId } = customEvent.detail;
        
        if (selectedCabId && cabId === selectedCabId.toLowerCase().replace(/\s+/g, '_') && 
            eventTripType === 'local' && packageId === hourlyPackage) {
          
          // Trigger an immediate booking summary update with the selected fare
          window.dispatchEvent(new CustomEvent('booking-summary-update', {
            detail: {
              cabId,
              tripType: 'local',
              packageId: hourlyPackage,
              fare,
              source: 'cab-selection',
              timestamp: Date.now()
            }
          }));
        }
      }
    };
    
    window.addEventListener('cab-selected', handleCabSelection as EventListener);
    
    return () => {
      window.removeEventListener('cab-selected', handleCabSelection as EventListener);
    };
  }, [selectedCabId, hourlyPackage]);
  
  // If current price is significantly different, trigger a re-fetch
  useEffect(() => {
    if (selectedCabId && tripType === 'local' && hourlyPackage) {
      // Check if it's been at least 5 seconds since our last fetch attempt
      if (Date.now() - lastFetchAttempt > 5000) {
        setRetryCount(prev => prev + 1);
      }
    }
  }, [totalPrice, selectedCabId, tripType, hourlyPackage, lastFetchAttempt]);
  
  // This component doesn't render anything visible
  return null;
};
