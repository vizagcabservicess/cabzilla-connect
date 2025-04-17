
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { toast } from 'sonner';

export function useLocalPackageFare(initialCabId?: string, initialPackage: string = '8hrs-80km') {
  const [fare, setFare] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hourlyPackage, setHourlyPackage] = useState<string>(initialPackage);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Record<string, {price: number, timestamp: number}>>({});
  const lastRequestTimeRef = useRef<number>(0);
  
  // Normalize vehicle ID to ensure consistency
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/\s+/g, '_');
  };

  const fetchFare = useCallback(async (cabId: string, packageId: string = hourlyPackage, forceRefresh: boolean = false) => {
    if (!cabId || !packageId) {
      return 0;
    }
    
    // Throttle requests - no more than one request every 300ms
    const now = Date.now();
    if (now - lastRequestTimeRef.current < 300 && !forceRefresh) {
      console.log('Throttling API request');
      return 0;
    }
    
    lastRequestTimeRef.current = now;
    
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Check cache first (with 2-minute expiry) unless force refresh
    const normalizedCabId = normalizeVehicleId(cabId);
    const cacheKey = `${normalizedCabId}_${packageId}`;
    const cachedData = cacheRef.current[cacheKey];
    
    if (!forceRefresh && cachedData && (now - cachedData.timestamp < 2 * 60 * 1000)) {
      console.log(`Using cached fare for ${normalizedCabId}: ₹${cachedData.price}`);
      setFare(cachedData.price);
      return cachedData.price;
    }
    
    setIsFetching(true);
    setError(null);
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      console.log(`Fetching local package fare for ${normalizedCabId}, package: ${packageId}`);
      
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      
      const response = await axios.get(apiUrl, {
        headers: forceRefreshHeaders,
        timeout: 8000,
        signal: abortControllerRef.current.signal
      });
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        
        // Extract the correct price for the selected package
        let price = 0;
        if (packageId.includes('4hrs-40km') && fareData.price4hrs40km) {
          price = Number(fareData.price4hrs40km);
        } else if (packageId.includes('8hrs-80km') && fareData.price8hrs80km) {
          price = Number(fareData.price8hrs80km);
        } else if (packageId.includes('10hrs-100km') && fareData.price10hrs100km) {
          price = Number(fareData.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`Retrieved fare from API for ${normalizedCabId}: ₹${price}`);
          
          // Update cache
          cacheRef.current[cacheKey] = {
            price,
            timestamp: now
          };
          
          // Store in localStorage for consistency
          try {
            localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
          } catch (e) {
            console.warn('Failed to store in localStorage:', e);
          }
          
          setFare(price);
          return price;
        } else {
          const errorMsg = `No valid price found for ${cabId} with package ${packageId}`;
          console.warn(errorMsg);
          setError(errorMsg);
          return 0;
        }
      } else {
        const errorMsg = 'No fare data found from API';
        console.warn(errorMsg);
        setError(errorMsg);
        return 0;
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request was cancelled');
      } else {
        console.error('Error fetching fare:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to fetch fare';
        setError(errorMsg);
        toast.error('Failed to load fare. Please try again.');
      }
      return 0;
    } finally {
      setIsFetching(false);
    }
  }, [hourlyPackage]);

  const changePackage = useCallback((packageId: string) => {
    setHourlyPackage(packageId);
  }, []);

  // Cleanup function to abort any pending requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    fare,
    isFetching,
    error,
    hourlyPackage,
    fetchFare,
    changePackage
  };
}
