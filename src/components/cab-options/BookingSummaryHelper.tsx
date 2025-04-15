
import { useEffect } from 'react';

interface BookingSummaryHelperProps {
  tripType: string;
  selectedCabId: string | null;
  totalPrice: number;
  hourlyPackage?: string;
}

/**
 * A helper component that ensures fare consistency across components
 * This component doesn't render anything visible but handles event management
 * for fare synchronization
 */
export const BookingSummaryHelper: React.FC<BookingSummaryHelperProps> = ({
  tripType,
  selectedCabId,
  totalPrice,
  hourlyPackage
}) => {
  useEffect(() => {
    if (!selectedCabId || totalPrice <= 0) return;
    
    // For local trips, ensure the fare is stored in localStorage
    if (tripType === 'local') {
      const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
      const fareKey = `fare_local_${normalizedCabId}`;
      
      // Store the current fare in localStorage
      localStorage.setItem(fareKey, totalPrice.toString());
      console.log(`BookingSummaryHelper: Stored fare in localStorage: ${fareKey} = ${totalPrice}`);
      
      // Dispatch a fare-calculated event to synchronize other components
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: normalizedCabId,
          tripType: 'local',
          calculated: true,
          fare: totalPrice,
          packageId: hourlyPackage,
          timestamp: Date.now()
        }
      }));
    }
  }, [tripType, selectedCabId, totalPrice, hourlyPackage]);
  
  // This component doesn't render anything visible
  return null;
};
