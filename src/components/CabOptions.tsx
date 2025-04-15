import React, { useEffect, useState } from 'react';
import { CabList } from './cab-options/CabList';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';
import { getLocalPackagePrice } from '@/lib/packageData';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

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
        loadLocalPackageFares();
      }
    } catch (error) {
      console.error('Error dispatching trip type change event:', error);
    }
  }, [tripType, tripMode]);
  
  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      loadLocalPackageFares();
    }
  }, [hourlyPackage, tripType]);
  
  const loadLocalPackageFares = async () => {
    if (tripType !== 'local' || !hourlyPackage) return;
    
    console.log('CabOptions: Loading local package fares');
    setIsCalculatingFares(true);
    setFareErrors({});
    
    try {
      const updatedFares: Record<string, number> = {};
      const updatedErrors: Record<string, string> = {};
      
      await Promise.all(cabTypes.map(async (cab) => {
        try {
          // Get price from our cached/default system
          const price = await getLocalPackagePrice(hourlyPackage, cab.id, false);
          if (price > 0) {
            updatedFares[cab.id] = price;
            
            // Store in localStorage for consistency
            const localStorageKey = `fare_local_${cab.id.toLowerCase().replace(/\s+/g, '')}`;
            localStorage.setItem(localStorageKey, price.toString());
            
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: cab.id,
                tripType: 'local',
                tripMode: tripMode,
                hourlyPackage,
                calculated: true,
                fare: price,
                timestamp: Date.now()
              }
            }));
          } else {
            updatedErrors[cab.id] = `Price not available for ${cab.name}`;
          }
        } catch (error) {
          console.error(`Error getting fare for ${cab.id}:`, error);
          updatedErrors[cab.id] = error instanceof Error ? error.message : 'Price unavailable';
        }
      }));
      
      setCabFares(updatedFares);
      setFareErrors(updatedErrors);
      setLastFareUpdate(Date.now());
    } catch (error) {
      console.error('Error loading local package fares:', error);
      setFareErrors({ global: 'Failed to load fares. Please try again.' });
      
      toast.error('Failed to load package fares. Please try again.');
    } finally {
      setIsCalculatingFares(false);
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
    
    const cabFare = cabFares[cab.id] || 0;
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
        getLocalPackagePrice(hourlyPackage, cab.id, false)
          .then(price => {
            if (price > 0) {
              setCabFares(prev => ({
                ...prev,
                [cab.id]: price
              }));
              
              // Store in localStorage for consistency
              const localStorageKey = `fare_local_${cab.id.toLowerCase().replace(/\s+/g, '')}`;
              localStorage.setItem(localStorageKey, price.toString());
              
              window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
                detail: {
                  cabType: cab.id,
                  cabName: cab.name,
                  fare: price,
                  tripType: tripType,
                  tripMode: tripMode,
                  hourlyPackage,
                  timestamp: now + 1
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
                hourlyPackage,
                timestamp: now + 1
              }
            }));
          });
      } else {
        window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
          detail: {
            cabType: cab.id,
            cabName: cab.name,
            fare: cabFare,
            tripType: tripType,
            tripMode: tripMode,
            timestamp: now + 1
          }
        }));
        console.log(`CabOptions: Dispatched fare update event for ${cab.id}: ${cabFare}`);
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
        loadLocalPackageFares();
      } else if (tripType === 'airport' && !fareUpdateTriggered) {
        setTimeout(() => {
          if (!initialAirportFaresLoaded) {
            preloadAirportFares();
          }
          setFareUpdateTriggered(true);
          setIsCalculatingFares(false);
        }, 500);
      } else {
        const calculatedFares: Record<string, number> = {};
        cabTypes.forEach(cab => {
          if (cab.price && cab.price > 0) {
            calculatedFares[cab.id] = cab.price;
          } else {
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
        getLocalPackagePrice(hourlyPackage, selectedCab.id)
          .then(price => {
            if (price > 0) {
              setCabFares(prev => ({
                ...prev,
                [selectedCab.id]: price
              }));
              
              window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
                detail: {
                  cabType: selectedCab.id,
                  cabName: selectedCab.name,
                  fare: price,
                  tripType: tripType,
                  tripMode: tripMode,
                  hourlyPackage,
                  timestamp: Date.now()
                }
              }));
              console.log(`CabOptions: Dispatched fare update event for existing selected cab ${selectedCab.id}: ${price}`);
            } else {
              setFareErrors(prev => ({
                ...prev,
                [selectedCab.id]: 'Price not available'
              }));
            }
          })
          .catch(error => {
            console.error(`Error getting fare for ${selectedCab.id}:`, error);
            setFareErrors(prev => ({
              ...prev,
              [selectedCab.id]: error instanceof Error ? error.message : 'Price unavailable'
            }));
          });
      }
    } catch (error) {
      console.error('Error loading fares:', error);
      setFareErrors({ global: 'Failed to load fares. Please try again.' });
    }
  }, [cabTypes, distance, tripType, hourlyPackage, selectedCab, tripMode, fareUpdateTriggered]);

  useEffect(() => {
    const handleFareCalculated = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.fare > 0) {
        const { cabId, fare, tripType: eventTripType, calculated = false } = event.detail;
        console.log(`CabOptions: Received fare-calculated event for ${cabId}: ${fare}, calculated=${calculated}`);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabId]: fare };
          return updated;
        });
        
        setFareErrors(prev => {
          const updated = { ...prev };
          delete updated[cabId];
          return updated;
        });
        
        setLastFareUpdate(Date.now());
        
        if (selectedCab?.id === cabId) {
          try {
            window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
              detail: {
                cabType: cabId,
                cabName: selectedCab.name,
                fare: fare,
                tripType: tripType,
                tripMode: tripMode,
                hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
                timestamp: Date.now()
              }
            }));
            console.log(`CabOptions: Re-emitted fare update for selected cab ${cabId}: ${fare}`);
          } catch (error) {
            console.error('Error dispatching cab selection event:', error);
          }
        }
      }
    };
    
    const handleDirectFareUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.cabType && event.detail.fare > 0) {
        const { cabType, fare, calculated = false } = event.detail;
        console.log(`CabOptions: Received direct fare update for ${cabType}: ${fare}, calculated=${calculated}`);
        
        setCabFares(prev => {
          const updated = { ...prev, [cabType]: fare };
          return updated;
        });
        
        setFareErrors(prev => {
          const updated = { ...prev };
          delete updated[cabType];
          return updated;
        });
        
        setLastFareUpdate(Date.now());
      }
    };
    
    const handleFareError = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && event.detail.error) {
        const { cabId, error } = event.detail;
        console.log(`CabOptions: Received fare error for ${cabId}: ${error}`);
        
        setFareErrors(prev => ({
          ...prev,
          [cabId]: error
        }));
      }
    };
    
    const handleRequestFareCalculation = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId && selectedCab?.id === event.detail.cabId) {
        console.log(`CabOptions: Received fare recalculation request for ${event.detail.cabId}`);
        
        if (tripType === 'local' && hourlyPackage) {
          getLocalPackagePrice(hourlyPackage, event.detail.cabId)
            .then(price => {
              if (price > 0) {
                setCabFares(prev => ({
                  ...prev,
                  [event.detail.cabId]: price
                }));
                
                window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
                  detail: {
                    cabType: event.detail.cabId,
                    cabName: event.detail.cabName || selectedCab.name,
                    fare: price,
                    tripType: tripType,
                    tripMode: tripMode,
                    hourlyPackage,
                    timestamp: Date.now()
                  }
                }));
              } else {
                setFareErrors(prev => ({
                  ...prev,
                  [event.detail.cabId]: 'Price not available'
                }));
              }
            })
            .catch(error => {
              console.error(`Error getting fare for ${event.detail.cabId}:`, error);
              setFareErrors(prev => ({
                ...prev,
                [event.detail.cabId]: error instanceof Error ? error.message : 'Price unavailable'
              }));
            });
        } else if (cabFares[event.detail.cabId] > 0) {
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            detail: {
              cabType: event.detail.cabId,
              cabName: event.detail.cabName || selectedCab.name,
              fare: cabFares[event.detail.cabId],
              tripType: tripType,
              tripMode: tripMode,
              hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
              timestamp: Date.now()
            }
          }));
        }
      }
    };
    
    const handleLocalFaresUpdated = () => {
      console.log('CabOptions: Detected local fares updated event, refreshing fares');
      if (tripType === 'local' && hourlyPackage) {
        loadLocalPackageFares();
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
    window.addEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated as EventListener);
    window.addEventListener('fare-error', handleFareError as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleDirectFareUpdate as EventListener);
      window.removeEventListener('request-fare-calculation', handleRequestFareCalculation as EventListener);
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated as EventListener);
      window.removeEventListener('fare-error', handleFareError as EventListener);
    };
  }, [cabFares, selectedCab, tripType, tripMode, hourlyPackage]);

  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return 'Local package';
    } else if (tripType === 'airport') {
      return 'Airport transfer';
    } else {
      return tripMode === 'round-trip' ? 'Round trip' : 'One way';
    }
  };

  if (fareErrors.global) {
    return (
      <>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {fareErrors.global}
          </AlertDescription>
        </Alert>
        <CabList
          cabTypes={cabTypes}
          selectedCabId={selectedCab?.id || null}
          cabFares={{}}
          isCalculatingFares={isCalculatingFares}
          handleSelectCab={handleCabSelect}
          getFareDetails={getFareDetails}
        />
      </>
    );
  }

  return (
    <CabList
      cabTypes={cabTypes}
      selectedCabId={selectedCab?.id || null}
      cabFares={cabFares}
      isCalculatingFares={isCalculatingFares}
      cabErrors={fareErrors}
      handleSelectCab={handleCabSelect}
      getFareDetails={getFareDetails}
    />
  );
};

export default CabOptions;
