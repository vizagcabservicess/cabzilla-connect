
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { CabOptionCard } from './CabOptionCard';
import { useCabOptions } from './cab-options/useCabOptions';
import { CabLoading } from './cab-options/CabLoading';
import { CabOptionsHeader } from './cab-options/CabOptionsHeader';
import { CabRefreshWarning } from './cab-options/CabRefreshWarning';
import { EmptyCabList } from './cab-options/EmptyCabList';
import { CabList } from './cab-options/CabList';
import { useState, useEffect, useRef } from 'react';
import { calculateFare, clearFareCache } from '@/lib/fareCalculationService';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';
import { reloadCabTypes } from '@/lib/cabData';

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType?: TripType;
  tripMode?: TripMode;
  pickupDate?: Date;
  returnDate?: Date;
  hourlyPackage?: string;
}

export function CabOptions({
  cabTypes: initialCabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType = 'outstation',
  tripMode = 'one-way',
  pickupDate,
  returnDate,
  hourlyPackage
}: CabOptionsProps) {
  const [selectedCabId, setSelectedCabId] = useState<string | null>(selectedCab?.id || null);
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);
  const [refreshSuccessful, setRefreshSuccessful] = useState<boolean | null>(null);
  const [isRefreshingCabs, setIsRefreshingCabs] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [refreshCount, setRefreshCount] = useState(0);
  const [forceRecalculation, setForceRecalculation] = useState(0);
  const [globalRefreshTrigger, setGlobalRefreshTrigger] = useState(0);
  const isCalculatingRef = useRef(false);
  const calculateAttemptsRef = useRef(0);
  const maxCalculationAttempts = 5; // Increased from 3 to 5
  const lastTripTypeRef = useRef<string>(tripType);
  const lastTripModeRef = useRef<string>(tripMode);
  const lastDistanceRef = useRef<number>(distance);

  const { 
    cabOptions, 
    isLoading: isLoadingCabs, 
    error, 
    filterLoading,
    refresh: refreshCabOptions 
  } = useCabOptions({ 
    tripType, 
    tripMode, 
    distance 
  });

  const forceRefreshAll = async () => {
    if (isRefreshingCabs) {
      console.log('Already refreshing, skipping duplicate request');
      return;
    }
    
    console.log('Starting complete fare data refresh');
    setIsRefreshingCabs(true);
    try {
      localStorage.setItem('forceCacheRefresh', 'true');
      clearFareCache();
      fareService.clearCache();
      const timestamp = Date.now();
      localStorage.setItem('fareDataLastRefreshed', timestamp.toString());
      localStorage.setItem('forceTripFaresRefresh', 'true');
      await reloadCabTypes();
      await refreshCabOptions();
      setLastUpdate(timestamp);
      setRefreshCount(prev => prev + 1);
      setForceRecalculation(prev => prev + 1);
      setGlobalRefreshTrigger(prev => prev + 1);
      await calculateFares(cabOptions, true);
      toast.success("All fare data refreshed successfully!");
      setRefreshSuccessful(true);
      console.log('Complete fare data refresh successful');
    } catch (error) {
      console.error("Failed to refresh all data:", error);
      toast.error("Failed to refresh fare data");
      setRefreshSuccessful(false);
    } finally {
      setIsRefreshingCabs(false);
      localStorage.removeItem('forceCacheRefresh');
      setTimeout(() => {
        localStorage.removeItem('forceTripFaresRefresh');
      }, 5000);
    }
  };

  const refreshCabTypes = async () => {
    await forceRefreshAll();
  };

  const calculateFares = async (cabs: CabType[], shouldForceRefresh: boolean = false) => {
    if (isCalculatingRef.current) {
      console.log('Already calculating fares, skipping duplicate calculation');
      return;
    }
    
    if (calculateAttemptsRef.current >= maxCalculationAttempts) {
      console.log(`Reached maximum calculation attempts (${maxCalculationAttempts}), skipping calculation`);
      return;
    }
    
    if (cabs.length > 0 && distance > 0) {
      isCalculatingRef.current = true;
      setIsCalculatingFares(true);
      calculateAttemptsRef.current += 1;
      
      console.log(`Calculating fares for ${cabs.length} cabs, force refresh: ${shouldForceRefresh}, tripType: ${tripType}, hourlyPackage: ${hourlyPackage}, attempt: ${calculateAttemptsRef.current}`);
      
      if (shouldForceRefresh) {
        clearFareCache();
        fareService.clearCache();
        localStorage.setItem('forceCacheRefresh', 'true');
        console.log('Force refresh flag set, fare cache cleared');
      }
      
      const fares: Record<string, number> = {};
      
      for (const cab of cabs) {
        try {
          console.log(`Calculating fare for ${cab.name} (${cab.id})`);
          const fare = await calculateFare({
            cabType: cab,
            distance,
            tripType,
            tripMode,
            hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
            pickupDate,
            returnDate,
            forceRefresh: shouldForceRefresh
          });
          fares[cab.id] = fare;
          console.log(`Calculated fare for ${cab.name}: ${fare}`);
          
          // Dispatch individual fare calculation event
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: cab.id,
              cabType: cab.id,
              cabName: cab.name,
              tripType,
              tripMode,
              fare,
              timestamp: Date.now()
            }
          }));
        } catch (error) {
          console.error(`Error calculating fare for ${cab.name}:`, error);
          if (cabFares[cab.id] && cabFares[cab.id] > 0) {
            fares[cab.id] = cabFares[cab.id];
            console.log(`Using existing fare for ${cab.name}: ${cabFares[cab.id]}`);
          } else if (cab.price && cab.price > 0) {
            fares[cab.id] = cab.price;
            console.log(`Using cab price for ${cab.name}: ${cab.price}`);
          } else {
            const fallbackPrices: Record<string, number> = {
              'sedan': 1500,
              'ertiga': 2000,
              'innova': 2500,
              'innova_crysta': 2500,
              'luxury': 3500,
              'tempo': 4000
            };
            fares[cab.id] = fallbackPrices[cab.id.toLowerCase()] || 2000;
            console.log(`Using fallback price for ${cab.name}: ${fares[cab.id]}`);
          }
        }
      }
      
      if (shouldForceRefresh) {
        localStorage.removeItem('forceCacheRefresh');
        console.log('Force refresh flag removed after calculations');
      }
      
      const validFaresExist = Object.values(fares).some(fare => fare > 0);
      if (validFaresExist) {
        setCabFares(fares);
      }
      
      setIsCalculatingFares(false);
      isCalculatingRef.current = false;
      console.log('All fares calculated and set');
    } else {
      isCalculatingRef.current = false;
    }
  };

  useEffect(() => {
    if (cabOptions.length > 0) {
      calculateAttemptsRef.current = 0;
      calculateFares(cabOptions, true);
    }
  }, [cabOptions, distance, tripType, tripMode, hourlyPackage]);

  useEffect(() => {
    if (cabOptions.length > 0 && (pickupDate || returnDate)) {
      calculateAttemptsRef.current = 0;
      calculateFares(cabOptions, false);
    }
  }, [pickupDate, returnDate]);

  useEffect(() => {
    if (selectedCab) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);
  
  // Track changes to key props to force recalculation when they change
  useEffect(() => {
    const tripTypeChanged = lastTripTypeRef.current !== tripType;
    const tripModeChanged = lastTripModeRef.current !== tripMode;
    const distanceChanged = lastDistanceRef.current !== distance;
    
    if (tripTypeChanged || tripModeChanged || distanceChanged) {
      console.log(`Key props changed - tripType: ${tripTypeChanged}, tripMode: ${tripModeChanged}, distance: ${distanceChanged}`);
      
      lastTripTypeRef.current = tripType;
      lastTripModeRef.current = tripMode;
      lastDistanceRef.current = distance;
      
      // Reset calculation state
      calculateAttemptsRef.current = 0;
      setForceRecalculation(prev => prev + 1);
      
      if (cabOptions.length > 0) {
        calculateFares(cabOptions, true);
      }
    }
  }, [tripType, tripMode, distance]);

  useEffect(() => {
    let lastEventTime = 0;
    const throttleTime = 30000;
    
    const handleCacheCleared = () => {
      const now = Date.now();
      if (now - lastEventTime < throttleTime) {
        return;
      }
      
      lastEventTime = now;
      console.log('Detected fare cache cleared event, recalculating fares');
      calculateAttemptsRef.current = 0;
      setLastUpdate(now);
      setForceRecalculation(prev => prev + 1);
      setGlobalRefreshTrigger(prev => prev + 1);
      
      if (cabOptions.length > 0) {
        calculateFares(cabOptions, true);
      }
    };
    
    const handleFaresUpdated = (event: Event) => {
      const now = Date.now();
      if (now - lastEventTime < throttleTime) {
        return;
      }
      
      lastEventTime = now;
      const customEvent = event as CustomEvent;
      console.log('Detected fares updated event:', customEvent.detail);
      
      calculateAttemptsRef.current = 0;
      setLastUpdate(now);
      setRefreshCount(prev => prev + 1);
      setForceRecalculation(prev => prev + 1);
      setGlobalRefreshTrigger(prev => prev + 1);
      
      calculateFares(cabOptions, true);
    };
    
    const eventListeners = [
      { name: 'fare-cache-cleared', handler: handleCacheCleared },
      { name: 'local-fares-updated', handler: handleFaresUpdated },
      { name: 'trip-fares-updated', handler: handleFaresUpdated },
      { name: 'airport-fares-updated', handler: handleFaresUpdated }
    ];
    
    eventListeners.forEach(({ name, handler }) => {
      window.addEventListener(name, handler);
    });
    
    return () => {
      eventListeners.forEach(({ name, handler }) => {
        window.removeEventListener(name, handler);
      });
    };
  }, [cabOptions]);

  const handleSelectCab = (cab: CabType) => {
    onSelectCab(cab);
    
    // First dispatch a custom event indicating cab selection
    window.dispatchEvent(new CustomEvent('cab-selected', {
      bubbles: true,
      detail: {
        cabType: cab.id,
        cabName: cab.name,
        timestamp: Date.now()
      }
    }));
    
    // Also force fare calculation for this specific cab
    if (cab && distance > 0 && !isCalculatingRef.current) {
      console.log(`Selected cab ${cab.name} (${cab.id}), forcing immediate fare calculation`);
      
      const calculateSelectedCabFare = async () => {
        try {
          if (isCalculatingRef.current) return;
          
          isCalculatingRef.current = true;
          const fare = await calculateFare({
            cabType: cab,
            distance,
            tripType,
            tripMode,
            hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
            pickupDate,
            returnDate,
            forceRefresh: true
          });
          
          // Update fare in state
          setCabFares(prev => ({
            ...prev,
            [cab.id]: fare
          }));
          
          console.log(`Force-calculated fare for selected cab ${cab.name}: ${fare}`);
          
          // Dispatch specific cab selection event with fare
          window.dispatchEvent(new CustomEvent('cab-selected-with-fare', {
            bubbles: true,
            detail: {
              cabType: cab.id,
              cabName: cab.name,
              fare,
              tripType,
              tripMode,
              timestamp: Date.now()
            }
          }));
        } catch (error) {
          console.error(`Error calculating fare for selected cab ${cab.name}:`, error);
        } finally {
          isCalculatingRef.current = false;
        }
      };
      
      calculateSelectedCabFare();
    }
    
    console.log(`Selected cab: ${cab.name} (${cab.id})`);
  };

  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return `${hourlyPackage} package`;
    }
    if (tripType === 'outstation') {
      return tripMode === 'one-way' ? 'One way trip' : 'Round trip';
    }
    return '';
  };

  useEffect(() => {
    console.log('CabOptions component mounted, force refreshing fare data');
    const hasRefreshedOnMount = sessionStorage.getItem('cabOptionsRefreshedOnMount');
    if (!hasRefreshedOnMount) {
      forceRefreshAll();
      sessionStorage.setItem('cabOptionsRefreshedOnMount', 'true');
    }
  }, []);

  if (isLoadingCabs) {
    return <CabLoading />;
  }

  return (
    <div className="space-y-4 mt-6">
      <CabOptionsHeader 
        cabCount={cabOptions.length}
        isRefreshing={isRefreshingCabs}
        refreshSuccessful={refreshSuccessful}
        onRefresh={refreshCabTypes}
      />
      
      {refreshSuccessful === false && <CabRefreshWarning />}
      
      {cabOptions.length === 0 ? (
        <EmptyCabList 
          onRefresh={refreshCabTypes}
          isRefreshing={isRefreshingCabs}
        />
      ) : (
        <CabList
          cabTypes={cabOptions}
          selectedCabId={selectedCabId}
          cabFares={cabFares}
          isCalculatingFares={isCalculatingFares}
          handleSelectCab={handleSelectCab}
          getFareDetails={getFareDetails}
        />
      )}
    </div>
  );
}
