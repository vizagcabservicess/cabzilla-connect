
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
    // Don't do anything if we don't have a selected cab or total price isn't positive
    if (!selectedCabId || totalPrice <= 0) return;
    
    // For local trips, fetch the fare directly from the database
    if (tripType === 'local' && hourlyPackage) {
      const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
      
      // Directly fetch from the database API
      const fetchFareFromDatabase = async () => {
        try {
          const apiUrl = getApiUrl() || '';
          const endpoint = `${apiUrl}/api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`;
          
          console.log(`BookingSummaryHelper: Fetching fare directly from database API for ${normalizedCabId}`);
          const response = await axios.get(endpoint, {
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
            if (hourlyPackage.includes('4hrs-40km')) {
              price = Number(fareData.price4hrs40km || 0);
            } else if (hourlyPackage.includes('8hrs-80km')) {
              price = Number(fareData.price8hrs80km || 0);
            } else if (hourlyPackage.includes('10hrs-100km')) {
              price = Number(fareData.price10hrs100km || 0);
            }
            
            if (price > 0) {
              console.log(`BookingSummaryHelper: Retrieved fare directly from database API: ₹${price}`);
              setFetchedFare(price);
              
              // Dispatch an event with the database-sourced fare
              window.dispatchEvent(new CustomEvent('fare-calculated', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: 'local',
                  calculated: true,
                  fare: price,
                  packageId: hourlyPackage,
                  source: 'database-direct',
                  timestamp: Date.now()
                }
              }));
              
              // Only broadcast the final price if it's different than what was passed in
              if (price !== totalPrice) {
                console.log(`BookingSummaryHelper: Database price (${price}) differs from component price (${totalPrice}), broadcasting update`);
                
                window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
                  detail: {
                    cabId: normalizedCabId,
                    tripType: 'local',
                    packageId: hourlyPackage,
                    originalFare: totalPrice,
                    updatedFare: price,
                    source: 'database-direct',
                    timestamp: Date.now()
                  }
                }));
              }
            }
          }
        } catch (error) {
          console.error('Error fetching fare from database:', error);
        }
      };
      
      fetchFareFromDatabase();
    }
  }, [tripType, selectedCabId, totalPrice, hourlyPackage]);
  
  // If we've fetched a fare from the database and it's different from totalPrice,
  // dispatch another update to ensure consistency
  useEffect(() => {
    if (fetchedFare && fetchedFare > 0 && selectedCabId && totalPrice > 0 && fetchedFare !== totalPrice) {
      const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
      
      console.log(`BookingSummaryHelper: Synchronizing prices - database price: ${fetchedFare}, component price: ${totalPrice}`);
      
      // Dispatch an event to update price consistency
      window.dispatchEvent(new CustomEvent('fare-sync-required', {
        detail: {
          cabId: normalizedCabId,
          tripType: tripType,
          calculatedFare: totalPrice,
          databaseFare: fetchedFare,
          packageId: hourlyPackage,
          timestamp: Date.now()
        }
      }));
    }
  }, [fetchedFare, selectedCabId, totalPrice, tripType, hourlyPackage]);
  
  // This component doesn't render anything visible
  return null;
};
