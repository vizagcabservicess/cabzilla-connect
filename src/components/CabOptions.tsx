
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
  const maxCalculationAttempts = 3;

  // Use the hook to fetch cab options
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

  // Function to force refresh everything
  const forceRefreshAll = async () => {
    // If already refreshing, don't start another refresh
    if (isRefreshingCabs) {
      console.log('Already refreshing, skipping duplicate request');
      return;
    }
    
    console.log('Starting complete fare data refresh');
    setIsRefreshingCabs(true);
    try {
      // Set flag to force cache refresh
      localStorage.setItem('forceCacheRefresh', 'true');
      
      // Clear all fare caches
      clearFareCache();
      fareService.clearCache();
      
      // Create a timestamp for reference
      const timestamp = Date.now();
      localStorage.setItem('fareDataLastRefreshed', timestamp.toString());
      localStorage.setItem('forceTripFaresRefresh', 'true');
      
      // Reload cab types from server with force flag
      console.log('Reloading cab types from server...');
      await reloadCabTypes();
      
      // Refresh cab options with force parameter
      console.log('Refreshing cab options...');
      await refreshCabOptions();
      
      // Update last update timestamp and increment refresh count
      setLastUpdate(timestamp);
      setRefreshCount(prev => prev + 1);
      setForceRecalculation(prev => prev + 1);
      setGlobalRefreshTrigger(prev => prev + 1);
      
      // Trigger recalculation of fares with force flag, but limit to one attempt
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
      
      // Ensure the force refresh flag is cleared
      localStorage.removeItem('forceCacheRefresh');
      
      // After a short delay, remove the trip fares refresh flag
      setTimeout(() => {
        localStorage.removeItem('forceTripFaresRefresh');
      }, 5000);
    }
  };

  // Function to refresh cab types
  const refreshCabTypes = async () => {
    await forceRefreshAll();
  };

  // Calculate fares for cab options with anti-loop protection
  const calculateFares = async (cabs: CabType[], shouldForceRefresh: boolean = false) => {
    // Prevent multiple simultaneous calculations and limit repetitive attempts
    if (isCalculatingRef.current) {
      console.log('Already calculating fares, skipping duplicate calculation');
      return;
    }
    
    // Limit the number of calculation attempts to prevent infinite loops
    if (calculateAttemptsRef.current >= maxCalculationAttempts) {
      console.log(`Reached maximum calculation attempts (${maxCalculationAttempts}), skipping calculation`);
      return;
    }
    
    if (cabs.length > 0 && distance > 0) {
      isCalculatingRef.current = true;
      setIsCalculatingFares(true);
      calculateAttemptsRef.current += 1;
      
      console.log(`Calculating fares for ${cabs.length} cabs, force refresh: ${shouldForceRefresh}, tripType: ${tripType}, hourlyPackage: ${hourlyPackage}, attempt: ${calculateAttemptsRef.current}`);
      
      // Clear the fare cache if force refresh is requested
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
        } catch (error) {
          console.error(`Error calculating fare for ${cab.name}:`, error);
          // If we have an error for this cab, try to use existing fare or set default
          if (cabFares[cab.id] && cabFares[cab.id] > 0) {
            fares[cab.id] = cabFares[cab.id];
            console.log(`Using existing fare for ${cab.name}: ${cabFares[cab.id]}`);
          } else if (cab.price && cab.price > 0) {
            fares[cab.id] = cab.price;
            console.log(`Using cab price for ${cab.name}: ${cab.price}`);
          } else {
            // Set fallback prices based on vehicle type
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
      
      // Remove force refresh flag
      if (shouldForceRefresh) {
        localStorage.removeItem('forceCacheRefresh');
        console.log('Force refresh flag removed after calculations');
      }
      
      // Only update state if we have valid fares
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

  // Initial calculation of fares when cab options or distance changes
  useEffect(() => {
    if (cabOptions.length > 0) {
      console.log(`Cab options changed, recalculating fares for ${cabOptions.length} cabs`);
      // Reset calculation attempts counter when inputs change
      calculateAttemptsRef.current = 0;
      calculateFares(cabOptions, true); // Force refresh on initial load
    }
  }, [cabOptions, distance, tripType, tripMode, hourlyPackage]);

  // Separate effect for date changes to avoid too many recalculations
  useEffect(() => {
    if (cabOptions.length > 0 && (pickupDate || returnDate)) {
      console.log('Dates changed, recalculating fares');
      // Reset calculation attempts counter when dates change
      calculateAttemptsRef.current = 0;
      calculateFares(cabOptions, false);
    }
  }, [pickupDate, returnDate]);

  // Update selected cab ID when selectedCab changes from outside
  useEffect(() => {
    if (selectedCab) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);

  // Listen for fare cache cleared events with throttling
  useEffect(() => {
    let lastEventTime = 0;
    const throttleTime = 30000; // 30 seconds
    
    const handleCacheCleared = () => {
      const now = Date.now();
      if (now - lastEventTime < throttleTime) {
        console.log('Throttling fare cache cleared event');
        return;
      }
      
      lastEventTime = now;
      console.log('Detected fare cache cleared event, recalculating fares');
      // Reset calculation attempts counter for this important event
      calculateAttemptsRef.current = 0;
      setLastUpdate(now);
      setForceRecalculation(prev => prev + 1);
      setGlobalRefreshTrigger(prev => prev + 1);
      
      // Force recalculation with fresh data
      if (cabOptions.length > 0) {
        calculateFares(cabOptions, true);
      }
    };
    
    const handleFaresUpdated = (event: Event) => {
      const now = Date.now();
      if (now - lastEventTime < throttleTime) {
        console.log('Throttling fares updated event');
        return;
      }
      
      lastEventTime = now;
      const customEvent = event as CustomEvent;
      console.log('Detected fares updated event:', customEvent.detail);
      
      // Reset calculation attempts counter
      calculateAttemptsRef.current = 0;
      setLastUpdate(now);
      setRefreshCount(prev => prev + 1);
      setForceRecalculation(prev => prev + 1);
      setGlobalRefreshTrigger(prev => prev + 1);
      
      // Force recalculation for all cabs with cache clearing
      calculateFares(cabOptions, true);
    };
    
    const eventListeners = [
      { name: 'fare-cache-cleared', handler: handleCacheCleared },
      { name: 'local-fares-updated', handler: handleFaresUpdated },
      { name: 'trip-fares-updated', handler: handleFaresUpdated },
      { name: 'airport-fares-updated', handler: handleFaresUpdated }
    ];
    
    // Add all event listeners
    eventListeners.forEach(({ name, handler }) => {
      window.addEventListener(name, handler);
    });
    
    return () => {
      // Remove all event listeners
      eventListeners.forEach(({ name, handler }) => {
        window.removeEventListener(name, handler);
      });
    };
  }, [cabOptions]);

  // When tripType changes, force a refresh
  useEffect(() => {
    console.log(`Trip type changed to ${tripType}, forcing refresh`);
    // Reset calculation attempts counter
    calculateAttemptsRef.current = 0;
    setForceRecalculation(prev => prev + 1);
    if (cabOptions.length > 0) {
      calculateFares(cabOptions, true);
    }
  }, [tripType]);

  // Handle selecting a cab
  const handleSelectCab = (cab: CabType) => {
    console.log(`Selecting cab: ${cab.name} (${cab.id}), current fare: ${cabFares[cab.id] || 'not calculated'}`);
    setSelectedCabId(cab.id);
    onSelectCab(cab);
    
    // Use a one-time calculation for the selected cab
    calculateAttemptsRef.current = 0; // Reset counter for this important event
    
    // Force a single calculation for this cab only
    try {
      calculateFare({
        cabType: cab,
        distance,
        tripType,
        tripMode,
        hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
        pickupDate,
        returnDate,
        forceRefresh: true
      }).then(fare => {
        console.log(`Forced one-time calculation for selected cab ${cab.name}: ₹${fare}`);
        
        // Update the fare in the cabFares state
        setCabFares(prev => ({
          ...prev,
          [cab.id]: fare > 0 ? fare : (prev[cab.id] || cab.price || 2000)
        }));
        
        // Dispatch an event to notify other components of the cab selection with new fare
        window.dispatchEvent(new CustomEvent('cab-selected', {
          detail: { 
            timestamp: Date.now(),
            cabType: cab.id,
            tripType,
            tripMode,
            hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
            fare: fare > 0 ? fare : (cabFares[cab.id] || cab.price || 2000)
          }
        }));
        
        // Special handling for local trips
        if (tripType === 'local' && hourlyPackage) {
          // Dispatch a specific event for local trips
          window.dispatchEvent(new CustomEvent('cab-selected-for-local', {
            detail: { 
              timestamp: Date.now(),
              cabType: cab.id,
              hourlyPackage,
              fare: fare > 0 ? fare : (cabFares[cab.id] || cab.price || 2000)
            }
          }));
        }
      });
    } catch (error) {
      console.error(`Error in one-time calculation for ${cab.name}:`, error);
      // If calculation fails, use existing fare or default
      const currentFare = cabFares[cab.id] || cab.price || 2000;
      
      // Dispatch events with existing fare
      window.dispatchEvent(new CustomEvent('cab-selected', {
        detail: { 
          timestamp: Date.now(),
          cabType: cab.id,
          tripType,
          tripMode,
          hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
          fare: currentFare
        }
      }));
    }
  };

  // Function to get fare details for a cab
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return `${hourlyPackage} package`;
    }
    if (tripType === 'outstation') {
      return tripMode === 'one-way' ? 'One way trip' : 'Round trip';
    }
    return '';
  };

  // Force refresh on component mount only once
  useEffect(() => {
    console.log('CabOptions component mounted, force refreshing fare data');
    // Only refresh on mount, not on every render
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
