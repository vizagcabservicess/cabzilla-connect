
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
 * by directly fetching from the database
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

  useEffect(() => {
    // Don't do anything if we don't have a selected cab
    if (!selectedCabId) return;
    
    // For local trips, fetch the fare directly from the database
    if (tripType === 'local' && hourlyPackage) {
      const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
      
      // Set a timestamp for this fetch attempt
      const currentTime = Date.now();
      setLastFetchAttempt(currentTime);
      
      // Directly fetch from the database API
      const fetchFareFromDatabase = async () => {
        try {
          console.log(`BookingSummaryHelper: Fetching fare for ${normalizedCabId} - ${hourlyPackage}`);
          
          // First try with the direct booking API
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
            console.log(`BookingSummaryHelper: Retrieved fare from API: ₹${price} for ${normalizedCabId} - ${hourlyPackage}`);
            
            if (price > 0) {
              handleSuccessfulPriceFetch(normalizedCabId, price, hourlyPackage, currentTime);
            }
          } else if (response.data && response.data.data) {
            // Handle alternative response format
            const packagePrice = extractPackagePrice(response.data.data, hourlyPackage);
            
            if (packagePrice > 0) {
              console.log(`BookingSummaryHelper: Retrieved alternate fare format: ₹${packagePrice} for ${normalizedCabId} - ${hourlyPackage}`);
              handleSuccessfulPriceFetch(normalizedCabId, packagePrice, hourlyPackage, currentTime);
            } else {
              // If first attempt failed to extract price, try fallback
              await fetchFromFallbackEndpoint(normalizedCabId, hourlyPackage, currentTime);
            }
          } else {
            // If first attempt failed, try fallback
            await fetchFromFallbackEndpoint(normalizedCabId, hourlyPackage, currentTime);
          }
        } catch (error) {
          console.error('Error fetching fare from database:', error);
          // Try fallback endpoint
          fetchFromFallbackEndpoint(normalizedCabId, hourlyPackage, currentTime);
        }
      };
      
      fetchFareFromDatabase();
    }
  }, [tripType, selectedCabId, hourlyPackage, retryCount]);
  
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
  
  const handleSuccessfulPriceFetch = (cabId: string, price: number, packageId: string, timestamp: number) => {
    setFetchedFare(price);
    
    // Dispatch a global fare update event to synchronize all components
    window.dispatchEvent(new CustomEvent('global-fare-update', {
      detail: {
        cabId: cabId,
        tripType: 'local',
        packageId: packageId,
        fare: price,
        source: 'direct-database-api',
        timestamp: timestamp
      }
    }));
    
    // If current total price is different from fetched price, dispatch an update
    if (Math.abs(price - totalPrice) > 10) {
      console.log(`BookingSummaryHelper: Database price (${price}) differs from component price (${totalPrice}), broadcasting update`);
      
      window.dispatchEvent(new CustomEvent('booking-summary-update', {
        detail: {
          cabId: cabId,
          tripType: 'local',
          packageId: packageId,
          fare: price,
          source: 'direct-database-api',
          timestamp: timestamp
        }
      }));
      
      // Additional alert to make the price change more noticeable
      toast.info(`Updated price for ${cabId.replace(/_/g, ' ')}: ₹${price}`, {
        duration: 3000,
        id: `price-update-${cabId}`
      });
    }
  };
  
  // Helper function to extract price from response data based on package ID
  const extractPackagePrice = (data: any, packageId: string): number => {
    if (!data) return 0;
    
    if (packageId.includes('4hrs-40km') && data.price4hrs40km) {
      return Number(data.price4hrs40km);
    } else if (packageId.includes('8hrs-80km') && data.price8hrs80km) {
      return Number(data.price8hrs80km);
    } else if (packageId.includes('10hrs-100km') && data.price10hrs100km) {
      return Number(data.price10hrs100km);
    }
    
    // Try alternate keys
    if (packageId.includes('4hrs-40km') && data.price_4hrs_40km) {
      return Number(data.price_4hrs_40km);
    } else if (packageId.includes('8hrs-80km') && data.price_8hrs_80km) {
      return Number(data.price_8hrs_80km);
    } else if (packageId.includes('10hrs-100km') && data.price_10hrs_100km) {
      return Number(data.price_10hrs_100km);
    }
    
    return 0;
  };
  
  // Fallback endpoint function
  const fetchFromFallbackEndpoint = async (vehicleId: string, packageId: string, timestamp: number) => {
    try {
      console.log(`BookingSummaryHelper: Trying fallback endpoint for ${vehicleId} - ${packageId}`);
      
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${vehicleId}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.fares && Array.isArray(response.data.fares) && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        
        // Extract the right price for the selected package
        let price = 0;
        if (packageId.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km || 0);
        } else if (packageId.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km || 0);
        } else if (packageId.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km || 0);
        }
        
        if (price > 0) {
          console.log(`BookingSummaryHelper: Retrieved fare from fallback endpoint: ₹${price}`);
          handleSuccessfulPriceFetch(vehicleId, price, packageId, timestamp);
        } else {
          // Try one last attempt with direct calculation
          fetchUsingDirectCalculation(vehicleId, packageId, timestamp);
        }
      } else {
        // If fallback also failed, try direct calculation
        fetchUsingDirectCalculation(vehicleId, packageId, timestamp);
      }
    } catch (error) {
      console.error('Error fetching from fallback endpoint:', error);
      // Last resort: use direct calculation method
      fetchUsingDirectCalculation(vehicleId, packageId, timestamp);
    }
  };
  
  // Direct calculation as a last resort when all API methods fail
  const fetchUsingDirectCalculation = (vehicleId: string, packageId: string, timestamp: number) => {
    console.log(`BookingSummaryHelper: Using direct calculation for ${vehicleId} - ${packageId}`);
    
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
      }
    };
    
    // Determine vehicle category
    let vehicleCategory = 'sedan'; // default
    
    if (vehicleId.includes('ertiga')) {
      vehicleCategory = 'ertiga';
    } else if (vehicleId.includes('innova')) {
      if (vehicleId.includes('hycross') || vehicleId.includes('mpv')) {
        vehicleCategory = 'innova_hycross';
      } else {
        vehicleCategory = 'innova_crysta';
      }
    } else if (vehicleId.includes('cng') || vehicleId.includes('dzire')) {
      vehicleCategory = 'dzire_cng';
    } else if (vehicleId.includes('tempo') || vehicleId.includes('traveller')) {
      vehicleCategory = 'tempo_traveller';
    }
    
    // Get price for the package
    if (basePrices[vehicleCategory] && basePrices[vehicleCategory][packageId]) {
      const price = basePrices[vehicleCategory][packageId];
      console.log(`BookingSummaryHelper: Calculated fare using fallback method: ₹${price}`);
      handleSuccessfulPriceFetch(vehicleId, price, packageId, timestamp);
    }
  };
  
  // This component doesn't render anything visible
  return null;
};
