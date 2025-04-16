
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

  // This effect handles package selection changes and fare updates
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
      
      // If no valid cached fare, attempt to fetch from API
      const currentTime = Date.now();
      setLastFetchAttempt(currentTime);
      
      const fetchFare = async () => {
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
              
              setFetchedFare(price);
              setFareSource('direct-booking-data');
              
              // Store the fare in localStorage for future reference
              localStorage.setItem(selectedFareKey, price.toString());
              localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
              
              // If current total price is significantly different from fetched price, dispatch an update
              if (Math.abs(price - totalPrice) > 10) {
                dispatchFareUpdate(normalizedCabId, price, hourlyPackage, 'direct-booking-data');
              }
              
              return;
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
              
              setFetchedFare(price);
              setFareSource('direct-booking-data-alternate');
              
              // Store the fare in localStorage for future reference
              localStorage.setItem(selectedFareKey, price.toString());
              localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
              
              // If current total price is significantly different from fetched price, dispatch an update
              if (Math.abs(price - totalPrice) > 10) {
                dispatchFareUpdate(normalizedCabId, price, hourlyPackage, 'direct-booking-data-alternate');
              }
              
              return;
            }
          }
          
          // Try local-package-fares.php as backup
          console.log(`BookingSummaryHelper: Trying local-package-fares API for ${normalizedCabId} - ${hourlyPackage}`);
          const backupApiUrl = getApiUrl(`api/local-package-fares.php?vehicle_id=${normalizedCabId}&package_id=${hourlyPackage}`);
          
          const backupResponse = await axios.get(backupApiUrl, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            },
            timeout: 5000
          });
          
          if (backupResponse.data && backupResponse.data.status === 'success' && backupResponse.data.price) {
            const price = Number(backupResponse.data.price);
            if (price > 0) {
              console.log(`BookingSummaryHelper: Retrieved fare from local-package-fares API: ₹${price} for ${normalizedCabId} - ${hourlyPackage}`);
              
              setFetchedFare(price);
              setFareSource('local-package-fares');
              
              // Store the fare in localStorage for future reference
              localStorage.setItem(selectedFareKey, price.toString());
              localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
              
              // If current total price is significantly different from fetched price, dispatch an update
              if (Math.abs(price - totalPrice) > 10) {
                dispatchFareUpdate(normalizedCabId, price, hourlyPackage, 'local-package-fares');
              }
              
              return;
            }
          }
          
          // Try fallback to direct-local-fares.php as last resort
          console.log(`BookingSummaryHelper: Trying fallback API for ${normalizedCabId}`);
          const fallbackApiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
          
          const fallbackResponse = await axios.get(fallbackApiUrl, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            },
            timeout: 5000
          });
          
          if (fallbackResponse.data && fallbackResponse.data.fares) {
            // Handle API response format (array or object)
            let fareData;
            if (Array.isArray(fallbackResponse.data.fares)) {
              // Find the matching vehicle in the array
              fareData = fallbackResponse.data.fares.find((fare: any) => 
                fare.vehicleId?.toLowerCase() === normalizedCabId || 
                fare.vehicle_id?.toLowerCase() === normalizedCabId
              );
            } else {
              // Direct object mapping by vehicle ID
              fareData = fallbackResponse.data.fares[normalizedCabId];
            }
            
            if (fareData) {
              let price = 0;
              
              if (hourlyPackage.includes('4hrs-40km') && fareData.price4hrs40km) {
                price = Number(fareData.price4hrs40km);
              } else if (hourlyPackage.includes('8hrs-80km') && fareData.price8hrs80km) {
                price = Number(fareData.price8hrs80km);
              } else if (hourlyPackage.includes('10hrs-100km') && fareData.price10hrs100km) {
                price = Number(fareData.price10hrs100km);
              }
              
              if (price > 0) {
                console.log(`BookingSummaryHelper: Retrieved fare from fallback API: ₹${price} for ${normalizedCabId} - ${hourlyPackage}`);
                
                setFetchedFare(price);
                setFareSource('direct-local-fares');
                
                // Store the fare in localStorage for future reference
                localStorage.setItem(selectedFareKey, price.toString());
                localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
                
                // If current total price is significantly different from fetched price, dispatch an update
                if (Math.abs(price - totalPrice) > 10) {
                  dispatchFareUpdate(normalizedCabId, price, hourlyPackage, 'direct-local-fares');
                }
                
                return;
              }
            }
          }
          
          // If all API calls fail, use fallback calculation
          const calculatedPrice = calculateDynamicPriceForVehicle(normalizedCabId, hourlyPackage);
          if (calculatedPrice > 0) {
            console.log(`BookingSummaryHelper: Using fallback calculation: ₹${calculatedPrice} for ${normalizedCabId} - ${hourlyPackage}`);
            
            setFetchedFare(calculatedPrice);
            setFareSource('fallback-calculation');
            
            // Store the calculated fare in localStorage
            localStorage.setItem(selectedFareKey, calculatedPrice.toString());
            localStorage.setItem(`fare_local_${normalizedCabId}`, calculatedPrice.toString());
            
            // If current total price is significantly different from calculated price, dispatch an update
            if (Math.abs(calculatedPrice - totalPrice) > 10) {
              dispatchFareUpdate(normalizedCabId, calculatedPrice, hourlyPackage, 'fallback-calculation');
            }
          }
        } catch (error) {
          console.error('BookingSummaryHelper: Error fetching fare:', error);
          
          // On error, try the fallback calculation
          const calculatedPrice = calculateDynamicPriceForVehicle(normalizedCabId, hourlyPackage);
          if (calculatedPrice > 0) {
            console.log(`BookingSummaryHelper: Using fallback calculation after error: ₹${calculatedPrice}`);
            
            setFetchedFare(calculatedPrice);
            setFareSource('error-fallback-calculation');
            
            // Store the calculated fare in localStorage
            localStorage.setItem(selectedFareKey, calculatedPrice.toString());
            localStorage.setItem(`fare_local_${normalizedCabId}`, calculatedPrice.toString());
            
            // If current total price is significantly different from calculated price, dispatch an update
            if (Math.abs(calculatedPrice - totalPrice) > 10) {
              dispatchFareUpdate(normalizedCabId, calculatedPrice, hourlyPackage, 'error-fallback-calculation');
            }
          }
        }
      };
      
      fetchFare();
    }
  }, [tripType, selectedCabId, hourlyPackage, retryCount, totalPrice]);
  
  // Listen for hourly package changes
  useEffect(() => {
    const handleHourlyPackageSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId && selectedCabId) {
        console.log(`BookingSummaryHelper: Detected hourly package change to ${customEvent.detail.packageId}`);
        // Trigger a retry to fetch new price for the updated package
        setRetryCount(prev => prev + 1);
      }
    };
    
    window.addEventListener('hourly-package-selected', handleHourlyPackageSelected as EventListener);
    
    return () => {
      window.removeEventListener('hourly-package-selected', handleHourlyPackageSelected as EventListener);
    };
  }, [selectedCabId]);
  
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
  
  // Helper function to dispatch fare update events
  const dispatchFareUpdate = (cabId: string, fare: number, packageId: string, source: string) => {
    console.log(`BookingSummaryHelper: Database price (${fare}) differs from component price (${totalPrice}), updating booking summary`);
    
    window.dispatchEvent(new CustomEvent('booking-summary-update', {
      detail: {
        cabId: cabId,
        tripType: 'local',
        packageId: packageId,
        fare: fare,
        source: source,
        timestamp: Date.now()
      }
    }));
    
    // Also dispatch a global fare update
    window.dispatchEvent(new CustomEvent('global-fare-update', {
      detail: {
        cabId: cabId,
        tripType: 'local',
        packageId: packageId,
        fare: fare,
        source: `booking-summary-${source}`,
        timestamp: Date.now() + 1
      }
    }));
    
    // Additional alert to make the price change more noticeable
    toast.info(`Updated price for ${cabId.replace(/_/g, ' ')}: ₹${fare}`, {
      duration: 3000,
      id: `price-update-${cabId}`
    });
  };
  
  // Helper function to calculate dynamic price when not in database
  const calculateDynamicPriceForVehicle = (vehicleId: string, packageId: string): number => {
    // Base prices for different vehicle types
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
      },
      'amaze': {
        '4hrs-40km': 2400,
        '8hrs-80km': 3000,
        '10hrs-100km': 3500
      },
      'bus': {
        '4hrs-40km': 4000,
        '8hrs-80km': 7000,
        '10hrs-100km': 9000
      }
    };
    
    // Determine vehicle category
    let vehicleCategory = vehicleId;
    
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
        vehicleCategory = 'mpv';
      } else if (vehicleCategory.includes('urbania')) {
        vehicleCategory = 'bus';
      } else if (vehicleCategory.includes('amaze')) {
        vehicleCategory = 'amaze';
      } else if (vehicleCategory.includes('etios') || vehicleCategory.includes('toyota')) {
        vehicleCategory = 'etios';
      } else {
        vehicleCategory = 'sedan'; // default
      }
    }
    
    // Get price for the package
    let packageKey = '';
    if (packageId.includes('4hrs-40km')) {
      packageKey = '4hrs-40km';
    } else if (packageId.includes('8hrs-80km')) {
      packageKey = '8hrs-80km';
    } else if (packageId.includes('10hrs-100km')) {
      packageKey = '10hrs-100km';
    }
    
    if (basePrices[vehicleCategory] && basePrices[vehicleCategory][packageKey]) {
      return basePrices[vehicleCategory][packageKey];
    }
    
    // Default fallback
    return 0;
  };
  
  // This component doesn't render anything visible
  return null;
};
