
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
  const [fetchedFare, setFetchedFare] = useState<number | null>(null);
  const [lastFetchAttempt, setLastFetchAttempt] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [fareSource, setFareSource] = useState<string>('');

  useEffect(() => {
    // Listen for fare source updates to track where fares are coming from
    const handleFareSourceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.source) {
        const { cabId, source, apiUrl } = customEvent.detail;
        if (selectedCabId && cabId === selectedCabId.toLowerCase().replace(/\s+/g, '_')) {
          console.log(`BookingSummaryHelper: Tracked fare source for ${cabId} is ${source} via ${apiUrl || 'N/A'}`);
          setFareSource(source);
        }
      }
    };

    window.addEventListener('fare-source-update', handleFareSourceUpdate as EventListener);
    
    return () => {
      window.removeEventListener('fare-source-update', handleFareSourceUpdate as EventListener);
    };
  }, [selectedCabId]);

  useEffect(() => {
    // Don't do anything if we don't have a selected cab
    if (!selectedCabId) return;
    
    // For local trips, first check if there's a selected fare in localStorage
    if (tripType === 'local' && hourlyPackage) {
      const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
      
      // HIGHEST PRIORITY: Check if there's a selected fare from CabList
      const selectedFareKey = `selected_fare_${normalizedCabId}_${hourlyPackage}`;
      const selectedFare = localStorage.getItem(selectedFareKey);
      
      if (selectedFare) {
        const parsedFare = parseFloat(selectedFare);
        if (!isNaN(parsedFare) && parsedFare > 0) {
          console.log(`BookingSummaryHelper: Using selected fare from CabList: ₹${parsedFare} for ${normalizedCabId}`);
          setFetchedFare(parsedFare);
          setFareSource('cab-list-selection');
          
          // If the booking summary price differs from the cab selection price, update it
          if (Math.abs(parsedFare - totalPrice) > 10) {
            console.log(`BookingSummaryHelper: CabList selected price (${parsedFare}) differs from current price (${totalPrice}), updating booking summary`);
            
            // Broadcast the update to ensure consistency
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                packageId: hourlyPackage,
                fare: parsedFare,
                source: 'cab-list-selected',
                timestamp: Date.now()
              }
            }));
            
            // Also update the regular fare cache for consistency
            localStorage.setItem(`fare_local_${normalizedCabId}`, parsedFare.toString());
          }
          
          return; // Skip API fetching if we have a valid selected fare
        }
      }
      
      // Set a timestamp for this fetch attempt
      const currentTime = Date.now();
      setLastFetchAttempt(currentTime);
      
      // Create an array of fetch attempts to try in order - EXACTLY MATCH CabList ORDER
      const fetchAttempts = [
        // First try: direct-booking-data.php - primary API
        async () => {
          try {
            console.log(`BookingSummaryHelper: Fetching fare from primary API for ${normalizedCabId} - ${hourlyPackage}`);
            const apiUrl = getApiUrl(`api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedCabId}&package_id=${hourlyPackage}`);
            
            const response = await axios.get(apiUrl, {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'X-Force-Refresh': 'true'
              },
              timeout: 8000
            });
            
            if (response.data && response.data.status === 'success' && response.data.price) {
              const price = Number(response.data.price);
              if (price > 0) {
                console.log(`BookingSummaryHelper: Retrieved fare from primary API: ₹${price} for ${normalizedCabId} - ${hourlyPackage}`);
                
                // Store this as the selected fare for consistency
                localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, price.toString());
                localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
                
                return { price, source: 'direct-booking-data' };
              }
            } else if (response.data && response.data.data) {
              // Handle alternative response format
              const data = response.data.data;
              let price = 0;
              
              if (hourlyPackage.includes('4hrs-40km') && data.price4hrs40km) {
                price = Number(data.price4hrs40km);
              } else if (hourlyPackage.includes('8hrs-80km') && data.price8hrs80km) {
                price = Number(data.price8hrs80km);
              } else if (hourlyPackage.includes('10hrs-100km') && data.price10hrs100km) {
                price = Number(data.price10hrs100km);
              }
              
              if (price > 0) {
                console.log(`BookingSummaryHelper: Retrieved fare from alternate format: ₹${price} for ${normalizedCabId} - ${hourlyPackage}`);
                
                // Store this as the selected fare for consistency
                localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, price.toString());
                localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
                
                return { price, source: 'direct-booking-data-alternate' };
              }
            }
            
            return null;
          } catch (error) {
            console.error('Error fetching from primary API:', error);
            return null;
          }
        },
        
        // Second try: local-package-fares.php
        async () => {
          try {
            console.log(`BookingSummaryHelper: Trying local-package-fares API for ${normalizedCabId} - ${hourlyPackage}`);
            const apiUrl = getApiUrl(`api/local-package-fares.php?vehicle_id=${normalizedCabId}&package_id=${hourlyPackage}`);
            
            const response = await axios.get(apiUrl, {
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
                console.log(`BookingSummaryHelper: Retrieved fare from local-package-fares API: ₹${price} for ${normalizedCabId} - ${hourlyPackage}`);
                
                // Store this as the selected fare for consistency
                localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, price.toString());
                localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
                
                return { price, source: 'local-package-fares' };
              }
            }
            
            return null;
          } catch (error) {
            console.error('Error fetching from local-package-fares:', error);
            return null;
          }
        },
        
        // Third try: direct-local-fares.php 
        async () => {
          try {
            console.log(`BookingSummaryHelper: Trying fallback API for ${normalizedCabId}`);
            const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
            
            const response = await axios.get(apiUrl, {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'X-Force-Refresh': 'true'
              },
              timeout: 5000
            });
            
            if (response.data && response.data.fares) {
              const fareData = response.data.fares[normalizedCabId];
              
              // Extract the right price for the selected package
              let price = 0;
              if (hourlyPackage.includes('4hrs-40km')) {
                price = Number(fareData?.price4hrs40km || 0);
              } else if (hourlyPackage.includes('8hrs-80km')) {
                price = Number(fareData?.price8hrs80km || 0);
              } else if (hourlyPackage.includes('10hrs-100km')) {
                price = Number(fareData?.price10hrs100km || 0);
              }
              
              if (price > 0) {
                console.log(`BookingSummaryHelper: Retrieved fare from fallback endpoint: ₹${price}`);
                
                // Store this as the selected fare for consistency
                localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, price.toString());
                localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
                
                return { price, source: 'direct-local-fares' };
              }
            }
            
            return null;
          } catch (error) {
            console.error('Error fetching from fallback endpoint:', error);
            return null;
          }
        },
        
        // Last resort: use direct calculation - IDENTICAL to the one in CabList
        async () => {
          console.log(`BookingSummaryHelper: Using direct calculation for ${normalizedCabId} - ${hourlyPackage}`);
          
          // Base prices for different vehicle types (IDENTICAL to CabList's fallback)
          const basePrices: Record<string, Record<string, number>> = {
            'sedan': {
              '4hrs-40km': 2400,
              '8hrs-80km': 3000,
              '10hrs-100km': 3500
            },
            'ertiga': {
              '4hrs-40km': 2800,
              '8hrs-80km': 3500,
              '10hrs-100km': 4000
            },
            'innova_crysta': {
              '4hrs-40km': 3200,
              '8hrs-80km': 4000,
              '10hrs-100km': 4500
            },
            'innova_hycross': {
              '4hrs-40km': 3600,
              '8hrs-80km': 4500,
              '10hrs-100km': 5000
            },
            'dzire_cng': {
              '4hrs-40km': 2400,
              '8hrs-80km': 3000,
              '10hrs-100km': 3500
            },
            'tempo_traveller': {
              '4hrs-40km': 4000,
              '8hrs-80km': 5500,
              '10hrs-100km': 7000
            },
            'mpv': {
              '4hrs-40km': 3600,
              '8hrs-80km': 4500,
              '10hrs-100km': 5000
            },
            'etios': {
              '4hrs-40km': 2400,
              '8hrs-80km': 3000,
              '10hrs-100km': 3500
            }
          };
          
          // Determine vehicle category
          let vehicleCategory = normalizedCabId;
          
          // Fallback to matched category if not found directly
          if (!basePrices[vehicleCategory]) {
            if (vehicleCategory.includes('ertiga')) {
              vehicleCategory = 'ertiga';
            } else if (vehicleCategory.includes('innova')) {
              if (vehicleCategory.includes('hycross') || vehicleCategory.includes('mpv')) {
                vehicleCategory = 'innova_hycross';
              } else {
                vehicleCategory = 'innova_crysta';
              }
            } else if (vehicleCategory.includes('cng') || vehicleCategory.includes('dzire')) {
              vehicleCategory = 'dzire_cng';
            } else if (vehicleCategory.includes('tempo') || vehicleCategory.includes('traveller')) {
              vehicleCategory = 'tempo_traveller';
            } else if (vehicleCategory.includes('mpv')) {
              vehicleCategory = 'innova_hycross'; // Treat MPV as Innova Hycross
            } else {
              vehicleCategory = 'sedan'; // default
            }
          }
          
          // Get price for the package
          let packageKey = '';
          if (hourlyPackage.includes('4hrs-40km')) {
            packageKey = '4hrs-40km';
          } else if (hourlyPackage.includes('8hrs-80km')) {
            packageKey = '8hrs-80km';
          } else if (hourlyPackage.includes('10hrs-100km')) {
            packageKey = '10hrs-100km';
          }
          
          if (basePrices[vehicleCategory] && basePrices[vehicleCategory][packageKey]) {
            const price = basePrices[vehicleCategory][packageKey];
            console.log(`BookingSummaryHelper: Calculated fare using fallback method: ₹${price}`);
            
            // Store this as the selected fare for consistency
            localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, price.toString());
            localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
            
            return { price, source: 'direct-calculation' };
          }
          
          return null;
        }
      ];
      
      // Execute the fetch attempts
      const fetchFareFromDatabase = async () => {
        // Try each fetch method in order until one succeeds (EXACTLY matching CabList order)
        for (const attempt of fetchAttempts) {
          const result = await attempt();
          if (result && result.price > 0) {
            return result;
          }
        }
        return null;
      };
      
      // Trigger the fetch
      fetchFareFromDatabase().then(result => {
        if (result && result.price > 0) {
          setFetchedFare(result.price);
          setFareSource(result.source);
          
          // Dispatch a global fare update event to synchronize all components
          window.dispatchEvent(new CustomEvent('global-fare-update', {
            detail: {
              cabId: normalizedCabId,
              tripType: 'local',
              packageId: hourlyPackage,
              fare: result.price,
              source: `direct-api-${result.source}`,
              timestamp: currentTime
            }
          }));
          
          // Store in localStorage for persistence
          try {
            // Regular booking fare cache
            localStorage.setItem(`fare_${tripType}_${normalizedCabId}`, result.price.toString());
            
            // Also store as selected fare for that specific package
            localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, result.price.toString());
          } catch (error) {
            console.error('Error storing fare in localStorage:', error);
          }
          
          // If current total price is significantly different from fetched price, dispatch an update
          if (Math.abs(result.price - totalPrice) > 10) {
            console.log(`BookingSummaryHelper: Database price (${result.price}) differs from component price (${totalPrice}), updating booking summary`);
            
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                packageId: hourlyPackage,
                fare: result.price,
                source: result.source,
                timestamp: currentTime
              }
            }));
            
            // Additional alert to make the price change more noticeable
            toast.info(`Updated price for ${normalizedCabId.replace(/_/g, ' ')}: ₹${result.price}`, {
              duration: 3000,
              id: `price-update-${normalizedCabId}`
            });
          }
        } else {
          console.log(`BookingSummaryHelper: No fare could be fetched for ${normalizedCabId} with package ${hourlyPackage}`);
        }
      });
    }
  }, [tripType, selectedCabId, hourlyPackage, retryCount, totalPrice]);
  
  // Listen for changes to the total price and retrigger fare check if needed
  useEffect(() => {
    if (selectedCabId && tripType === 'local' && hourlyPackage) {
      // Check if the total price is significantly different from what we fetched
      if (fetchedFare && Math.abs(fetchedFare - totalPrice) > 10) {
        // If it's been at least 3 seconds since our last fetch attempt, try again
        if (Date.now() - lastFetchAttempt > 3000) {
          console.log(`BookingSummaryHelper: Detected price mismatch, retrying fetch. Current: ${totalPrice}, Fetched: ${fetchedFare}`);
          setRetryCount(prev => prev + 1);
        }
      }
    }
  }, [totalPrice, fetchedFare, selectedCabId, tripType, hourlyPackage, lastFetchAttempt]);
  
  // This component doesn't render anything visible
  return null;
};
