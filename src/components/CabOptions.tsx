
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

// Helper function to normalize vehicle IDs
const normalizeVehicleId = (vehicleId: string): string => {
  if (!vehicleId) return '';
  
  // Handle special cases of common vehicle IDs for better matching
  const id = vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Map common variants to standardized IDs
  const idMappings: Record<string, string> = {
    'sedan': 'sedan',
    'dzire': 'sedan',
    'swift_dzire': 'sedan',
    'etios': 'sedan',
    'amaze': 'sedan',
    'ertiga': 'ertiga',
    'marazzo': 'ertiga',
    'suv': 'ertiga',
    'innova': 'innova_crysta',
    'innova_crysta': 'innova_crysta',
    'crysta': 'innova_crysta',
    'hycross': 'innova_crysta',
    'mpv': 'innova_crysta',
    'tempo': 'tempo_traveller',
    'tempo_traveller': 'tempo_traveller',
    'traveller': 'tempo_traveller',
    // Add additional mappings for other vehicles in your fleet
    'toyota': 'sedan',
    'dzire cng': 'sedan',
    'honda amze': 'sedan',
    'MPV': 'innova_crysta'
  };
  
  return idMappings[id] || id;
};

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
  const [initialFareSync, setInitialFareSync] = useState(false);
  
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
  
  // Initialize fare data by syncing with the server on component mount
  useEffect(() => {
    if (!initialFareSync) {
      console.log('CabOptions: Performing initial fare data sync');
      fareStateManager.syncFareData().then(() => {
        console.log('Initial fare data sync completed');
        setInitialFareSync(true);
        calculateAllFares();
      }).catch(error => {
        console.error('Error during initial fare sync:', error);
        setInitialFareSync(true); // Mark as completed even on error
        calculateAllFares(); // Still try to calculate with whatever data we have
      });
    }
  }, []);
  
  // Set up event listeners for fare updates
  useEffect(() => {
    if (fareListenerInitialized) return;
    
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) return;
      
      const { cabId, originalCabId, normalizedCabId, fare } = customEvent.detail;
      
      if ((cabId || originalCabId || normalizedCabId) && fare && fare > 0) {
        // Update fare for both original and normalized ID
        setCabFares(prevFares => {
          const updatedFares = { ...prevFares };
          
          if (cabId) {
            updatedFares[cabId] = fare;
          }
          
          if (originalCabId && originalCabId !== cabId) {
            updatedFares[originalCabId] = fare;
          }
          
          if (normalizedCabId && normalizedCabId !== cabId && normalizedCabId !== originalCabId) {
            updatedFares[normalizedCabId] = fare;
          }
          
          return updatedFares;
        });
      }
    };
    
    const handleFareCacheCleared = () => {
      console.log('CabOptions: Fare cache cleared, recalculating fares');
      calculateAllFares();
    };
    
    const handleFareDataFetched = () => {
      console.log('CabOptions: Fare data fetched, recalculating fares');
      calculateAllFares();
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    window.addEventListener('fare-data-fetched', handleFareDataFetched);
    window.addEventListener('fare-data-updated', handleFareDataFetched);
    
    setFareListenerInitialized(true);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
      window.removeEventListener('fare-data-fetched', handleFareDataFetched);
      window.removeEventListener('fare-data-updated', handleFareDataFetched);
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
          const normalizedVehicleId = normalizeVehicleId(cab.id);
          console.log(`CabOptions: Calculating fare for ${cab.id} (normalized to ${normalizedVehicleId})`);
          
          let fare = 0;
          
          if (tripType === 'outstation') {
            fare = await fareStateManager.calculateOutstationFare({
              vehicleId: normalizedVehicleId,
              distance,
              tripMode: tripMode as 'one-way' | 'round-trip',
              pickupDate
            });
          } else if (tripType === 'local' && hourlyPackage) {
            fare = await fareStateManager.calculateLocalFare({
              vehicleId: normalizedVehicleId,
              hourlyPackage
            });
          } else if (tripType === 'airport') {
            fare = await fareStateManager.calculateAirportFare({
              vehicleId: normalizedVehicleId,
              distance
            });
          }
          
          // Ensure we have a valid fare
          if (fare <= 0) {
            console.warn(`Zero or invalid fare calculated for ${cab.id} (${tripType}), using fallback`);
            
            // Use fallbacks based on vehicle type and trip type
            if (tripType === 'airport') {
              if (normalizedVehicleId === 'sedan') {
                fare = 1500;
              } else if (normalizedVehicleId === 'ertiga') {
                fare = 1800;
              } else if (normalizedVehicleId === 'innova_crysta') {
                fare = 2200;
              } else if (normalizedVehicleId === 'tempo_traveller') {
                fare = 3500;
              } else {
                fare = 1800; // Default airport fallback
              }
            } else if (tripType === 'local') {
              if (normalizedVehicleId === 'sedan') {
                fare = 1600;
              } else if (normalizedVehicleId === 'ertiga') {
                fare = 1900;
              } else if (normalizedVehicleId === 'innova_crysta') {
                fare = 2300;
              } else if (normalizedVehicleId === 'tempo_traveller') {
                fare = 3800;
              } else {
                fare = 1800; // Default local fallback
              }
            } else if (tripType === 'outstation') {
              if (normalizedVehicleId === 'sedan') {
                fare = 2500;
              } else if (normalizedVehicleId === 'ertiga') {
                fare = 3000;
              } else if (normalizedVehicleId === 'innova_crysta') {
                fare = 3600;
              } else if (normalizedVehicleId === 'tempo_traveller') {
                fare = 4500;
              } else {
                fare = 3000; // Default outstation fallback
              }
            }
          }
          
          newFares[cab.id] = fare;
          
          // Also store fare with normalized ID for consistent lookup
          if (normalizedVehicleId !== cab.id) {
            newFares[normalizedVehicleId] = fare;
          }
          
          console.log(`Calculated fare for ${cab.id}: ${fare} (${tripType})`);
          
          // Dispatch event for hooks that listen for fare calculations
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: cab.id,
              originalCabId: cab.id,
              normalizedCabId: normalizedVehicleId,
              fare: fare,
              tripType: tripType,
              timestamp: Date.now()
            }
          }));
        } catch (error) {
          console.error(`Error calculating fare for ${cab.id}:`, error);
          
          // Use fallbacks based on vehicle type and trip type
          const normalizedVehicleId = normalizeVehicleId(cab.id);
          let fallbackFare = 0;
          
          if (tripType === 'airport') {
            if (normalizedVehicleId === 'sedan') {
              fallbackFare = 1500;
            } else if (normalizedVehicleId === 'ertiga') {
              fallbackFare = 1800;
            } else if (normalizedVehicleId === 'innova_crysta') {
              fallbackFare = 2200;
            } else if (normalizedVehicleId === 'tempo_traveller') {
              fallbackFare = 3500;
            } else {
              fallbackFare = 1800; // Default airport fallback
            }
          } else if (tripType === 'local') {
            if (normalizedVehicleId === 'sedan') {
              fallbackFare = 1600;
            } else if (normalizedVehicleId === 'ertiga') {
              fallbackFare = 1900;
            } else if (normalizedVehicleId === 'innova_crysta') {
              fallbackFare = 2300;
            } else if (normalizedVehicleId === 'tempo_traveller') {
              fallbackFare = 3800;
            } else {
              fallbackFare = 1800; // Default local fallback
            }
          } else if (tripType === 'outstation') {
            if (normalizedVehicleId === 'sedan') {
              fallbackFare = 2500;
            } else if (normalizedVehicleId === 'ertiga') {
              fallbackFare = 3000;
            } else if (normalizedVehicleId === 'innova_crysta') {
              fallbackFare = 3600;
            } else if (normalizedVehicleId === 'tempo_traveller') {
              fallbackFare = 4500;
            } else {
              fallbackFare = 3000; // Default outstation fallback
            }
          }
          
          newFares[cab.id] = fallbackFare;
          
          // Also store fare with normalized ID for consistent lookup
          if (normalizedVehicleId !== cab.id) {
            newFares[normalizedVehicleId] = fallbackFare;
          }
          
          console.log(`Using fallback fare for ${cab.id}: ${fallbackFare} (${tripType})`);
          
          // Dispatch event with fallback fare
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: cab.id,
              originalCabId: cab.id,
              normalizedCabId: normalizedVehicleId,
              fare: fallbackFare,
              tripType: tripType,
              timestamp: Date.now()
            }
          }));
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
      const normalizedVehicleId = normalizeVehicleId(selectedCab.id);
      
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        detail: {
          cabType: selectedCab.id,
          cabId: selectedCab.id,
          originalCabId: selectedCab.id,
          cabName: selectedCab.name,
          normalizedCabId: normalizedVehicleId,
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
    if (initialFareSync && cabTypes.length > 0) {
      calculateAllFares();
    }
  }, [cabTypes, tripType, tripMode, distance, hourlyPackage, pickupDate, initialFareSync]);
  
  // Handle cab selection
  const handleSelectCab = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    // Normalize vehicle ID for consistent lookup
    const normalizedVehicleId = normalizeVehicleId(cab.id);
    
    // Get fare for the selected cab
    const fare = cabFares[cab.id] || cabFares[normalizedVehicleId] || 0;
    
    if (fare > 0) {
      // Dispatch event for fare update
      window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
        detail: {
          cabType: cab.id,
          cabId: cab.id,
          originalCabId: cab.id,
          cabName: cab.name,
          normalizedCabId: normalizedVehicleId,
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
            [cab.id]: calculatedFare,
            [normalizedVehicleId]: calculatedFare,
          }));
          
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: cab.id,
              cabId: cab.id,
              originalCabId: cab.id,
              cabName: cab.name,
              normalizedCabId: normalizedVehicleId,
              fare: calculatedFare,
              tripType: tripType,
              tripMode: tripMode,
              timestamp: Date.now()
            }
          }));
        }
      }).catch(error => {
        console.error(`Error calculating fare for selected cab ${cab.id}:`, error);
        
        // Use fallbacks based on vehicle type and trip type
        let fallbackFare = 0;
        
        if (tripType === 'airport') {
          if (normalizedVehicleId === 'sedan') {
            fallbackFare = 1500;
          } else if (normalizedVehicleId === 'ertiga') {
            fallbackFare = 1800;
          } else if (normalizedVehicleId === 'innova_crysta') {
            fallbackFare = 2200;
          } else if (normalizedVehicleId === 'tempo_traveller') {
            fallbackFare = 3500;
          } else {
            fallbackFare = 1800; // Default airport fallback
          }
        } else if (tripType === 'local') {
          if (normalizedVehicleId === 'sedan') {
            fallbackFare = 1600;
          } else if (normalizedVehicleId === 'ertiga') {
            fallbackFare = 1900;
          } else if (normalizedVehicleId === 'innova_crysta') {
            fallbackFare = 2300;
          } else if (normalizedVehicleId === 'tempo_traveller') {
            fallbackFare = 3800;
          } else {
            fallbackFare = 1800; // Default local fallback
          }
        } else if (tripType === 'outstation') {
          if (normalizedVehicleId === 'sedan') {
            fallbackFare = 2500;
          } else if (normalizedVehicleId === 'ertiga') {
            fallbackFare = 3000;
          } else if (normalizedVehicleId === 'innova_crysta') {
            fallbackFare = 3600;
          } else if (normalizedVehicleId === 'tempo_traveller') {
            fallbackFare = 4500;
          } else {
            fallbackFare = 3000; // Default outstation fallback
          }
        }
        
        setCabFares(prevFares => ({
          ...prevFares,
          [cab.id]: fallbackFare,
          [normalizedVehicleId]: fallbackFare,
        }));
        
        window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
          detail: {
            cabType: cab.id,
            cabId: cab.id,
            originalCabId: cab.id,
            cabName: cab.name,
            normalizedCabId: normalizedVehicleId,
            fare: fallbackFare,
            tripType: tripType,
            tripMode: tripMode,
            timestamp: Date.now()
          }
        }));
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
