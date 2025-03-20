
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
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

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
        
        // Load cab types with retry mechanism
        let dynamicCabTypes = [];
        let loadError = null;
        
        for (let i = 0; i <= MAX_RETRIES; i++) {
          try {
            if (i > 0) {
              console.log(`Retry attempt ${i} of ${MAX_RETRIES} to load cab types...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
            }
            
            dynamicCabTypes = await loadCabTypes();
            
            if (Array.isArray(dynamicCabTypes) && dynamicCabTypes.length > 0) {
              console.log(`Successfully loaded ${dynamicCabTypes.length} cab types on ${i > 0 ? `retry ${i}` : 'first attempt'}`);
              loadError = null;
              break;
            } else {
              console.warn(`Received empty cab types array on ${i > 0 ? `retry ${i}` : 'first attempt'}`);
              loadError = new Error('Received empty cab types array');
            }
          } catch (error) {
            console.error(`Error loading cab types on ${i > 0 ? `retry ${i}` : 'first attempt'}:`, error);
            loadError = error;
          }
        }
        
        // Process results after retries
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
          
          if (loadError) {
            console.error('Final load error after retries:', loadError);
          }
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

  // Function to refresh cab types with debouncing and retries
  const refreshCabTypes = useCallback(async () => {
    // Prevent multiple refreshes in quick succession
    const now = Date.now();
    if (now - lastRefreshTime < 30000) {
      toast.info('Please wait at least 30 seconds between refreshes');
      return cabTypes;
    }
    
    setIsRefreshingCabs(true);
    setRefreshSuccessful(null);
    
    try {
      // Clear all caches
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('calculatedFares');
      localStorage.removeItem('cabTypes');
      fareService.clearCache();
      
      console.log('Forcing cab types refresh...', Date.now());
      
      // Implement retry mechanism for refresh
      let freshCabTypes = [];
      let refreshError = null;
      
      for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
          if (i > 0) {
            console.log(`Retry attempt ${i} of ${MAX_RETRIES} to refresh cab types...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
          }
          
          freshCabTypes = await reloadCabTypes();
          
          if (Array.isArray(freshCabTypes) && freshCabTypes.length > 0) {
            console.log(`Successfully refreshed ${freshCabTypes.length} cab types on ${i > 0 ? `retry ${i}` : 'first attempt'}`);
            refreshError = null;
            break;
          } else {
            console.warn(`Received empty cab types array on refresh ${i > 0 ? `retry ${i}` : 'first attempt'}`);
            refreshError = new Error('Received empty cab types array on refresh');
          }
        } catch (error) {
          console.error(`Error refreshing cab types on ${i > 0 ? `retry ${i}` : 'first attempt'}:`, error);
          refreshError = error;
        }
      }
      
      // Process results after retries
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
        setRetryCount(0); // Reset retry count on success
      } else {
        console.warn('API returned empty vehicle data on refresh after all retries');
        toast.error('No vehicle data available. Using default values.');
        setRefreshSuccessful(false);
        
        if (refreshError) {
          console.error('Final refresh error after retries:', refreshError);
        }
      }
    } catch (error) {
      console.error('Error refreshing cab types:', error);
      toast.error('Failed to refresh vehicle data');
      setRefreshSuccessful(false);
      
      // Increment retry count for potential future automated retries
      setRetryCount(prev => Math.min(prev + 1, MAX_RETRIES));
    } finally {
      setIsRefreshingCabs(false);
    }
    
    return cabTypes;
  }, [cabTypes, lastRefreshTime, MAX_RETRIES]);

  return {
    cabTypes,
    isLoadingCabs,
    isRefreshingCabs,
    refreshSuccessful,
    refreshCabTypes,
    lastRefreshTime
  };
}
