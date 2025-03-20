
import { useState, useEffect, useCallback } from 'react';
import { CabType } from '@/types/cab';
import { vehicleService } from '@/services/vehicleService';

interface UseCabTypesResult {
  cabTypes: CabType[];
  isLoadingCabs: boolean;
  isRefreshingCabs: boolean;
  refreshSuccessful: boolean | null;
  refreshCabTypes: () => Promise<CabType[]>;
}

/**
 * Hook for fetching and managing cab types
 */
export function useCabTypes(initialCabTypes: CabType[] = []): UseCabTypesResult {
  const [cabTypes, setCabTypes] = useState<CabType[]>(initialCabTypes);
  const [isLoadingCabs, setIsLoadingCabs] = useState(initialCabTypes.length === 0);
  const [isRefreshingCabs, setIsRefreshingCabs] = useState(false);
  const [refreshSuccessful, setRefreshSuccessful] = useState<boolean | null>(null);
  
  // Load cab types on initial render if needed
  useEffect(() => {
    const loadInitialCabTypes = async () => {
      if (initialCabTypes.length === 0) {
        setIsLoadingCabs(true);
        try {
          const loadedCabTypes = await vehicleService.getVehicles();
          if (loadedCabTypes.length > 0) {
            setCabTypes(loadedCabTypes);
          } else {
            console.warn("No cab types returned from API, using defaults");
          }
        } catch (error) {
          console.error("Error loading initial cab types:", error);
        } finally {
          setIsLoadingCabs(false);
        }
      }
    };
    
    loadInitialCabTypes();
  }, [initialCabTypes.length]);
  
  // Function to refresh cab types
  const refreshCabTypes = useCallback(async (): Promise<CabType[]> => {
    setIsRefreshingCabs(true);
    setRefreshSuccessful(null);
    
    try {
      const refreshedCabTypes = await vehicleService.refreshVehicles();
      
      if (refreshedCabTypes.length > 0) {
        setCabTypes(refreshedCabTypes);
        setRefreshSuccessful(true);
        return refreshedCabTypes;
      } else {
        console.warn("No cab types returned from refresh");
        setRefreshSuccessful(false);
        return cabTypes; // Return current cab types as fallback
      }
    } catch (error) {
      console.error("Error refreshing cab types:", error);
      setRefreshSuccessful(false);
      return cabTypes; // Return current cab types as fallback
    } finally {
      setIsRefreshingCabs(false);
    }
  }, [cabTypes]);
  
  return {
    cabTypes,
    isLoadingCabs,
    isRefreshingCabs,
    refreshSuccessful,
    refreshCabTypes
  };
}
