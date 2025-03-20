
import { useState, useCallback, useEffect } from 'react';
import { CabType } from '@/types/cab';
import { loadCabTypes, reloadCabTypes } from '@/lib/cabData';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';

export function useCabTypes(initialCabTypes: CabType[]) {
  const [cabTypes, setCabTypes] = useState<CabType[]>(initialCabTypes);
  const [isLoadingCabs, setIsLoadingCabs] = useState(false);
  const [isRefreshingCabs, setIsRefreshingCabs] = useState(false);
  const [refreshSuccessful, setRefreshSuccessful] = useState<boolean | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // Load cab types initially if needed
  useEffect(() => {
    const fetchCabTypes = async () => {
      if (cabTypes.length > 0) return;
      
      setIsLoadingCabs(true);
      try {
        console.log('Loading dynamic cab types...', Date.now());
        fareService.clearCache();
        
        // Add debounce - don't reload if we just did within the last 30 seconds
        const now = Date.now();
        if (now - lastRefreshTime < 30000) {
          console.log('Skipping load - last refresh was less than 30 seconds ago');
          return;
        }
        
        // Remove the argument from loadCabTypes call
        const dynamicCabTypes = await loadCabTypes();
        console.log('Loaded dynamic cab types:', dynamicCabTypes);
        
        if (Array.isArray(dynamicCabTypes) && dynamicCabTypes.length > 0) {
          const validCabTypes = dynamicCabTypes.map(cab => ({
            ...cab,
            id: cab.id || cab.vehicleId || `cab-${Math.random().toString(36).substring(2, 10)}`,
            name: cab.name || (cab.id ? cab.id.charAt(0).toUpperCase() + cab.id.slice(1).replace('_', ' ') : 'Unknown')
          }));
          
          console.log('Processed cab types:', validCabTypes);
          setCabTypes(validCabTypes);
          setRefreshSuccessful(true);
          setLastRefreshTime(now);
        } else {
          console.warn('API returned empty vehicle data, using initial cab types');
          setCabTypes(initialCabTypes);
          setRefreshSuccessful(false);
        }
      } catch (error) {
        console.error('Error loading dynamic cab types:', error);
        toast.error('Could not load vehicle data. Using default values.');
        setCabTypes(initialCabTypes);
        setRefreshSuccessful(false);
      } finally {
        setIsLoadingCabs(false);
      }
    };
    
    fetchCabTypes();
  }, [initialCabTypes, cabTypes.length, lastRefreshTime]);

  // Function to refresh cab types with debouncing
  const refreshCabTypes = useCallback(async () => {
    // Prevent multiple refreshes in quick succession
    const now = Date.now();
    if (now - lastRefreshTime < 30000) {
      toast.info('Please wait at least 30 seconds between refreshes');
      return cabTypes;
    }
    
    setIsRefreshingCabs(true);
    
    try {
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('calculatedFares');
      localStorage.removeItem('cabTypes');
      
      fareService.clearCache();
      
      console.log('Forcing cab types refresh...', Date.now());
      // Remove the argument from reloadCabTypes call
      const freshCabTypes = await reloadCabTypes();
      console.log('Refreshed cab types:', freshCabTypes);
      
      if (Array.isArray(freshCabTypes) && freshCabTypes.length > 0) {
        const validCabTypes = freshCabTypes.map(cab => ({
          ...cab,
          id: cab.id || cab.vehicleId || `cab-${Math.random().toString(36).substring(2, 10)}`,
          name: cab.name || (cab.id ? cab.id.charAt(0).toUpperCase() + cab.id.slice(1).replace('_', ' ') : 'Unknown')
        }));
        
        setCabTypes(validCabTypes);
        toast.success('Vehicle data refreshed successfully');
        setRefreshSuccessful(true);
        setLastRefreshTime(now);
      } else {
        console.warn('API returned empty vehicle data on refresh');
        toast.error('No vehicle data available. Using default values.');
        setRefreshSuccessful(false);
      }
    } catch (error) {
      console.error('Error refreshing cab types:', error);
      toast.error('Failed to refresh vehicle data');
      setRefreshSuccessful(false);
    } finally {
      setIsRefreshingCabs(false);
    }
    
    return cabTypes;
  }, [cabTypes, lastRefreshTime]);

  return {
    cabTypes,
    isLoadingCabs,
    isRefreshingCabs,
    refreshSuccessful,
    refreshCabTypes,
    lastRefreshTime
  };
}
