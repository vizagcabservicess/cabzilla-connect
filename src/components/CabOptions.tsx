
import React, { useEffect, useState } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';
import fareStateManager from '@/services/FareStateManager';
import { calculateFare } from '@/lib/fareCalculationService';

export interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

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
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState(true);
  const [hasSelectedCab, setHasSelectedCab] = useState(false);
  const [fareListenerInitialized, setFareListenerInitialized] = useState(false);
  
  // Store current trip type for fare calculations
  useEffect(() => {
    if (tripType) {
      try {
        localStorage.setItem('tripType', tripType.toString());
      } catch (error) {
        console.error('Error storing trip type:', error);
      }
    }
  }, [tripType]);
  
  // Set up event listeners for fare updates
  useEffect(() => {
    if (fareListenerInitialized) return;
    
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) return;
      
      const { cabId, fare } = customEvent.detail;
      
      if (cabId && fare && fare > 0) {
        setCabFares(prevFares => ({
          ...prevFares,
          [cabId]: fare
        }));
      }
    };
    
    const handleFareCacheCleared = () => {
      console.log('CabOptions: Fare cache cleared, recalculating fares');
      calculateAllFares();
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    window.addEventListener('fare-data-fetched', handleFareCacheCleared);
    
    setFareListenerInitialized(true);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
      window.removeEventListener('fare-data-fetched', handleFareCacheCleared);
    };
  }, []);
  
  // Calculate all fares for the available cab types
  const calculateAllFares = async () => {
    if (!cabTypes.length) return;
    
    setIsCalculatingFares(true);
    
    const newFares: Record<string, number> = {};
    const calculationPromises: Promise<void>[] = [];
    
    for (const cab of cabTypes) {
      if (!cab.id) continue;
      
      const calculateFareForCab = async () => {
        try {
          let fare = 0;
          
          if (tripType === 'outstation') {
            fare = await fareStateManager.calculateOutstationFare({
              vehicleId: cab.id,
              distance,
              tripMode: tripMode as 'one-way' | 'round-trip',
              pickupDate
            });
          } else if (tripType === 'local' && hourlyPackage) {
            fare = await fareStateManager.calculateLocalFare({
              vehicleId: cab.id,
              hourlyPackage
            });
          } else if (tripType === 'airport') {
            fare = await fareStateManager.calculateAirportFare({
              vehicleId: cab.id,
              distance
            });
          }
          
          if (fare > 0) {
            newFares[cab.id] = fare;
          }
        } catch (error) {
          console.error(`Error calculating fare for ${cab.id}:`, error);
        }
      };
      
      calculationPromises.push(calculateFareForCab());
    }
    
    await Promise.all(calculationPromises);
    
    setCabFares(newFares);
    setIsCalculatingFares(false);
    
    // If we have a selected cab, update its fare
    if (selectedCab && selectedCab.id && newFares[selectedCab.id]) {
      const fare = newFares[selectedCab.id];
      
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        detail: {
          cabType: selectedCab.id,
          cabName: selectedCab.name,
          fare: fare,
          tripType: tripType,
          tripMode: tripMode,
          timestamp: Date.now()
        }
      }));
    }
  };
  
  // Load initial fares or update fares when trip details change
  useEffect(() => {
    calculateAllFares();
  }, [cabTypes, tripType, tripMode, distance, hourlyPackage, pickupDate]);
  
  // Handle cab selection
  const handleSelectCab = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    // Get fare for the selected cab
    const fare = cabFares[cab.id] || 0;
    
    if (fare > 0) {
      // Dispatch event for fare update
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          fare: fare,
          tripType: tripType,
          tripMode: tripMode,
          timestamp: Date.now()
        }
      }));
    } else {
      // If we don't have a fare yet, calculate it
      calculateFare({
        cabType: cab,
        distance,
        tripType,
        tripMode,
        hourlyPackage,
        pickupDate,
        forceRefresh: true
      }).then(calculatedFare => {
        if (calculatedFare > 0) {
          setCabFares(prevFares => ({
            ...prevFares,
            [cab.id]: calculatedFare
          }));
          
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: cab.id,
              cabName: cab.name,
              fare: calculatedFare,
              tripType: tripType,
              tripMode: tripMode,
              timestamp: Date.now()
            }
          }));
        }
      });
    }
  };

  // Format fare details for each cab
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return hourlyPackage || 'Local Package';
    } else if (tripType === 'outstation') {
      return tripMode === 'round-trip' ? 'Round Trip' : 'One Way Trip';
    } else {
      return 'Airport Transfer';
    }
  };

  // Scroll to booking summary when a cab is selected
  useEffect(() => {
    if (selectedCab && hasSelectedCab) {
      const timeout = setTimeout(() => {
        const bookingSummary = document.getElementById('booking-summary');
        if (bookingSummary) {
          bookingSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setHasSelectedCab(false);
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [selectedCab, hasSelectedCab]);

  return (
    <CabList
      cabTypes={cabTypes}
      selectedCabId={selectedCab?.id || null}
      cabFares={cabFares}
      isCalculatingFares={isCalculatingFares}
      handleSelectCab={handleSelectCab}
      getFareDetails={getFareDetails}
    />
  );
};

export default CabOptions;
