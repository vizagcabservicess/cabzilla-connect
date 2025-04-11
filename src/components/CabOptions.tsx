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

  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
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
  
  // Load actual fares from localStorage or API
  useEffect(() => {
    setIsCalculatingFares(true);
    
    const fetchFares = async () => {
      try {
        // For tour trip type, load the tour fares
        if (tripType === 'tour') {
          const tourFares = await loadTourFares();
          const currentFares: Record<string, number> = {};
          
          // Get the selected tour ID from sessionStorage or localStorage
          const selectedTour = sessionStorage.getItem('selectedTour') || localStorage.getItem('selectedTour');
          
          if (selectedTour && tourFares[selectedTour]) {
            console.log(`Loading tour fares for ${selectedTour}:`, tourFares[selectedTour]);
            
            cabTypes.forEach(cab => {
              const cabId = cab.id.toLowerCase();
              const normalizedCabId = cabId.replace(/[^a-z0-9_]/g, '_');
              let fare = 0;
              
              // Try to find the fare for this cab using various matching strategies
              // First try direct match on cab ID
              if (tourFares[selectedTour][cabId]) {
                fare = tourFares[selectedTour][cabId];
                console.log(`Found exact fare match for ${cabId}: ${fare}`);
              } 
              // Then try normalized version
              else if (tourFares[selectedTour][normalizedCabId]) {
                fare = tourFares[selectedTour][normalizedCabId];
                console.log(`Found normalized fare match for ${normalizedCabId}: ${fare}`);
              } 
              // Try vehicle type mappings
              else if (cabId.includes('sedan') && tourFares[selectedTour].sedan) {
                fare = tourFares[selectedTour].sedan;
                console.log(`Using sedan fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('innova_crysta') && tourFares[selectedTour].innova_crysta) {
                fare = tourFares[selectedTour].innova_crysta;
                console.log(`Using innova_crysta fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('innova') && tourFares[selectedTour].innova) {
                fare = tourFares[selectedTour].innova;
                console.log(`Using innova fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('ertiga') && tourFares[selectedTour].ertiga) {
                fare = tourFares[selectedTour].ertiga;
                console.log(`Using ertiga fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('tempo') && tourFares[selectedTour].tempo) {
                fare = tourFares[selectedTour].tempo;
                console.log(`Using tempo fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('luxury') && tourFares[selectedTour].luxury) {
                fare = tourFares[selectedTour].luxury;
                console.log(`Using luxury fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('dzire') && tourFares[selectedTour].dzire_cng) {
                fare = tourFares[selectedTour].dzire_cng;
                console.log(`Using dzire_cng fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('toyota') && tourFares[selectedTour].toyota) {
                fare = tourFares[selectedTour].toyota;
                console.log(`Using toyota fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('etios') && tourFares[selectedTour].etios) {
                fare = tourFares[selectedTour].etios;
                console.log(`Using etios fare for ${cabId}: ${fare}`);
              } else if (cabId.includes('mpv') && tourFares[selectedTour].mpv) {
                fare = tourFares[selectedTour].mpv;
                console.log(`Using mpv fare for ${cabId}: ${fare}`);
              } else {
                // Fallback to cab's pre-defined price if available
                if (cab.price && cab.price > 0) {
                  fare = cab.price;
                  console.log(`Using predefined price for ${cabId}: ${fare}`);
                } else {
                  // Last resort - calculate a reasonable fare based on type
                  const baseFare = distance * (
                    cabId.includes('luxury') ? 20 : 
                    cabId.includes('innova') ? 15 : 
                    cabId.includes('ertiga') ? 12 : 10
                  );
                  fare = Math.max(baseFare, 800); // Ensure minimum fare
                  console.log(`Using calculated fare for ${cabId}: ${fare}`);
                }
              }
              
              // Set the fare in our local state
              currentFares[cab.id] = fare;
              
              // Also store it in localStorage for persistence
              try {
                localStorage.setItem(`fare_tour_${cab.id.toLowerCase()}`, fare.toString());
              } catch (e) {
                console.warn(`Could not store fare for ${cab.id} in localStorage:`, e);
              }
            });
            
            console.log("Tour fares loaded successfully:", currentFares);
            setCabFares(currentFares);
            setIsCalculatingFares(false);
            return; // Exit early after setting tour fares
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
  }, [cabTypes, distance, tripType, hourlyPackage]);

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
