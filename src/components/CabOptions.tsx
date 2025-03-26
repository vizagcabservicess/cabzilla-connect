import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { CabOptionCard } from './CabOptionCard';
import { useCabOptions } from './cab-options/useCabOptions';
import { CabLoading } from './cab-options/CabLoading';
import { CabOptionsHeader } from './cab-options/CabOptionsHeader';
import { CabRefreshWarning } from './cab-options/CabRefreshWarning';
import { EmptyCabList } from './cab-options/EmptyCabList';
import { CabList } from './cab-options/CabList';
import { useState, useEffect } from 'react';
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
    console.log('Starting complete fare data refresh');
    setIsRefreshingCabs(true);
    try {
      // Set flag to force cache refresh
      localStorage.setItem('forceCacheRefresh', 'true');
      
      // Clear all fare caches
      clearFareCache();
      fareService.clearCache();
      
      // Clear session and local storage caches, but preserve the price matrix
      const savedMatrix = localStorage.getItem('localPackagePriceMatrix');
      
      const keysToRemove = [
        'cachedFareData', 'cabPricing', 'fareCache', 'fares', 'cabData', 
        'vehicles', 'calculatedFares', 'cabTypes', 'tourFares',
        'outstationFares', 'airportFares'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Restore the saved matrix after clearing
      if (savedMatrix) {
        localStorage.setItem('localPackagePriceMatrix', savedMatrix);
      }
      
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
      
      // Trigger recalculation of fares
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

  // Calculate fares for cab options
  const calculateFares = async (cabs: CabType[], forceRefresh: boolean = false) => {
    if (cabs.length > 0 && distance > 0) {
      setIsCalculatingFares(true);
      console.log(`Calculating fares for ${cabs.length} cabs, force refresh: ${forceRefresh}, tripType: ${tripType}, hourlyPackage: ${hourlyPackage}`);
      
      // Clear the fare cache if force refresh is requested
      if (forceRefresh) {
        clearFareCache();
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
            returnDate
          });
          fares[cab.id] = fare;
          console.log(`Calculated fare for ${cab.name}: ${fare}`);
        } catch (error) {
          console.error(`Error calculating fare for ${cab.name}:`, error);
          fares[cab.id] = 0;
        }
      }
      
      // Remove force refresh flag
      if (forceRefresh) {
        localStorage.removeItem('forceCacheRefresh');
        console.log('Force refresh flag removed after calculations');
      }
      
      setCabFares(fares);
      setIsCalculatingFares(false);
      console.log('All fares calculated and set');
    }
  };

  // Initial calculation of fares when cab options or distance changes
  useEffect(() => {
    if (cabOptions.length > 0) {
      console.log(`Cab options changed, recalculating fares for ${cabOptions.length} cabs`);
      calculateFares(cabOptions);
    }
  }, [cabOptions, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, lastUpdate, refreshCount, forceRecalculation, globalRefreshTrigger]);

  // Update selected cab ID when selectedCab changes from outside
  useEffect(() => {
    if (selectedCab) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);

  // Listen for fare cache cleared events
  useEffect(() => {
    const handleCacheCleared = () => {
      console.log('Detected fare cache cleared event, recalculating fares');
      // Force update the lastUpdate timestamp to trigger recalculation
      setLastUpdate(Date.now());
      setForceRecalculation(prev => prev + 1);
      setGlobalRefreshTrigger(prev => prev + 1);
      
      // Force recalculation with fresh data
      if (cabOptions.length > 0) {
        calculateFares(cabOptions, true);
      }
    };
    
    const handleLocalFaresUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Detected local fares updated event, recalculating fares', customEvent.detail);
      
      // Force update the lastUpdate timestamp to trigger recalculation
      setLastUpdate(Date.now());
      setRefreshCount(prev => prev + 1);
      setForceRecalculation(prev => prev + 1);
      setGlobalRefreshTrigger(prev => prev + 1);
      
      // If we're in local trip mode and have the specific package that was updated
      if (tripType === 'local' && 
          hourlyPackage && 
          customEvent.detail && 
          customEvent.detail.packageId === hourlyPackage) {
        console.log('Updated package matches current selection, forced recalculation');
        // Force recalculation with cache clearing
        calculateFares(cabOptions, true);
      } else {
        // Force recalculation for all cabs anyway to ensure fresh data
        calculateFares(cabOptions, true);
      }
    };
    
    const handleTripFaresUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Detected trip fares updated event, recalculating fares', customEvent.detail);
      
      // Trigger a global recalculation
      setGlobalRefreshTrigger(prev => prev + 1);
      
      // Force recalculation with cache clearing for outstation fares
      if (tripType === 'outstation') {
        calculateFares(cabOptions, true);
      }
    };
    
    window.addEventListener('fare-cache-cleared', handleCacheCleared);
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    window.addEventListener('trip-fares-updated', handleTripFaresUpdated);
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleCacheCleared);
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('trip-fares-updated', handleTripFaresUpdated);
    };
  }, [cabOptions, tripType, hourlyPackage]);

  // Refresh fares periodically in the background
  useEffect(() => {
    // Create a periodic background refresh - once every 5 minutes
    const intervalId = setInterval(() => {
      console.log('Performing background fare refresh');
      setLastUpdate(Date.now());
      setForceRecalculation(prev => prev + 1);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Handle selecting a cab
  const handleSelectCab = (cab: CabType) => {
    console.log(`Selecting cab: ${cab.name} (${cab.id}), current fare: ${cabFares[cab.id] || 'not calculated'}`);
    setSelectedCabId(cab.id);
    onSelectCab(cab);
    
    // Force a recalculation for any trip type when the cab is selected
    setForceRecalculation(prev => prev + 1);
    
    // Special handling for local trips
    if (tripType === 'local' && hourlyPackage) {
      // Trigger a recalculation of fares with force flag
      calculateFares([cab], true);
      
      // Dispatch an event to notify BookingSummary of the cab selection
      window.dispatchEvent(new CustomEvent('cab-selected-for-local', {
        detail: { 
          timestamp: Date.now(),
          cabType: cab.id,
          hourlyPackage,
          fare: cabFares[cab.id] || 0
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
