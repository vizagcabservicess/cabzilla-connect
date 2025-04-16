
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { normalizeVehicleId, normalizePackageId } from '@/config/requestConfig';

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
  
  // Throttling mechanism to prevent excessive updates
  const updateThrottleTimeRef = useRef<number>(0);
  const pendingFareRef = useRef<number | null>(null);
  const activeRequestRef = useRef<boolean>(false);
  const currentCabRef = useRef<string | null>(null);
  const requestRetryCount = useRef<Record<string, number>>({});
  
  // Log props for debugging
  useEffect(() => {
    console.log("🚧 BookingSummaryHelper Active Props →", {
      cab: selectedCabId,
      pkg: hourlyPackage,
      fare: totalPrice
    });
    
    // Update current cab ref when selectedCabId changes
    if (selectedCabId && selectedCabId !== currentCabRef.current) {
      currentCabRef.current = selectedCabId;
      // Force a new fetch when cab changes
      setLastFetchAttempt(0);
      
      // Log the normalized vehicle ID for debugging
      const normalizedCabId = normalizeVehicleId(selectedCabId);
      console.log(`BookingSummaryHelper: Cab changed to ${selectedCabId}, normalized to ${normalizedCabId}`);
    }
  }, [selectedCabId, hourlyPackage, totalPrice]);
  
  // Core synchronization logic - respects the latest selected fare
  useEffect(() => {
    if (!selectedCabId || !tripType) return;
    if (tripType === 'local' && !hourlyPackage) return;
    
    // Prevent excessive sync attempts (throttle to once per 1.5 seconds)
    const now = Date.now();
    if (now - lastSyncTime < 1500) {
      pendingFareRef.current = totalPrice;
      return;
    }
    
    setLastSyncTime(now);
    pendingFareRef.current = null;

    // Normalize the cab ID and package ID for consistency
    const normalizedCabId = normalizeVehicleId(selectedCabId);
    const normalizedPackageId = hourlyPackage ? normalizePackageId(hourlyPackage) : '';
    
    console.log(`BookingSummaryHelper: Checking fare consistency for ${normalizedCabId} with ${normalizedPackageId}`);
    console.log(`BookingSummaryHelper: Original cab ID: ${selectedCabId}`);
    
    // Check if we should override based on time since last fetch
    const shouldFetch = now - lastFetchAttempt > 3000 && !activeRequestRef.current;
    
    // Get the selected fare from CabList's selection event
    let selectedFareKey = '';
    
    if (tripType === 'local' && hourlyPackage) {
      selectedFareKey = `selected_fare_${normalizedCabId}_${normalizedPackageId}`;
    } else {
      selectedFareKey = `fare_${tripType}_${normalizedCabId.toLowerCase().replace(/\s+/g, '')}`;
    }
    
    const selectedFare = localStorage.getItem(selectedFareKey);
    
    if (selectedFare) {
      const parsedFare = parseFloat(selectedFare);
      if (!isNaN(parsedFare) && parsedFare > 0) {
        console.log(`BookingSummaryHelper: Using selected fare from storage: ₹${parsedFare} for ${normalizedCabId} with ${normalizedPackageId}`);
        
        // Only update if there's a significant difference (more than ₹10)
        if (Math.abs(parsedFare - totalPrice) > 10) {
          console.log(`BookingSummaryHelper: Updating fare from ${totalPrice} to ${parsedFare}`);
          
          // Dispatch booking summary update event
          if (!disableOverrides) {
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: normalizedCabId,
                tripType: tripType,
                packageId: normalizedPackageId,
                fare: parsedFare,
                source: 'local-storage',
                timestamp: now
              }
            }));
          } else {
            console.log(`BookingSummaryHelper: Fare update suppressed during throttling period`);
          }
        }
        
        // Even with a stored fare, we might still want to verify it against the database after a delay
        if (shouldFetch && tripType === 'local' && hourlyPackage) {
          fetchFareFromDatabase(normalizedCabId, normalizedPackageId);
        }
        
        return;
      }
    }
    
    // If we don't have a valid selected fare, fetch from database
    if (shouldFetch && tripType === 'local' && hourlyPackage) {
      fetchFareFromDatabase(normalizedCabId, normalizedPackageId);
    } else if (!selectedFare) {
      // If we have no fare at all, use fallback pricing
      useFallbackPricing(normalizedCabId, normalizedPackageId);
    }
  }, [tripType, selectedCabId, hourlyPackage, totalPrice, lastSyncTime, lastFetchAttempt, disableOverrides]);
  
  // Function to fetch fare directly from the database
  const fetchFareFromDatabase = async (cabId: string, packageId: string) => {
    // Mark that we've attempted a fetch so we don't try too frequently
    setLastFetchAttempt(Date.now());
    
    // If there's already an active request, don't start another one
    if (activeRequestRef.current) {
      console.log(`BookingSummaryHelper: Skipping fetch as there's already an active request`);
      return;
    }
    
    activeRequestRef.current = true;
    
    // Reset the retry count for this fetch attempt
    const requestKey = `${cabId}_${packageId}`;
    requestRetryCount.current[requestKey] = 0;
    
    try {
      console.log(`BookingSummaryHelper: Fetching fare for ${cabId} with ${packageId}`);
      
      // First try with the api/admin/direct-local-fares.php endpoint
      const directApiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${cabId}&package_id=${packageId}`);
      
      console.log(`BookingSummaryHelper: Using API URL: ${directApiUrl}`);
      
      const response = await axios.get(directApiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.status === 'success' && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        
        // Extract the price based on package ID
        let price = 0;
        
        if (packageId.includes('4hrs-40km') && fareData.price4hrs40km) {
          price = Number(fareData.price4hrs40km);
        } else if (packageId.includes('8hrs-80km') && fareData.price8hrs80km) {
          price = Number(fareData.price8hrs80km);
        } else if (packageId.includes('10hrs-100km') && fareData.price10hrs100km) {
          price = Number(fareData.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`BookingSummaryHelper: Retrieved fare from direct API: ₹${price} for cab ${cabId}`);
          
          // Store this price in localStorage
          localStorage.setItem(`selected_fare_${cabId}_${packageId}`, price.toString());
          
          // Only update if there's a significant difference (more than ₹10)
          if (Math.abs(price - totalPrice) > 10 && !disableOverrides) {
            console.log(`BookingSummaryHelper: Updating fare from ${totalPrice} to ${price}`);
            
            // Dispatch booking summary update event
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: cabId,
                tripType: tripType,
                packageId: packageId,
                fare: price,
                source: 'direct-api',
                timestamp: Date.now()
              }
            }));
            
            // Temporary disable overrides to prevent immediate feedback loops
            setDisableOverrides(true);
            setTimeout(() => setDisableOverrides(false), 3000);
          }
          
          // Request was successful, no need to retry
          activeRequestRef.current = false;
          return;
        }
      }
      
      // If the direct API fails, try our alternative endpoint
      await fetchFromAlternativeEndpoint(cabId, packageId);
      
    } catch (error) {
      console.error(`BookingSummaryHelper: Error fetching fare directly from database:`, error);
      
      // Try alternative API endpoint as fallback
      await fetchFromAlternativeEndpoint(cabId, packageId);
    } finally {
      activeRequestRef.current = false;
    }
  };
  
  // Function to try an alternative endpoint if the first one fails
  const fetchFromAlternativeEndpoint = async (cabId: string, packageId: string) => {
    try {
      // Try local-package-fares.php endpoint
      const alternativeApiUrl = getApiUrl(`api/local-package-fares.php?vehicle_id=${cabId}&package_id=${packageId}`);
      
      console.log(`BookingSummaryHelper: Trying alternative API for ${cabId} with ${packageId}: ${alternativeApiUrl}`);
      
      const response = await axios.get(alternativeApiUrl, {
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
          console.log(`BookingSummaryHelper: Retrieved fare from alternative API: ₹${price}`);
          
          // Store this price in localStorage
          localStorage.setItem(`selected_fare_${cabId}_${packageId}`, price.toString());
          
          // Only update if there's a significant difference (more than ₹10)
          if (Math.abs(price - totalPrice) > 10 && !disableOverrides) {
            console.log(`BookingSummaryHelper: Updating fare from ${totalPrice} to ${price}`);
            
            // Dispatch booking summary update event
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: cabId,
                tripType: tripType,
                packageId: packageId,
                fare: price,
                source: 'alternative-api',
                timestamp: Date.now()
              }
            }));
            
            // Temporary disable overrides to prevent immediate feedback loops
            setDisableOverrides(true);
            setTimeout(() => setDisableOverrides(false), 3000);
          }
          return;
        }
      }
      
      // Last attempt: try user/direct-booking-data.php endpoint
      await fetchFromUserBookingEndpoint(cabId, packageId);
      
    } catch (error) {
      console.error(`BookingSummaryHelper: Error fetching from alternative endpoint:`, error);
      
      // Try user booking data API endpoint
      await fetchFromUserBookingEndpoint(cabId, packageId);
    }
  };
  
  // Function to try the user booking data endpoint as a final attempt
  const fetchFromUserBookingEndpoint = async (cabId: string, packageId: string) => {
    try {
      const userApiUrl = getApiUrl(`api/user/direct-booking-data.php?check_sync=true&vehicle_id=${cabId}&package_id=${packageId}`);
      
      console.log(`BookingSummaryHelper: Trying user booking API for ${cabId} with ${packageId}: ${userApiUrl}`);
      
      const response = await axios.get(userApiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.status === 'success') {
        let price = 0;
        
        // Check if price is directly in the response
        if (response.data.price) {
          price = Number(response.data.price);
        } 
        // Check if it's in the data object
        else if (response.data.data) {
          const data = response.data.data;
          
          if (packageId.includes('4hrs-40km') && data.price4hrs40km) {
            price = Number(data.price4hrs40km);
          } else if (packageId.includes('8hrs-80km') && data.price8hrs80km) {
            price = Number(data.price8hrs80km);
          } else if (packageId.includes('10hrs-100km') && data.price10hrs100km) {
            price = Number(data.price10hrs100km);
          }
        }
        
        if (price > 0) {
          console.log(`BookingSummaryHelper: Retrieved fare from user API: ₹${price} for cab ${cabId}`);
          
          // Store this price in localStorage
          localStorage.setItem(`selected_fare_${cabId}_${packageId}`, price.toString());
          
          // Only update if there's a significant difference (more than ₹10)
          if (Math.abs(price - totalPrice) > 10 && !disableOverrides) {
            console.log(`BookingSummaryHelper: Updating fare from ${totalPrice} to ${price}`);
            
            // Dispatch booking summary update event
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: cabId,
                tripType: tripType,
                packageId: packageId,
                fare: price,
                source: 'user-api',
                timestamp: Date.now()
              }
            }));
            
            // Temporary disable overrides to prevent immediate feedback loops
            setDisableOverrides(true);
            setTimeout(() => setDisableOverrides(false), 3000);
          }
          return;
        }
      }
      
      // If all API attempts failed, use vehicle-specific fallback pricing
      useFallbackPricing(cabId, packageId);
      
    } catch (error) {
      console.error(`BookingSummaryHelper: Error fetching from user booking endpoint:`, error);
      
      // If all API attempts failed, use vehicle-specific fallback pricing
      useFallbackPricing(cabId, packageId);
    }
  };
  
  // New function to provide reliable fallback pricing when APIs fail
  const useFallbackPricing = (cabId: string, packageId: string) => {
    // Check if we already have a cached fare first
    const cacheKey = `selected_fare_${cabId}_${packageId}`;
    const cachedFare = localStorage.getItem(cacheKey);
    if (cachedFare) {
      const parsedFare = parseFloat(cachedFare);
      if (!isNaN(parsedFare) && parsedFare > 0) {
        console.log(`BookingSummaryHelper: Using cached fare: ₹${parsedFare}`);
        return;
      }
    }
    
    // Vehicle-specific pricing table for fallback
    const fallbackPrices: Record<string, Record<string, number>> = {
      'sedan': {
        '4hrs-40km': 1400,
        '8hrs-80km': 2400,
        '10hrs-100km': 3000
      },
      'ertiga': {
        '4hrs-40km': 1800,
        '8hrs-80km': 3000,
        '10hrs-100km': 3600
      },
      'innova_crysta': {
        '4hrs-40km': 2400,
        '8hrs-80km': 4000,
        '10hrs-100km': 4800
      },
      'innova_hycross': {
        '4hrs-40km': 2600,
        '8hrs-80km': 4200,
        '10hrs-100km': 5000
      },
      'tempo_traveller': {
        '4hrs-40km': 3000,
        '8hrs-80km': 5000,
        '10hrs-100km': 6000
      },
      'luxury': {
        '4hrs-40km': 2800,
        '8hrs-80km': 4500,
        '10hrs-100km': 5500
      },
      'dzire_cng': {
        '4hrs-40km': 1400,
        '8hrs-80km': 2400,
        '10hrs-100km': 3000
      },
      'etios': {
        '4hrs-40km': 1400,
        '8hrs-80km': 2400,
        '10hrs-100km': 3000
      },
      'bus': {
        '4hrs-40km': 4000, 
        '8hrs-80km': 7000,
        '10hrs-100km': 8500
      },
      'mpv': { // For Innova Hycross fallback
        '4hrs-40km': 2600,
        '8hrs-80km': 4200,
        '10hrs-100km': 5000
      },
      'amaze': {
        '4hrs-40km': 1400,
        '8hrs-80km': 2400,
        '10hrs-100km': 3000
      }
    };
    
    // Normalize the cab ID to match our fallback keys
    let normalizedCabId = cabId.toLowerCase().replace(/\s+/g, '_');
    
    // Custom mappings for specific vehicle types
    if (normalizedCabId === 'mpv') {
      normalizedCabId = 'innova_hycross';
    } else if (normalizedCabId.includes('hycross')) {
      normalizedCabId = 'innova_hycross';
    } else if (normalizedCabId.includes('crysta')) {
      normalizedCabId = 'innova_crysta';
    } else if (normalizedCabId.includes('tempo')) {
      normalizedCabId = 'tempo_traveller';
    } else if (normalizedCabId.includes('dzire') && normalizedCabId.includes('cng')) {
      normalizedCabId = 'dzire_cng';
    } else if (normalizedCabId.includes('urbania')) {
      normalizedCabId = 'bus';
    }
    
    // Find the closest matching vehicle type
    let matchingVehicleType = 'sedan'; // Default fallback
    
    for (const vehicleType of Object.keys(fallbackPrices)) {
      if (normalizedCabId.includes(vehicleType)) {
        matchingVehicleType = vehicleType;
        break;
      }
    }
    
    // Get pricing for the matching vehicle type
    const vehiclePricing = fallbackPrices[matchingVehicleType];
    
    // Get the fare for the selected package
    let fallbackFare = vehiclePricing[packageId] || vehiclePricing['8hrs-80km'] || 3000;
    
    console.log(`BookingSummaryHelper: Using fallback pricing for ${cabId}: ₹${fallbackFare} (matched to ${matchingVehicleType})`);
    
    // Store this fallback price in localStorage
    localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fallbackFare.toString());
    
    // Only update if there's a significant difference and updates are not disabled
    if (Math.abs(fallbackFare - totalPrice) > 10 && !disableOverrides) {
      console.log(`BookingSummaryHelper: Updating from fallback pricing: ${totalPrice} to ${fallbackFare}`);
      
      // Dispatch booking summary update event
      window.dispatchEvent(new CustomEvent('booking-summary-update', {
        detail: {
          cabId: cabId,
          tripType: tripType,
          packageId: packageId,
          fare: fallbackFare,
          source: 'fallback-pricing',
          timestamp: Date.now()
        }
      }));
      
      // Temporary disable overrides to prevent feedback loops
      setDisableOverrides(true);
      setTimeout(() => setDisableOverrides(false), 3000);
    }
  };
  
  // Listen for cab selection events to immediately update fare
  useEffect(() => {
    const handleCabSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && (customEvent.detail.cabId || customEvent.detail.cabType) && customEvent.detail.fare !== undefined) {
        const { cabId, cabType, cabName, fare, packageId } = customEvent.detail;
        
        // Get the correct cab ID - either from cabId, cabType, or from the selectedCabId prop
        const eventCabId = cabId || cabType || '';
        const normalizedSelectedCabId = selectedCabId ? normalizeVehicleId(selectedCabId) : null;
        const normalizedEventCabId = eventCabId ? normalizeVehicleId(eventCabId) : '';
        
        if (normalizedSelectedCabId === normalizedEventCabId || selectedCabId === cabName) {
          console.log(`BookingSummaryHelper: Cab selected: ${cabName || eventCabId} with fare ${fare}`);
          
          // Temporary disable overrides to prevent conflicts
          setDisableOverrides(true);
          setTimeout(() => setDisableOverrides(false), 3000);
          
          // Dispatch booking summary update event
          window.dispatchEvent(new CustomEvent('booking-summary-update', {
            detail: {
              cabId: normalizedEventCabId,
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
    window.addEventListener('cab-selected-with-fare', handleCabSelected as EventListener);
    
    return () => {
      window.removeEventListener('cab-selected', handleCabSelected as EventListener);
      window.removeEventListener('cab-selected-with-fare', handleCabSelected as EventListener);
    };
  }, [selectedCabId, tripType]);
  
  // Listen for package selection changes
  useEffect(() => {
    const handlePackageSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId) {
        const { packageId, vehicleType } = customEvent.detail;
        console.log(`BookingSummaryHelper: Package selected: ${packageId}, vehicle: ${vehicleType || 'unspecified'}`);
        
        // After package selection, force a fare check after a short delay
        // to ensure the fare is updated for the new package
        if (selectedCabId) {
          const cabToUse = vehicleType || selectedCabId;
          
          setTimeout(() => {
            console.log(`BookingSummaryHelper: Forcing fare check for ${cabToUse} with package ${packageId}`);
            setLastFetchAttempt(0); // Reset to trigger a fetch
            
            // If we have a specific vehicle type from the event, use it for fare calculation
            if (vehicleType) {
              // Dispatch an event to update the booking summary with this specific fare
              const normalizedVehicleId = normalizeVehicleId(vehicleType);
              const normalizedPackageId = normalizePackageId(packageId);
              const storageKey = `selected_fare_${normalizedVehicleId}_${normalizedPackageId}`;
              const cachedFare = localStorage.getItem(storageKey);
              
              if (cachedFare) {
                const price = parseFloat(cachedFare);
                if (price > 0) {
                  window.dispatchEvent(new CustomEvent('booking-summary-update', {
                    detail: {
                      cabId: normalizedVehicleId,
                      tripType: 'local',
                      packageId: normalizedPackageId,
                      fare: price,
                      source: 'package-selection',
                      timestamp: Date.now()
                    }
                  }));
                  console.log(`BookingSummaryHelper: Dispatched fare update for ${normalizedVehicleId} with ${normalizedPackageId}: ${price}`);
                }
              }
            }
          }, 500);
        }
      }
    };
    
    window.addEventListener('hourly-package-selected', handlePackageSelected as EventListener);
    window.addEventListener('selected-package-fare-sync', handlePackageSelected as EventListener);
    
    return () => {
      window.removeEventListener('hourly-package-selected', handlePackageSelected as EventListener);
      window.removeEventListener('selected-package-fare-sync', handlePackageSelected as EventListener);
    };
  }, [selectedCabId]);

  // Create API handler for direct local fares using a standalone service
  useEffect(() => {
    // Helper function to handle API fetch
    const fetchLocalFares = async (vehicleId: string) => {
      if (!vehicleId || !tripType || tripType !== 'local') return;
      
      try {
        // Normalized vehicle ID
        const normalizedVehicleId = normalizeVehicleId(vehicleId);
        console.log(`BookingSummaryHelper: Fetching local fares for vehicle ${normalizedVehicleId} with timestamp: ${Date.now()}`);
        
        // Try admin API first
        const adminApiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`);
        
        try {
          const response = await axios.get(adminApiUrl, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            },
            timeout: 5000
          });
          
          if (response.data && response.data.status === 'success' && response.data.fares && response.data.fares.length > 0) {
            const fareData = response.data.fares[0];
            
            // Cache each price in localStorage
            if (fareData.price4hrs40km) {
              localStorage.setItem(`selected_fare_${normalizedVehicleId}_4hrs-40km`, fareData.price4hrs40km.toString());
            }
            
            if (fareData.price8hrs80km) {
              localStorage.setItem(`selected_fare_${normalizedVehicleId}_8hrs-80km`, fareData.price8hrs80km.toString());
            }
            
            if (fareData.price10hrs100km) {
              localStorage.setItem(`selected_fare_${normalizedVehicleId}_10hrs-100km`, fareData.price10hrs100km.toString());
            }
            
            console.log(`BookingSummaryHelper: Fetched local fares for ${normalizedVehicleId} successfully`, fareData);
            return;
          }
        } catch (error) {
          console.error(`BookingSummaryHelper: Error fetching direct local fares:`, error);
        }
        
        // Fallback to local storage with fallback pricing
        const fallbackPrices = {
          'price4hrs40km': 1400,
          'price8hrs80km': 2400,
          'price10hrs100km': 3000,
          'priceExtraKm': 14,
          'priceExtraHour': 300
        };
        
        // Adjust pricing based on vehicle type
        if (normalizedVehicleId.includes('ertiga')) {
          fallbackPrices.price4hrs40km = 1800;
          fallbackPrices.price8hrs80km = 3000;
          fallbackPrices.price10hrs100km = 3600;
        } else if (normalizedVehicleId.includes('innova_crysta')) {
          fallbackPrices.price4hrs40km = 2400;
          fallbackPrices.price8hrs80km = 4000;
          fallbackPrices.price10hrs100km = 4800;
        } else if (normalizedVehicleId.includes('hycross') || normalizedVehicleId === 'mpv') {
          fallbackPrices.price4hrs40km = 2600;
          fallbackPrices.price8hrs80km = 4200;
          fallbackPrices.price10hrs100km = 5000;
        } else if (normalizedVehicleId.includes('tempo')) {
          fallbackPrices.price4hrs40km = 3000;
          fallbackPrices.price8hrs80km = 5000;
          fallbackPrices.price10hrs100km = 6000;
        } else if (normalizedVehicleId.includes('bus')) {
          fallbackPrices.price4hrs40km = 4000;
          fallbackPrices.price8hrs80km = 7000;
          fallbackPrices.price10hrs100km = 8500;
        }
        
        console.log(`BookingSummaryHelper: Fallback fares for ${normalizedVehicleId}:`, fallbackPrices);
        
        // Store fallback prices in localStorage
        localStorage.setItem(`selected_fare_${normalizedVehicleId}_4hrs-40km`, fallbackPrices.price4hrs40km.toString());
        localStorage.setItem(`selected_fare_${normalizedVehicleId}_8hrs-80km`, fallbackPrices.price8hrs80km.toString());
        localStorage.setItem(`selected_fare_${normalizedVehicleId}_10hrs-100km`, fallbackPrices.price10hrs100km.toString());
        
      } catch (error) {
        console.error(`BookingSummaryHelper: Error in fetchLocalFares:`, error);
      }
    };
    
    // Handle API fetch request
    const handleForceFetchLocalFares = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.vehicleId) {
        fetchLocalFares(customEvent.detail.vehicleId);
      } else if (selectedCabId) {
        fetchLocalFares(selectedCabId);
      }
    };
    
    window.addEventListener('force-fetch-local-fares', handleForceFetchLocalFares as EventListener);
    
    // If we have a selectedCabId, pre-fetch fares in the background
    if (selectedCabId && tripType === 'local') {
      fetchLocalFares(selectedCabId);
    }
    
    return () => {
      window.removeEventListener('force-fetch-local-fares', handleForceFetchLocalFares as EventListener);
    };
  }, [selectedCabId, tripType]);

  // This component doesn't render anything visible
  return null;
};
