import React, { useEffect, useState, useCallback } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';
import { getLocalPackagePrice, normalizePackageId, fetchAndCacheLocalFares } from '@/lib/packageData';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from './ui/button';

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
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState<boolean>(true);
  const [fareErrors, setFareErrors] = useState<Record<string, string>>({});
  const [lastFareUpdate, setLastFareUpdate] = useState<number>(Date.now());
  const [pendingBookingSummaryFareRequests, setPendingBookingSummaryFareRequests] = useState<Record<string, boolean>>({});
  const [fareUpdateTriggered, setFareUpdateTriggered] = useState<boolean>(false);
  const [initialAirportFaresLoaded, setInitialAirportFaresLoaded] = useState<boolean>(false);
  const [isForceRefreshing, setIsForceRefreshing] = useState<boolean>(false);

  useEffect(() => {
    sessionStorage.setItem('tripType', tripType.toString());
    
    try {
      window.dispatchEvent(new CustomEvent('trip-type-changed', {
        detail: {
          tripType: tripType,
          tripMode: tripMode,
          timestamp: Date.now()
        }
      }));
      console.log(`CabOptions: Dispatched trip-type-changed event for ${tripType}`);
      
      if (tripType === "airport") {
        setInitialAirportFaresLoaded(false);
        
        if (!initialAirportFaresLoaded) {
          preloadAirportFares();
        }
        
        setFareUpdateTriggered(false);
      } else if (tripType === 'local' && hourlyPackage) {
        loadLocalPackageFares(true); // Force refresh to always get latest prices
      }
    } catch (error) {
      console.error('Error dispatching trip type change event:', error);
    }
  }, [tripType, tripMode]);
  
  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      loadLocalPackageFares(true); // Force refresh to always get latest prices
    }
  }, [hourlyPackage, tripType]);

  // Listen for fare retrieval events from other components
  useEffect(() => {
    const handleFareRetrieved = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.vehicleId && customEvent.detail.price) {
        const { vehicleId, price } = customEvent.detail;
        
        setCabFares(prev => ({
          ...prev,
          [vehicleId]: price
        }));
        
        console.log(`Updated fare for ${vehicleId} from event: ${price}`);
      }
    };
    
    window.addEventListener('fare-retrieved', handleFareRetrieved);
    
    // Initial fare load from localStorage if available
    if (tripType === 'local' && hourlyPackage) {
      const normalizedPackageId = normalizePackageId(hourlyPackage);
      const storedFares: Record<string, number> = {};
      let foundFares = false;
      
      cabTypes.forEach(cab => {
        const specificFareKey = `fare_local_${cab.id}_${normalizedPackageId}`;
        const storedFare = localStorage.getItem(specificFareKey);
        
        if (storedFare) {
          const parsedFare = parseFloat(storedFare);
          if (!isNaN(parsedFare) && parsedFare > 0) {
            storedFares[cab.id] = parsedFare;
            foundFares = true;
          }
        }
      });
      
      if (foundFares) {
        setCabFares(prev => ({
          ...prev,
          ...storedFares
        }));
        console.log('Loaded initial fares from localStorage', storedFares);
      }
    }
    
    return () => {
      window.removeEventListener('fare-retrieved', handleFareRetrieved);
    };
  }, [cabTypes, hourlyPackage, tripType]);
  
  const loadLocalPackageFares = async (forceRefresh = false) => {
    if (tripType !== 'local' || !hourlyPackage) return;
    
    console.log('CabOptions: Loading local package fares, forceRefresh:', forceRefresh);
    setIsCalculatingFares(true);
    setFareErrors({});
    
    try {
      // Prefetch all fares in bulk to speed up operation
      await fetchAndCacheLocalFares(true);
      
      const normalizedPackageId = normalizePackageId(hourlyPackage);
      console.log(`Loading fares for normalized package: ${normalizedPackageId}`);
      
      const updatedFares: Record<string, number> = {};
      const updatedErrors: Record<string, string> = {};
      
      // Process in parallel for better performance
      const farePromises = cabTypes.map(async (cab) => {
        try {
          // Always get price from API with forceRefresh flag to ensure latest data
          const price = await getLocalPackagePrice(normalizedPackageId, cab.id, forceRefresh);
          
          if (price > 0) {
            return { id: cab.id, price, success: true };
          } else {
            return { id: cab.id, error: `Price not available for ${cab.name}`, success: false };
          }
        } catch (error) {
          console.error(`Error getting fare for ${cab.id}:`, error);
          return { 
            id: cab.id, 
            error: error instanceof Error ? error.message : 'Price unavailable',
            success: false
          };
        }
      });
      
      const results = await Promise.all(farePromises);
      
      results.forEach(result => {
        if (result.success && 'price' in result) {
          updatedFares[result.id] = result.price;
          
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: result.id,
              tripType: 'local',
              tripMode: tripMode,
              hourlyPackage: normalizedPackageId,
              calculated: true,
              fare: result.price,
              timestamp: Date.now(),
              source: 'api'
            }
          }));
          
          console.log(`Set fare for ${result.id}: ${result.price} (refreshed from API)`);
        } else if ('error' in result) {
          updatedErrors[result.id] = result.error;
        }
      });
      
      setCabFares(prev => ({
        ...prev,
        ...updatedFares
      }));
      
      setFareErrors(updatedErrors);
      setLastFareUpdate(Date.now());
    } catch (error) {
      console.error('Error loading local package fares:', error);
      setFareErrors({ global: 'Failed to load fares. Please try again.' });
      
      toast.error('Failed to load package fares. Please try again.');
    } finally {
      setIsCalculatingFares(false);
      setIsForceRefreshing(false);
    }
  };

  const preloadAirportFares = () => {
    if (tripType !== 'airport' || initialAirportFaresLoaded) return;
    
    console.log('CabOptions: Preloading airport fares for all cabs');
    
    cabTypes.forEach((cab, index) => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('request-fare-calculation', {
          detail: {
            cabId: cab.id,
            cabName: cab.name,
            tripType: 'airport',
            timestamp: Date.now() + index
          }
        }));
      }, index * 100);
    });
    
    setInitialAirportFaresLoaded(true);
  };

  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
    setHasSelectedCab(true);
    
    sessionStorage.setItem('tripType', tripType.toString());
    
    const now = Date.now();
    
    try {
      window.dispatchEvent(new CustomEvent('cab-selected', {
        detail: {
          cabType: cab.id,
          cabName: cab.name,
          tripType: tripType,
          tripMode: tripMode,
          timestamp: now
        }
      }));
      
      if (tripType === 'local' && hourlyPackage) {
        setIsCalculatingFares(true);
        
        const normalizedPackageId = normalizePackageId(hourlyPackage);
        console.log(`Getting price for selected cab ${cab.id} with normalized package: ${normalizedPackageId}`);
        
        // Force refresh to ensure we get latest price from API
        getLocalPackagePrice(normalizedPackageId, cab.id, true)
          .then(price => {
            if (price > 0) {
              setCabFares(prev => ({
                ...prev,
                [cab.id]: price
              }));
              
              // Store in localStorage with package-specific key for precise lookup
              const preciseFareKey = `fare_local_${cab.id.toLowerCase().replace(/\s+/g, '')}_${normalizedPackageId}`;
              localStorage.setItem(preciseFareKey, price.toString());
              
              // Also store with the original format for backward compatibility
              const localStorageKey = `fare_local_${cab.id.toLowerCase().replace(/\s+/g, '')}`;
              localStorage.setItem(localStorageKey, price.toString());
              
              // Set again with the selected fare for better tracking
              const selectedFareKey = `selected_fare_${cab.id.toLowerCase().replace(/\s+/g, '')}_${normalizedPackageId}`;
              localStorage.setItem(selectedFareKey, price.toString());
              
              // Dispatch event to update booking summary
              window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
                detail: {
                  cabType: cab.id,
                  cabName: cab.name,
                  fare: price,
                  tripType: tripType,
                  tripMode: tripMode,
                  hourlyPackage: normalizedPackageId,
                  timestamp: now + 1,
                  source: 'api'
                }
              }));
              
              // Also dispatch fare-calculated event for other components
              window.dispatchEvent(new CustomEvent('fare-calculated', {
                detail: {
                  cabId: cab.id,
                  cabName: cab.name,
                  tripType: tripType,
                  tripMode: tripMode,
                  hourlyPackage: normalizedPackageId,
                  calculated: true,
                  fare: price,
                  timestamp: now + 2,
                  source: 'api'
                }
              }));
              
              console.log(`CabOptions: Dispatched fare update event for ${cab.id}: ${price}`);
            } else {
              setFareErrors(prev => ({
                ...prev,
                [cab.id]: 'Price not available'
              }));
              toast.error(`Could not retrieve price for ${cab.name}`);
            }
            setIsCalculatingFares(false);
          })
          .catch(error => {
            console.error(`Error getting fare for ${cab.id}:`, error);
            setFareErrors(prev => ({
              ...prev,
              [cab.id]: error instanceof Error ? error.message : 'Price unavailable'
            }));
            toast.error(`Could not retrieve price for ${cab.name}`);
            setIsCalculatingFares(false);
            
            window.dispatchEvent(new CustomEvent('cab-selected-with-error', {
              detail: {
                cabType: cab.id,
                cabName: cab.name,
                error: error instanceof Error ? error.message : 'Price unavailable',
                tripType: tripType,
                tripMode: tripMode,
                hourlyPackage: normalizedPackageId,
                timestamp: now + 1
              }
            }));
          });
      } else if (cabFares[cab.id] > 0) {
        // For other trip types, use the calculated fare if available
        window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
          detail: {
            cabType: cab.id,
            cabName: cab.name,
            fare: cabFares[cab.id],
            tripType: tripType,
            tripMode: tripMode,
            timestamp: now + 1
          }
        }));
        console.log(`CabOptions: Dispatched fare update event for ${cab.id}: ${cabFares[cab.id]}`);
      }
      
      if (tripType === 'airport' && !pendingBookingSummaryFareRequests[cab.id]) {
        setPendingBookingSummaryFareRequests(prev => ({
          ...prev,
          [cab.id]: true
        }));
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('request-fare-calculation', {
            detail: {
              cabId: cab.id,
              cabName: cab.name,
              tripType: tripType,
              tripMode: tripMode,
              timestamp: now + 2
            }
          }));
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('request-booking-summary-fare', {
              detail: {
                cabId: cab.id,
                cabName: cab.name,
                tripType: tripType,
                tripMode: tripMode,
                timestamp: now + 3
              }
            }));
            
            setTimeout(() => {
              setPendingBookingSummaryFareRequests(prev => ({
                ...prev,
                [cab.id]: false
              }));
            }, 1000);
          }, 100);
        }, 0);
      }
    } catch (error) {
      console.error('Error dispatching cab selection event:', error);
      toast.error('Error selecting cab. Please try again.');
    }
  };

  useEffect(() => {
    if (selectedCab && hasSelectedCab) {
      setTimeout(() => {
        const bookingSummaryElement = document.getElementById('booking-summary');
        if (bookingSummaryElement) {
          bookingSummaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          const alternativeSummaryElement = 
            document.querySelector('[id*="summary" i], [class*="summary" i]') || 
            document.querySelector('[id*="book" i], [class*="book" i]');
          
          if (alternativeSummaryElement) {
            alternativeSummaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        setHasSelectedCab(false);
      }, 100);
    }
  }, [selectedCab, hasSelectedCab]);

  useEffect(() => {
    setIsCalculatingFares(true);
    
    try {
      if (tripType === 'local' && hourlyPackage) {
        loadLocalPackageFares(true); // Always force refresh to ensure latest API prices
      } else if (tripType === 'airport' && !fareUpdateTriggered) {
        setTimeout(() => {
          if (!initialAirportFaresLoaded) {
            preloadAirportFares();
          }
          setFareUpdateTriggered(true);
          setIsCalculatingFares(false);
        }, 500);
      } else {
        // This path should never be used since we want to get all prices from API
        // but keeping it as failsafe if other load methods fail
        const calculatedFares: Record<string, number> = {};
        cabTypes.forEach(cab => {
          if (cab.price && cab.price > 0) {
            calculatedFares[cab.id] = cab.price;
          } else {
            // This shouldn't be used, but serving as last resort fallback
            const baseFare = distance * (
              cab.id.includes('luxury') ? 20 : 
              cab.id.includes('innova') ? 15 : 
              cab.id.includes('ertiga') ? 12 : 10
            );
            calculatedFares[cab.id] = Math.max(baseFare, 800);
          }
        });
        setCabFares(calculatedFares);
        setIsCalculatingFares(false);
      }
      
      if (selectedCab && tripType === 'local' && hourlyPackage) {
        // Force refresh to ensure consistent pricing for selected cab
        const normalizedPackageId = normalizePackageId(hourlyPackage);
        
        getLocalPackagePrice(normalizedPackageId, selectedCab.id, true)
          .then(price => {
            if (price > 0) {
              setCabFares(prev => ({
                ...prev,
                [selectedCab.id]: price
              }));
              
              // Store in localStorage with package-specific key for precise lookup
              const preciseFareKey = `fare_local_${selectedCab.id.toLowerCase().replace(/\s+/g, '')}_${normalizedPackageId}`;
              localStorage.setItem(preciseFareKey, price.toString());
              
              // Also store with the original format for backward compatibility
              const localStorageKey = `fare_local_${selectedCab.id.toLowerCase().replace(/\s+/g, '')}`;
              localStorage.setItem(localStorageKey, price.toString());
              
              // Set again with the selected fare for better tracking
              const selectedFareKey = `selected_fare_${selectedCab.id.toLowerCase().replace(/\s+/g, '')}_${normalizedPackageId}`;
              localStorage.setItem(selectedFareKey, price.toString());
              
              window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
                detail: {
                  cabType: selectedCab.id,
                  cabName: selectedCab.name,
                  fare: price,
                  tripType: tripType,
                  tripMode: tripMode,
                  hourlyPackage: normalizedPackageId,
                  timestamp: Date.now(),
                  source: 'api'
                }
              }));
              
              // Also dispatch fare-calculated event for other components
              window.dispatchEvent(new CustomEvent('fare-calculated', {
                detail: {
                  cabId: selectedCab.id,
                  cabName: selectedCab.name,
                  tripType: tripType,
                  tripMode: tripMode,
                  hourlyPackage: normalizedPackageId,
                  calculated: true,
                  fare: price,
                  timestamp: Date.now() + 1,
                  source: 'api'
                }
              }));
              
              console.log(`CabOptions: Dispatched fare update event for existing selected cab ${selectedCab.id}: ${price}`);
            }
          })
          .catch(error => {
            console.error(`Error refreshing price for selected cab ${selectedCab.id}:`, error);
          });
      }
    } catch (error) {
      console.error('Error setting up cab options fares:', error);
      setIsCalculatingFares(false);
    }
  }, [cabTypes, distance, hourlyPackage, selectedCab, tripMode, tripType]);

  const handleForceRefresh = useCallback(() => {
    if (isForceRefreshing) return;
    
    setIsForceRefreshing(true);
    setIsCalculatingFares(true);
    
    if (tripType === 'local' && hourlyPackage) {
      loadLocalPackageFares(true);
    } else {
      setIsForceRefreshing(false);
      setIsCalculatingFares(false);
    }
    
    toast.success('Refreshing prices from API...');
  }, [hourlyPackage, tripType, isForceRefreshing]);

  if (fareErrors.global) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{fareErrors.global}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Choose Your Vehicle</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1" 
          onClick={handleForceRefresh}
          disabled={isForceRefreshing || isCalculatingFares}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isForceRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Prices</span>
        </Button>
      </div>
      
      <CabList
        cabTypes={cabTypes}
        selectedCabId={selectedCab?.id}
        onSelectCab={handleCabSelect}
        distance={distance}
        tripType={tripType}
        tripMode={tripMode}
        cabPrices={cabFares}
        isCalculating={isCalculatingFares}
        hourlyPackage={hourlyPackage}
        pickupDate={pickupDate}
        returnDate={returnDate}
      />
    </div>
  );
};

export default CabOptions;
