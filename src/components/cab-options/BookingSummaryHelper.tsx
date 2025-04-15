
import { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';

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

  useEffect(() => {
    // Don't do anything if we don't have a selected cab
    if (!selectedCabId) return;
    
    // For local trips, fetch the fare directly from the database
    if (tripType === 'local' && hourlyPackage) {
      const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
      
      // Directly fetch from the database API
      const fetchFareFromDatabase = async () => {
        try {
          console.log(`BookingSummaryHelper: Fetching fare for ${normalizedCabId} - ${hourlyPackage}`);
          
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
              setFetchedFare(price);
              
              // Dispatch a global fare update event to synchronize all components
              window.dispatchEvent(new CustomEvent('global-fare-update', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: 'local',
                  packageId: hourlyPackage,
                  fare: price,
                  source: 'direct-database-api',
                  timestamp: Date.now()
                }
              }));
              
              // If current total price is different from fetched price, dispatch an update
              if (Math.abs(price - totalPrice) > 10) {
                console.log(`BookingSummaryHelper: Database price (${price}) differs from component price (${totalPrice}), broadcasting update`);
                
                window.dispatchEvent(new CustomEvent('booking-summary-update', {
                  detail: {
                    cabId: normalizedCabId,
                    tripType: 'local',
                    packageId: hourlyPackage,
                    fare: price,
                    source: 'direct-database-api',
                    timestamp: Date.now()
                  }
                }));
              }
            }
          } else if (response.data && response.data.data) {
            // Handle alternative response format
            const packagePrice = extractPackagePrice(response.data.data, hourlyPackage);
            
            if (packagePrice > 0) {
              console.log(`BookingSummaryHelper: Retrieved alternate fare format: ₹${packagePrice} for ${normalizedCabId} - ${hourlyPackage}`);
              setFetchedFare(packagePrice);
              
              window.dispatchEvent(new CustomEvent('global-fare-update', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: 'local',
                  packageId: hourlyPackage,
                  fare: packagePrice,
                  source: 'direct-database-api-alternate',
                  timestamp: Date.now()
                }
              }));
              
              if (Math.abs(packagePrice - totalPrice) > 10) {
                window.dispatchEvent(new CustomEvent('booking-summary-update', {
                  detail: {
                    cabId: normalizedCabId,
                    tripType: 'local',
                    packageId: hourlyPackage,
                    fare: packagePrice,
                    source: 'direct-database-api-alternate',
                    timestamp: Date.now()
                  }
                }));
              }
            }
          }
        } catch (error) {
          console.error('Error fetching fare from database:', error);
          // Try fallback endpoint
          fetchFromFallbackEndpoint(normalizedCabId, hourlyPackage);
        }
      };
      
      fetchFareFromDatabase();
    }
  }, [tripType, selectedCabId, totalPrice, hourlyPackage]);
  
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
    
    return 0;
  };
  
  // Fallback endpoint function
  const fetchFromFallbackEndpoint = async (vehicleId: string, packageId: string) => {
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
          setFetchedFare(price);
          
          // Dispatch a global fare update event
          window.dispatchEvent(new CustomEvent('global-fare-update', {
            detail: {
              cabId: vehicleId,
              tripType: 'local',
              packageId: packageId,
              fare: price,
              source: 'fallback-database-api',
              timestamp: Date.now()
            }
          }));
          
          // If current total price is different from fetched price, dispatch an update
          if (Math.abs(price - totalPrice) > 10) {
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: vehicleId,
                tripType: 'local',
                packageId: packageId,
                fare: price,
                source: 'fallback-database-api',
                timestamp: Date.now()
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching from fallback endpoint:', error);
    }
  };
  
  // This component doesn't render anything visible
  return null;
};
