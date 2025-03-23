
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
    setIsRefreshingCabs(true);
    try {
      // Set flag to force cache refresh
      localStorage.setItem('forceCacheRefresh', 'true');
      
      // Clear all fare caches
      clearFareCache();
      fareService.clearCache();
      
      // Clear session and local storage caches
      localStorage.removeItem('cachedFareData');
      localStorage.removeItem('cabPricing');
      localStorage.removeItem('fareCache');
      localStorage.removeItem('fares');
      localStorage.removeItem('cabData');
      localStorage.removeItem('vehicles');
      localStorage.removeItem('calculatedFares');
      sessionStorage.removeItem('cabData');
      sessionStorage.removeItem('vehicles');
      sessionStorage.removeItem('calculatedFares');
      
      // Create a timestamp for referencev  
      const timestamp = Date.now();
      localStorage.setItem('fareDataLastRefreshed', timestamp.toString());
      
      // Refresh cab options with force parameter
      await refreshCabOptions();
      
      // Update last update timestamp
      setLastUpdate(timestamp);
      
      // Trigger recalculation of fares
      await calculateFares(cabOptions, true);
      
      toast.success("All fare data refreshed successfully!");
      setRefreshSuccessful(true);
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
      
      // Clear the fare cache if force refresh is requested
      if (forceRefresh) {
        clearFareCache();
        localStorage.setItem('forceCacheRefresh', 'true');
      }
      
      const fares: Record<string, number> = {};
      
      for (const cab of cabs) {
        try {
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
        } catch (error) {
          console.error(`Error calculating fare for ${cab.name}:`, error);
          fares[cab.id] = 0;
        }
      }
      
      // Remove force refresh flag
      if (forceRefresh) {
        localStorage.removeItem('forceCacheRefresh');
      }
      
      setCabFares(fares);
      setIsCalculatingFares(false);
    }
  };

  // Initial calculation of fares when cab options or distance changes
  useEffect(() => {
    calculateFares(cabOptions);
  }, [cabOptions, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, lastUpdate]);

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
    
    window.addEventListener('fare-cache-cleared', handleCacheCleared);
    
    return () => {
      window.removeEventListener('fare-cache-cleared', handleCacheCleared);
    };
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
