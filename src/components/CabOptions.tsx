
import React, { useEffect, useState } from 'react';
import CabList from './cab-options/CabList';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFare } from '@/hooks/useFare';

export interface CabListProps {
  cabTypes: CabType[];
  selectedCabId?: string;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: TripType | string;
  tripMode: TripMode | string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: TripType | string;
  tripMode: TripMode | string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

// This component adapts the properties from parent components to what CabList expects
export const CabOptions: React.FC<CabOptionsProps> = ({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate,
}) => {
  const isMobile = useIsMobile();
  const [hasSelectedCab, setHasSelectedCab] = useState(false);
  const { fetchFare } = useFare();

  // Handle cab selection
  const handleCabSelect = (cab: CabType) => {
    const completeCAb: CabType = {
      ...cab,
      image: cab.image || '/placeholder.svg', // Removed imageUrl since it doesn't exist in CabType
      amenities: cab.amenities || [],
      description: cab.description || '',
      ac: cab.ac !== undefined ? cab.ac : true
    };
    
    onSelectCab(completeCAb);
    setHasSelectedCab(true);
    
    // Store the current trip type in localStorage for better fare syncing
    localStorage.setItem('tripType', tripType.toString());
    
    // Get real fare from API
    const packageType = hourlyPackage || '8hrs-80km';
    
    // Fetch up-to-date fare from the API
    fetchFare(cab.id, tripType.toString(), distance, packageType)
      .then(response => {
        try {
          // Emit event with real fare data from API
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: cab.id,
              cabName: cab.name,
              fare: response.fareData.totalPrice,
              tripType: tripType,
              tripMode: tripMode,
              timestamp: Date.now()
            }
          }));
          console.log(`CabOptions: Dispatched fare update event for ${cab.id}: ${response.fareData.totalPrice} (from API)`);
        } catch (error) {
          console.error('Error dispatching cab selection event:', error);
        }
      })
      .catch(err => {
        console.error('Error fetching fare for selected cab:', err);
      });
  };

  // Scroll to booking summary when a cab is selected
  useEffect(() => {
    if (selectedCab && hasSelectedCab) {
      // Wait a brief moment for UI to update before scrolling
      setTimeout(() => {
        const bookingSummaryElement = document.getElementById('booking-summary');
        if (bookingSummaryElement) {
          bookingSummaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // If element not found, try to find any element with "summary" in the id or class
          const alternativeSummaryElement = 
            document.querySelector('[id*="summary" i], [class*="summary" i]') || 
            document.querySelector('[id*="book" i], [class*="book" i]');
          
          if (alternativeSummaryElement) {
            alternativeSummaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        setHasSelectedCab(false); // Reset after scrolling
      }, 100);
    }
  }, [selectedCab, hasSelectedCab]);

  // Set up data for the CabList component with actual fares
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState(true);
  
  // Fetch real fares for each cab type
  useEffect(() => {
    setIsCalculatingFares(true);
    
    const loadActualFares = async () => {
      const fares: Record<string, number> = {};
      const packageType = hourlyPackage || '8hrs-80km';
      
      try {
        // Use Promise.all to fetch fares for all cab types in parallel
        const farePromises = cabTypes.map(cab => 
          fetchFare(cab.id, tripType.toString(), distance, packageType)
            .then(response => {
              fares[cab.id] = response.fareData.totalPrice;
              console.log(`Got fare for ${cab.id} from API: ${response.fareData.totalPrice}`);
              return response;
            })
            .catch(err => {
              console.error(`Error fetching fare for ${cab.id}:`, err);
              return null;
            })
        );
        
        await Promise.all(farePromises);
        
        // Update the state with all fares
        setCabFares(fares);
        
        // If we already have a selected cab, dispatch an event with its updated fare
        if (selectedCab && fares[selectedCab.id] > 0) {
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: selectedCab.id,
              cabName: selectedCab.name,
              fare: fares[selectedCab.id],
              tripType: tripType,
              tripMode: tripMode,
              timestamp: Date.now()
            }
          }));
          console.log(`CabOptions: Dispatched fare update event for existing selected cab ${selectedCab.id}: ${fares[selectedCab.id]}`);
        }
      } catch (error) {
        console.error('Error loading actual fares:', error);
      } finally {
        setIsCalculatingFares(false);
      }
      
      return fares;
    };
    
    loadActualFares();
  }, [cabTypes, distance, tripType, hourlyPackage, fetchFare, selectedCab, tripMode]);

  // Listen for fare calculation events and update our fares accordingly
  useEffect(() => {
    const handleFareCalculated = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.fare > 0) {
        const { cabId, fare } = event.detail;
        console.log(`CabOptions: Received fare-calculated event for ${cabId}: ${fare}`);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabId]: fare };
          return updated;
        });
      }
    };
    
    const handleDirectFareUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.cabType && event.detail.fare > 0) {
        const { cabType, fare } = event.detail;
        console.log(`CabOptions: Received direct fare update for ${cabType}: ${fare}`);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabType]: fare };
          return updated;
        });
      }
    };
    
    const handleRequestFareCalculation = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && selectedCab?.id === event.detail.cabId) {
        console.log(`CabOptions: Received fare recalculation request for ${event.detail.cabId}`);
        
        // If this is the currently selected cab, trigger fare event with latest fare
        if (cabFares[event.detail.cabId] > 0) {
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: event.detail.cabId,
              cabName: event.detail.cabName || selectedCab.name,
              fare: cabFares[event.detail.cabId],
              tripType: tripType,
              tripMode: tripMode,
              timestamp: Date.now()
            }
          }));
        }
      }
    };
    
    const handleSignificantFareDifference = (event: CustomEvent) => {
      if (event.detail && event.detail.calculatedFare && event.detail.cabId) {
        const { calculatedFare, cabId } = event.detail;
        console.log(`CabOptions: Received significant fare difference for ${cabId}: calculated=${calculatedFare}`);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabId]: calculatedFare };
          return updated;
        });
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
    window.addEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
    window.addEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
      window.removeEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
      window.removeEventListener('significant-fare-difference', handleSignificantFareDifference as EventListener);
    };
  }, [cabFares, selectedCab, tripType, tripMode]);

  // Generate fare details string
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return 'Local package';
    } else if (tripType === 'airport') {
      return 'Airport transfer';
    } else {
      return tripMode === 'round-trip' ? 'Round trip' : 'One way';
    }
  };

  return (
    <CabList
      cabTypes={cabTypes} 
      selectedCabId={selectedCab?.id || ""}
      onSelectCab={handleCabSelect}
      distance={distance}
      tripType={tripType.toString()}
      packageType={hourlyPackage || '8hrs-80km'}
      cabFares={cabFares}
      isCalculatingFares={isCalculatingFares}
      getFareDetails={getFareDetails}
    />
  );
};

// Add default export for backward compatibility
export default CabOptions;
