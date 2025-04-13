
import React, { useEffect, useState } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';

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
  
  // Load initial fares or update fares when trip details change
  useEffect(() => {
    const loadFares = () => {
      setIsCalculatingFares(true);
      
      try {
        const storedFares: Record<string, number> = {};
        let fareFound = false;
        
        // Try to load fares from localStorage for each cab
        cabTypes.forEach(cab => {
          if (!cab.id) return;
          
          // Check for existing fare in localStorage
          const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
          const storedFare = localStorage.getItem(localStorageKey);
          
          if (storedFare && !isNaN(Number(storedFare))) {
            const fareValue = parseInt(storedFare, 10);
            if (fareValue > 0) {
              storedFares[cab.id] = fareValue;
              fareFound = true;
              console.log(`CabOptions: Loaded fare from localStorage for ${cab.id}: ${fareValue}`);
            }
          }
          
          // For local packages, try to get package price
          if (tripType === 'local' && hourlyPackage && !storedFares[cab.id]) {
            try {
              // Get from local price matrix if available
              const priceMatrixStr = localStorage.getItem('localPackagePriceMatrix');
              if (priceMatrixStr) {
                const priceMatrix = JSON.parse(priceMatrixStr);
                if (priceMatrix[hourlyPackage] && priceMatrix[hourlyPackage][cab.id.toLowerCase()]) {
                  const packagePrice = priceMatrix[hourlyPackage][cab.id.toLowerCase()];
                  if (packagePrice > 0) {
                    storedFares[cab.id] = packagePrice;
                    fareFound = true;
                    console.log(`CabOptions: Loaded package price for ${cab.id}: ${packagePrice}`);
                  }
                }
              }
            } catch (error) {
              console.error('Error getting package price:', error);
            }
          }
          
          // Use cab's default price as fallback
          if (!storedFares[cab.id] && cab.price && cab.price > 0) {
            storedFares[cab.id] = cab.price;
            console.log(`CabOptions: Using default price for ${cab.id}: ${cab.price}`);
            fareFound = true;
          }
          
          // Last resort: generate a reasonable default price based on vehicle type
          if (!storedFares[cab.id] || storedFares[cab.id] <= 0) {
            let baseFare = 0;
            
            if (tripType === 'local') {
              // Local package pricing
              if (cab.id.includes('sedan')) baseFare = 1500;
              else if (cab.id.includes('ertiga')) baseFare = 1800;
              else if (cab.id.includes('innova')) baseFare = 2400;
              else baseFare = 1800;
              
              // Adjust based on package
              if (hourlyPackage === '4hrs-40km') {
                baseFare = Math.round(baseFare * 0.6); // 60% of 8hr package
              } else if (hourlyPackage === '10hrs-100km') {
                baseFare = Math.round(baseFare * 1.2); // 120% of 8hr package
              }
            } else if (tripType === 'airport') {
              // Airport transfer pricing
              if (cab.id.includes('sedan')) baseFare = 899;
              else if (cab.id.includes('ertiga')) baseFare = 1199;
              else if (cab.id.includes('innova')) baseFare = 1499;
              else baseFare = 999;
              
              // Adjust based on distance
              if (distance > 20) {
                const extraKm = distance - 20;
                const perKmRate = cab.id.includes('sedan') ? 11 : 
                                 cab.id.includes('ertiga') ? 14 : 
                                 cab.id.includes('innova') ? 18 : 12;
                baseFare += extraKm * perKmRate;
              }
            } else {
              // Outstation pricing
              const basePrice = cab.id?.includes('sedan') ? 11 : 
                                cab.id?.includes('ertiga') ? 14 : 
                                cab.id?.includes('innova') ? 18 : 12;
              
              // Calculate base fare depending on journey type
              const minKm = 300;
              const effectiveDistance = tripMode === 'one-way' ? Math.max(distance * 2, minKm) : Math.max(distance, minKm);
              baseFare = Math.round(effectiveDistance * basePrice);
              
              // Add driver allowance for outstation
              const driverAllowance = cab.driverAllowance || 250;
              baseFare += driverAllowance;
            }
            
            if (baseFare > 0) {
              storedFares[cab.id] = baseFare;
              fareFound = true;
              
              // Save this calculated fare to localStorage
              try {
                const localStorageKey = `fare_${tripType}_${cab.id.toLowerCase()}`;
                localStorage.setItem(localStorageKey, baseFare.toString());
              } catch (error) {
                console.error('Error storing calculated fare in localStorage:', error);
              }
            }
          }
        });
        
        if (fareFound) {
          setCabFares(storedFares);
          console.log('CabOptions: Loaded fares', storedFares);
          
          // If we have a selected cab, notify about its fare
          if (selectedCab && selectedCab.id && storedFares[selectedCab.id]) {
            const fare = storedFares[selectedCab.id];
            
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
        }
      } catch (error) {
        console.error('Error loading fares:', error);
      }
      
      setIsCalculatingFares(false);
    };
    
    // Store current trip type for fare calculations
    if (tripType) {
      try {
        localStorage.setItem('tripType', tripType.toString());
      } catch (error) {
        console.error('Error storing trip type:', error);
      }
    }
    
    // Load fares
    loadFares();
    
    // Listen for fare cache cleared events
    const handleFareCacheCleared = () => {
      console.log('CabOptions: Fare cache cleared, reloading fares');
      loadFares();
    };
    
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
    };
  }, [cabTypes, tripType, tripMode, distance, hourlyPackage, selectedCab]);

  // Handle cab selection
  const handleSelectCab = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    // Store current trip type in localStorage for consistent fare calculation
    try {
      localStorage.setItem('tripType', tripType.toString());
    } catch (error) {
      console.error('Error storing trip type:', error);
    }
    
    // Get fare for the selected cab
    const fare = cabFares[cab.id] || 0;
    
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
