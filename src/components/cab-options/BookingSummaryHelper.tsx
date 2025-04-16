
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
  const [currentPackage, setCurrentPackage] = useState<string | undefined>(hourlyPackage);

  // Listen for package changes specifically
  useEffect(() => {
    const handleBookingPackageChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId) {
        const { packageId } = customEvent.detail;
        console.log(`BookingSummaryHelper: Detected package change to ${packageId}`);
        
        // Update our current package
        setCurrentPackage(packageId);
        
        // Trigger a retry to get new price for updated package
        setRetryCount(prev => prev + 1);
        
        // Force clear any selected fare data for consistency
        try {
          if (selectedCabId) {
            const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
            const selectedFareKey = `selected_fare_${normalizedCabId}_${packageId}`;
            
            // Clear localStorage for previous package
            if (hourlyPackage && hourlyPackage !== packageId) {
              const prevSelectedFareKey = `selected_fare_${normalizedCabId}_${hourlyPackage}`;
              localStorage.removeItem(prevSelectedFareKey);
              console.log(`BookingSummaryHelper: Cleared previous package fare: ${prevSelectedFareKey}`);
            }
            
            // Immediately dispatch an event to notify all components about package change
            window.dispatchEvent(new CustomEvent('booking-summary-package-update', {
              detail: {
                cabId: normalizedCabId,
                packageId: packageId,
                previousPackage: hourlyPackage,
                source: 'booking-summary-helper',
                timestamp: Date.now()
              }
            }));
          }
        } catch (error) {
          console.error('Error handling package change:', error);
        }
      }
    };
    
    window.addEventListener('booking-package-changed', handleBookingPackageChanged as EventListener);
    
    return () => {
      window.removeEventListener('booking-package-changed', handleBookingPackageChanged as EventListener);
    };
  }, [selectedCabId, hourlyPackage]);

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
    
    // Always use current package from state if available (to handle package changes)
    const packageToUse = currentPackage || hourlyPackage;
    
    // For local trips, first check if there's a selected fare in localStorage
    if (tripType === 'local' && packageToUse) {
      const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
      
      // HIGHEST PRIORITY: Check if there's a selected fare from CabList
      const selectedFareKey = `selected_fare_${normalizedCabId}_${packageToUse}`;
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
                packageId: packageToUse,
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
          console.log(`BookingSummaryHelper: Fetching fare from primary API for ${normalizedCabId} - ${packageToUse}`);
          const apiUrl = getApiUrl(`api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedCabId}&package_id=${packageToUse}`);
          
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
              console.log(`BookingSummaryHelper: Retrieved fare from primary API: ₹${price} for ${normalizedCabId} - ${packageToUse}`);
              
              setFetchedFare(price);
              setFareSource('direct-booking-data');
              
              // Store the fare in localStorage for future reference
              localStorage.setItem(selectedFareKey, price.toString());
              localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
              
              // If current total price is significantly different from fetched price, dispatch an update
              if (Math.abs(price - totalPrice) > 10) {
                dispatchFareUpdate(normalizedCabId, price, packageToUse, 'direct-booking-data');
              }
              
              return;
            }
          } else if (response.data && response.data.data) {
            // Handle alternative response format
            const data = response.data.data;
            let price = 0;
            
            if (packageToUse.includes('4hrs-40km') && data.price4hrs40km) {
              price = Number(data.price4hrs40km);
            } else if (packageToUse.includes('8hrs-80km') && data.price8hrs80km) {
              price = Number(data.price8hrs80km);
            } else if (packageToUse.includes('10hrs-100km') && data.price10hrs100km) {
              price = Number(data.price10hrs100km);
            }
            
            if (price > 0) {
              console.log(`BookingSummaryHelper: Retrieved fare from alternate format: ₹${price} for ${normalizedCabId} - ${packageToUse}`);
              
              setFetchedFare(price);
              setFareSource('direct-booking-data-alternate');
              
              // Store the fare in localStorage for future reference
              localStorage.setItem(selectedFareKey, price.toString());
              localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
              
              // If current total price is significantly different from fetched price, dispatch an update
              if (Math.abs(price - totalPrice) > 10) {
                dispatchFareUpdate(normalizedCabId, price, packageToUse, 'direct-booking-data-alternate');
              }
              
              return;
            }
          }
          
          // Try local-package-fares.php as backup
          console.log(`BookingSummaryHelper: Trying local-package-fares API for ${normalizedCabId} - ${packageToUse}`);
          const backupApiUrl = getApiUrl(`api/local-package-fares.php?vehicle_id=${normalizedCabId}&package_id=${packageToUse}`);
          
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
              console.log(`BookingSummaryHelper: Retrieved fare from local-package-fares API: ₹${price} for ${normalizedCabId} - ${packageToUse}`);
              
              setFetchedFare(price);
              setFareSource('local-package-fares');
              
              // Store the fare in localStorage for future reference
              localStorage.setItem(selectedFareKey, price.toString());
              localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
              
              // If current total price is significantly different from fetched price, dispatch an update
              if (Math.abs(price - totalPrice) > 10) {
                dispatchFareUpdate(normalizedCabId, price, packageToUse, 'local-package-fares');
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
              
              if (packageToUse.includes('4hrs-40km') && fareData.price4hrs40km) {
                price = Number(fareData.price4hrs40km);
              } else if (packageToUse.includes('8hrs-80km') && fareData.price8hrs80km) {
                price = Number(fareData.price8hrs80km);
              } else if (packageToUse.includes('10hrs-100km') && fareData.price10hrs100km) {
                price = Number(fareData.price10hrs100km);
              }
              
              if (price > 0) {
                console.log(`BookingSummaryHelper: Retrieved fare from fallback API: ₹${price} for ${normalizedCabId} - ${packageToUse}`);
                
                setFetchedFare(price);
                setFareSource('direct-local-fares');
                
                // Store the fare in localStorage for future reference
                localStorage.setItem(selectedFareKey, price.toString());
                localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
                
                // If current total price is significantly different from fetched price, dispatch an update
                if (Math.abs(price - totalPrice) > 10) {
                  dispatchFareUpdate(normalizedCabId, price, packageToUse, 'direct-local-fares');
                }
                
                return;
              }
            }
          }
          
          // If all API calls fail, use fallback calculation
          const calculatedPrice = calculateDynamicPriceForVehicle(normalizedCabId, packageToUse);
          if (calculatedPrice > 0) {
            console.log(`BookingSummaryHelper: Using fallback calculation: ₹${calculatedPrice} for ${normalizedCabId} - ${packageToUse}`);
            
            setFetchedFare(calculatedPrice);
            setFareSource('fallback-calculation');
            
            // Store the calculated fare in localStorage
            localStorage.setItem(selectedFareKey, calculatedPrice.toString());
            localStorage.setItem(`fare_local_${normalizedCabId}`, calculatedPrice.toString());
            
            // If current total price is significantly different from calculated price, dispatch an update
            if (Math.abs(calculatedPrice - totalPrice) > 10) {
              dispatchFareUpdate(normalizedCabId, calculatedPrice, packageToUse, 'fallback-calculation');
            }
          }
        } catch (error) {
          console.error('BookingSummaryHelper: Error fetching fare:', error);
          
          // On error, try the fallback calculation
          const calculatedPrice = calculateDynamicPriceForVehicle(normalizedCabId, packageToUse);
          if (calculatedPrice > 0) {
            console.log(`BookingSummaryHelper: Using fallback calculation after error: ₹${calculatedPrice}`);
            
            setFetchedFare(calculatedPrice);
            setFareSource('error-fallback-calculation');
            
            // Store the calculated fare in localStorage
            localStorage.setItem(selectedFareKey, calculatedPrice.toString());
            localStorage.setItem(`fare_local_${normalizedCabId}`, calculatedPrice.toString());
            
            // If current total price is significantly different from calculated price, dispatch an update
            if (Math.abs(calculatedPrice - totalPrice) > 10) {
              dispatchFareUpdate(normalizedCabId, calculatedPrice, packageToUse, 'error-fallback-calculation');
            }
          }
        }
      };
      
      fetchFare();
    }
  }, [tripType, selectedCabId, hourlyPackage, retryCount, totalPrice, currentPackage]);
  
  // Listen for hourly package changes
  useEffect(() => {
    const handleHourlyPackageSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId && selectedCabId) {
        const newPackageId = customEvent.detail.packageId;
        console.log(`BookingSummaryHelper: Detected hourly package change to ${newPackageId}`);
        
        // Update our current package state
        setCurrentPackage(newPackageId);
        
        // Force clear any selected fare data for consistency
        try {
          const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
          
          // Clear localStorage for old packages
          if (hourlyPackage && hourlyPackage !== newPackageId) {
            const prevSelectedFareKey = `selected_fare_${normalizedCabId}_${hourlyPackage}`;
            localStorage.removeItem(prevSelectedFareKey);
            console.log(`BookingSummaryHelper: Cleared previous package fare: ${prevSelectedFareKey}`);
          }
        } catch (error) {
          console.error('Error clearing fare cache:', error);
        }
        
        // Trigger a retry to fetch new price for the updated package
        setRetryCount(prev => prev + 1);
      }
    };
    
    window.addEventListener('hourly-package-selected', handleHourlyPackageSelected as EventListener);
    
    return () => {
      window.removeEventListener('hourly-package-selected', handleHourlyPackageSelected as EventListener);
    };
  }, [selectedCabId, hourlyPackage]);
  
  // Listen for changes to the total price and retrigger fare check if needed
  useEffect(() => {
    // Use current package from state if available (to handle package changes)
    const packageToUse = currentPackage || hourlyPackage;
    
    if (selectedCabId && tripType === 'local' && packageToUse) {
      // Check if the total price is significantly different from what we fetched
      if (fetchedFare && Math.abs(fetchedFare - totalPrice) > 10) {
        // If it's been at least 3 seconds since our last fetch attempt, try again
        if (Date.now() - lastFetchAttempt > 3000) {
          console.log(`BookingSummaryHelper: Detected price mismatch, retrying fetch. Current: ${totalPrice}, Fetched: ${fetchedFare}`);
          setRetryCount(prev => prev + 1);
        }
      }
    }
  }, [totalPrice, fetchedFare, selectedCabId, tripType, hourlyPackage, lastFetchAttempt, currentPackage]);
  
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
    
    // Also specifically update the booking summary display
    window.dispatchEvent(new CustomEvent('booking-summary-package-update', {
      detail: {
        cabId: cabId,
        packageId: packageId,
        fare: fare,
        source: source,
        timestamp: Date.now() + 2
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
