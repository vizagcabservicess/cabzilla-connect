
import React, { useEffect, useState } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';
import { loadTourFares } from '@/lib/tourData';

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
  const [forceFareRefresh, setForceFareRefresh] = useState(0);

  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    // Dispatch an event when cab is selected
    window.dispatchEvent(new CustomEvent('cab-selected', {
      detail: {
        cabType: cab.id,
        cabName: cab.name,
        tripType: tripType,
        timestamp: Date.now()
      }
    }));
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
  
  useEffect(() => {
    // Listen for tour fare updates
    const handleTourFaresUpdated = () => {
      console.log("Tour fares updated, refreshing cab options");
      setForceFareRefresh(prev => prev + 1);
    };
    
    window.addEventListener('tour-fares-updated', handleTourFaresUpdated);
    
    return () => {
      window.removeEventListener('tour-fares-updated', handleTourFaresUpdated);
    };
  }, []);
  
  // Load actual fares from localStorage or API
  useEffect(() => {
    setIsCalculatingFares(true);
    
    const fetchFares = async () => {
      try {
        // For tour trip type, load the tour fares
        if (tripType === 'tour') {
          const selectedTour = sessionStorage.getItem('selectedTour') || localStorage.getItem('selectedTour');
          
          if (!selectedTour) {
            console.warn("No selected tour found, using default fares");
            setIsCalculatingFares(false);
            return;
          }
          
          console.log(`Loading fares for selected tour: ${selectedTour}`);
          const tourFares = await loadTourFares(true); // Force refresh
          const currentFares: Record<string, number> = {};
          
          if (tourFares[selectedTour]) {
            console.log(`Found fares for tour ${selectedTour}:`, tourFares[selectedTour]);
            
            // Process each cab type to find its corresponding fare
            cabTypes.forEach(cab => {
              const cabId = cab.id.toLowerCase();
              
              // Try different ways to match cab with fare
              if (tourFares[selectedTour][cabId]) {
                // Direct match on cab ID
                currentFares[cab.id] = tourFares[selectedTour][cabId];
                console.log(`Direct fare match for ${cab.id}: ${currentFares[cab.id]}`);
              } 
              else if (cabId.includes('sedan') && tourFares[selectedTour].sedan) {
                // Match by vehicle type - sedan
                currentFares[cab.id] = tourFares[selectedTour].sedan;
                console.log(`Type match (sedan) for ${cab.id}: ${currentFares[cab.id]}`);
              } 
              else if (cabId.includes('ertiga') && tourFares[selectedTour].ertiga) {
                // Match by vehicle type - ertiga
                currentFares[cab.id] = tourFares[selectedTour].ertiga;
                console.log(`Type match (ertiga) for ${cab.id}: ${currentFares[cab.id]}`);
              } 
              else if (cabId.includes('innova_crysta') && tourFares[selectedTour].innova_crysta) {
                // Match by vehicle type - innova_crysta
                currentFares[cab.id] = tourFares[selectedTour].innova_crysta;
                console.log(`Type match (innova_crysta) for ${cab.id}: ${currentFares[cab.id]}`);
              } 
              else if (cabId.includes('innova') && tourFares[selectedTour].innova) {
                // Match by vehicle type - innova
                currentFares[cab.id] = tourFares[selectedTour].innova;
                console.log(`Type match (innova) for ${cab.id}: ${currentFares[cab.id]}`);
              } 
              else if (cabId.includes('tempo') && tourFares[selectedTour].tempo) {
                // Match by vehicle type - tempo
                currentFares[cab.id] = tourFares[selectedTour].tempo;
                console.log(`Type match (tempo) for ${cab.id}: ${currentFares[cab.id]}`);
              } 
              else if (cabId.includes('luxury') && tourFares[selectedTour].luxury) {
                // Match by vehicle type - luxury
                currentFares[cab.id] = tourFares[selectedTour].luxury;
                console.log(`Type match (luxury) for ${cab.id}: ${currentFares[cab.id]}`);
              }
              else if (cabId.includes('mpv') && tourFares[selectedTour].mpv) {
                // Match by vehicle type - mpv
                currentFares[cab.id] = tourFares[selectedTour].mpv;
                console.log(`Type match (mpv) for ${cab.id}: ${currentFares[cab.id]}`);
              }
              else if (cabId.includes('toyota') && tourFares[selectedTour].toyota) {
                // Match by vehicle type - toyota
                currentFares[cab.id] = tourFares[selectedTour].toyota;
                console.log(`Type match (toyota) for ${cab.id}: ${currentFares[cab.id]}`);
              }
              else if (cabId.includes('dzire') && tourFares[selectedTour].dzire_cng) {
                // Match by vehicle type - dzire_cng
                currentFares[cab.id] = tourFares[selectedTour].dzire_cng;
                console.log(`Type match (dzire_cng) for ${cab.id}: ${currentFares[cab.id]}`);
              }
              else if (cabId.includes('etios') && tourFares[selectedTour].etios) {
                // Match by vehicle type - etios
                currentFares[cab.id] = tourFares[selectedTour].etios;
                console.log(`Type match (etios) for ${cab.id}: ${currentFares[cab.id]}`);
              }
              else {
                // Fallback to a calculated fare based on distance
                const baseFare = distance * (
                  cabId.includes('luxury') ? 20 : 
                  cabId.includes('innova') ? 15 : 
                  cabId.includes('ertiga') ? 12 : 10
                );
                currentFares[cab.id] = Math.max(baseFare, 1500);
                console.log(`Calculated fare for ${cab.id}: ${currentFares[cab.id]}`);
              }
              
              // Ensure fare is not zero or unreasonably low for a tour
              if (currentFares[cab.id] <= 100) {
                const reasonableFare = distance * (
                  cabId.includes('luxury') ? 20 : 
                  cabId.includes('innova') ? 15 : 
                  cabId.includes('ertiga') ? 12 : 10
                );
                currentFares[cab.id] = Math.max(reasonableFare, 1500);
                console.log(`Using reasonable fare for ${cab.id}: ${currentFares[cab.id]}`);
              }
              
              // Store the calculated fare in localStorage for persistence
              try {
                localStorage.setItem(`fare_tour_${cab.id}`, currentFares[cab.id].toString());
              } catch (e) {
                console.warn(`Could not store fare for ${cab.id} in localStorage:`, e);
              }
            });
            
            // Update state with the calculated fares
            setCabFares(currentFares);
            
            // Dispatch an event with the fares for each cab
            cabTypes.forEach(cab => {
              if (currentFares[cab.id]) {
                window.dispatchEvent(new CustomEvent('fare-calculated', {
                  detail: {
                    cabId: cab.id,
                    cabName: cab.name,
                    fare: currentFares[cab.id],
                    tripType: 'tour',
                    tourId: selectedTour,
                    timestamp: Date.now()
                  }
                }));
              }
            });
            
            setIsCalculatingFares(false);
            return;
          } else {
            console.warn(`No fares found for tour ${selectedTour}`);
          }
        }
        
        // If not a tour or no selected tour, try to find actual fares from localStorage
        const loadActualFares = () => {
          const fares: Record<string, number> = {};
          
          // For each cab type, attempt to get the fare from localStorage
          cabTypes.forEach(cab => {
            try {
              // For local packages, check for the specific package fare
              if (tripType === 'local' && hourlyPackage) {
                // Try to load from price matrix in localStorage
                const priceMatrixStr = localStorage.getItem('localPackagePriceMatrix');
                if (priceMatrixStr) {
                  const priceMatrix = JSON.parse(priceMatrixStr);
                  
                  // Check if we have pricing for this specific package and cab
                  if (priceMatrix[hourlyPackage] && priceMatrix[hourlyPackage][cab.id.toLowerCase()]) {
                    fares[cab.id] = priceMatrix[hourlyPackage][cab.id.toLowerCase()];
                    console.log(`Found fare for ${cab.id} in price matrix: ${fares[cab.id]}`);
                    return;
                  }
                }
              }
              
              // If not found in price matrix or not a local package, check vehicle-specific localStorage
              const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
              const storedFare = localStorage.getItem(localStorageKey);
              if (storedFare) {
                fares[cab.id] = parseInt(storedFare, 10);
                console.log(`Found fare for ${cab.id} in localStorage: ${fares[cab.id]}`);
                return;
              }
              
              // If still not found, use a reasonable default fare
              if (!fares[cab.id]) {
                // Fallback to cab's pre-defined price if available
                if (cab.price && cab.price > 0) {
                  fares[cab.id] = cab.price;
                } else {
                  // Last resort - calculate a reasonable fare based on type
                  const baseFare = distance * (
                    cab.id.includes('luxury') ? 20 : 
                    cab.id.includes('innova') ? 15 : 
                    cab.id.includes('ertiga') ? 12 : 10
                  );
                  fares[cab.id] = Math.max(baseFare, 800); // Ensure minimum fare
                }
              }
            } catch (error) {
              console.error(`Error getting fare for ${cab.id}:`, error);
              // Fallback calculation
              fares[cab.id] = distance * (cab.id === 'luxury' ? 20 : cab.id === 'innova' ? 15 : 10);
            }
          });
          
          return fares;
        };
        
        // Set the calculated fares
        const actualFares = loadActualFares();
        setCabFares(actualFares);
      } catch (error) {
        console.error('Error loading actual fares:', error);
        // Fallback to simple calculation
        const fallbackFares: Record<string, number> = {};
        cabTypes.forEach(cab => {
          fallbackFares[cab.id] = distance * (cab.id === 'luxury' ? 20 : cab.id === 'innova' ? 15 : 10);
        });
        setCabFares(fallbackFares);
      } finally {
        setIsCalculatingFares(false);
      }
    };
    
    fetchFares();
  }, [cabTypes, distance, tripType, hourlyPackage, forceFareRefresh]);

  // Generate fare details string
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return 'Local package';
    } else if (tripType === 'airport') {
      return 'Airport transfer';
    } else if (tripType === 'tour') {
      return 'Tour package';
    } else {
      return tripMode === 'round-trip' ? 'Round trip' : 'One way';
    }
  };

  return (
    <CabList
      cabTypes={cabTypes}
      selectedCabId={selectedCab?.id || null}
      cabFares={cabFares}
      isCalculatingFares={isCalculatingFares}
      handleSelectCab={handleCabSelect}
      getFareDetails={getFareDetails}
    />
  );
};

// Add default export for backward compatibility
export default CabOptions;
