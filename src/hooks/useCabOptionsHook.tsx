
import { useState, useEffect } from 'react';
import { useCabOptions as useOriginalCabOptions } from '@/components/cab-options/useCabOptions';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { toast } from 'sonner';

interface UseCabOptionsProps {
  tripType: TripType;
  tripMode?: TripMode;
  distance?: number;
  forceFetch?: boolean;
}

export function useCabOptionsHook({ 
  tripType, 
  tripMode, 
  distance, 
  forceFetch = false 
}: UseCabOptionsProps) {
  const original = useOriginalCabOptions({ tripType, tripMode, distance });
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Debug the status of the cab options
  useEffect(() => {
    console.log('CabOptions Status:', {
      tripType,
      tripMode,
      distance,
      isLoading: original.isLoading,
      optionsCount: original.cabOptions.length,
      error: original.error,
      filterLoading: original.filterLoading,
      retryCount
    });
    
    if (original.cabOptions.length === 0 && !original.isLoading && !original.error && retryCount < 3) {
      const now = Date.now();
      // Only retry if it's been at least 2 seconds since last attempt
      if (now - lastFetchTime > 2000) {
        console.log('No cab options found, retrying fetch...');
        setRetryCount(prev => prev + 1);
        setLastFetchTime(now);
        
        // Force a refresh
        setTimeout(() => {
          original.refresh();
        }, 500);
      }
    }
  }, [
    original.cabOptions.length, 
    original.isLoading, 
    original.error, 
    retryCount, 
    lastFetchTime, 
    original.refresh, 
    tripType, 
    tripMode, 
    distance
  ]);
  
  // If we've had multiple retry attempts but still no options, show a toast to the user
  useEffect(() => {
    if (retryCount === 3 && original.cabOptions.length === 0) {
      toast.error("Could not load vehicle options. Please try again later.", {
        duration: 5000,
        id: "cab-options-error"
      });
    }
  }, [retryCount, original.cabOptions.length]);
  
  // Force a fetch on initialization if requested
  useEffect(() => {
    if (forceFetch) {
      console.log('Forcing initial cab options fetch');
      original.refresh();
    }
  }, [forceFetch, original.refresh]);
  
  return original;
}
