
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
      
      // Clear session and local storage caches
      const keysToRemove = [
        'cachedFareData', 'cabPricing', 'fareCache', 'fares', 'cabData', 
        'vehicles', 'calculatedFares', 'cabTypes', 'tourFares', 'localPackagePriceMatrix'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Create a timestamp for reference
      const timestamp = Date.now();
      localStorage.setItem('fareDataLastRefreshed', timestamp.toString());
      
      // Reload cab types from server with force flag
      console.log('Reloading cab types from server...');
      await reloadCabTypes();
      
      // Refresh cab options with force parameter
      console.log('Refreshing cab options...');
      await refreshCabOptions();
      
      // Update last update timestamp and increment refresh count
      setLastUpdate(timestamp);
      setRefreshCount(prev => prev + 1);
      
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
      console.log(`Calculating fares for ${cabs.length} cabs, force refresh: ${forceRefresh}`);
      
      // Clear the fare cache if force refresh is requested
      if (forceRefresh) {
        clearFareCache();
        localStorage.setItem('forceCacheRefresh', 'true');
        console.log('Force refresh flag set, fare cache cleared');
      }
      
      const fares: Record<string, number> = {};
      
      for (const cab of cabs) {
        try {
          console.log(`Calculating fare for ${cab.name}`);
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
  }, [cabOptions, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, lastUpdate, refreshCount]);

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
    };
    
    const handleLocalFaresUpdated = () => {
      console.log('Detected local fares updated event, recalculating fares');
      // Force update the lastUpdate timestamp to trigger recalculation
      setLastUpdate(Date.now());
      setRefreshCount(prev => prev + 1);
    };
    
    window.addEventListener('fare-cache-cleared', handleCacheCleared);
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleCacheCleared);
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
    };
  }, []);

  // Refresh fares periodically in the background
  useEffect(() => {
    // Create a periodic background refresh - once every 5 minutes
    const intervalId = setInterval(() => {
      console.log('Performing background fare refresh');
      setLastUpdate(Date.now());
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Handle selecting a cab
  const handleSelectCab = (cab: CabType) => {
    setSelectedCabId(cab.id);
    onSelectCab(cab);
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
