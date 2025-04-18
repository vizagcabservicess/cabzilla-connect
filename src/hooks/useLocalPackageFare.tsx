
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface LocalPackageFareOptions {
  forceRefresh?: boolean;
  validateVehicleMatch?: boolean;
}

export function useLocalPackageFare(
  defaultPackage: string = '8hrs-80km',
  validateVehicleMatch: boolean = false
) {
  const [hourlyPackage, setHourlyPackage] = useState<string>(defaultPackage);
  const [fare, setFare] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentVehicleIdRef = useRef<string | null>(null);

  // Helper function to normalize vehicle IDs consistently
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  };

  const fetchFare = useCallback(
    async (vehicleId: string, packageId: string, forceRefresh: boolean = false) => {
      // Skip if we're already fetching for this vehicle
      if (isFetching && currentVehicleIdRef.current === vehicleId) {
        console.log(`Already fetching fare for ${vehicleId}, skipping duplicate request`);
        return;
      }

      // Clear any previous errors
      setError(null);
      
      // Store the current vehicle ID being fetched
      currentVehicleIdRef.current = vehicleId;

      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        setIsFetching(true);
        
        console.log(`Getting local package price for ${vehicleId}, package: ${packageId}, forceRefresh: ${forceRefresh}`);
        
        // Normalize the vehicle ID for caching
        const normalizedVehicleId = normalizeVehicleId(vehicleId);
        
        // Create cache key
        const cacheKey = `fare_local_${normalizedVehicleId}`;
        
        // Try to get from cache first unless forcing refresh
        if (!forceRefresh) {
          const cachedFare = localStorage.getItem(cacheKey);
          if (cachedFare) {
            const parsedFare = Number(cachedFare);
            if (parsedFare > 0) {
              console.log(`Using cached local package price for ${vehicleId}: ${parsedFare}`);
              setFare(parsedFare);
              setIsFetching(false);
              return parsedFare;
            }
          }
        }
        
        // First try to get from service API
        const apiUrl = `https://vizagup.com/api/admin/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}`;
        console.log(`Fetching price from API: ${apiUrl}`);
        
        const response = await axios.get(apiUrl, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Force-Refresh': forceRefresh ? 'true' : 'false'
          }
        });
        
        // Check if we have valid fare data that actually matches the requested vehicle
        let price = 0;
        let matchedVehicle = false;
        
        if (response.data && response.data.fares && response.data.fares.length > 0) {
          const fares = response.data.fares;
          
          // Find the fare that matches the requested vehicle ID
          const matchedFare = fares.find((f: any) => {
            // Either match by exact vehicle ID or normalized vehicle ID
            return (
              f.vehicleId === vehicleId || 
              normalizeVehicleId(f.vehicleId) === normalizedVehicleId
            );
          });
          
          if (matchedFare) {
            console.log(`Local fares for vehicle ${matchedFare.vehicleId}:`, matchedFare);
            
            // Extract the appropriate price based on the package
            if (packageId.includes('4hrs-40km')) {
              price = Number(matchedFare.price4hrs40km || 0);
            } else if (packageId.includes('8hrs-80km')) {
              price = Number(matchedFare.price8hrs80km || 0);
            } else if (packageId.includes('10hrs-100km')) {
              price = Number(matchedFare.price10hrs100km || 0);
            }
            
            matchedVehicle = true;
          } else if (validateVehicleMatch) {
            console.log(`Warning: No matching vehicle found in service API response for ${vehicleId}`);
            console.log('Available vehicles:', fares.map((f: any) => f.vehicleId).join(', '));
          }
        }
        
        // If we couldn't find a matching vehicle in the service API, or if the price is 0,
        // try the direct database API
        if (!matchedVehicle || price <= 0) {
          // Try direct database fetch as fallback
          const directApiUrl = `https://vizagup.com/api/admin/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}`;
          
          const directResponse = await axios.get(directApiUrl, {
            signal: abortControllerRef.current.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'X-Database-First': 'true',
              'X-Force-Refresh': 'true'
            }
          });
          
          if (directResponse.data && directResponse.data.fares && directResponse.data.fares.length > 0) {
            // Only use fare data that actually matches the requested vehicle
            const directFares = directResponse.data.fares;
            const matchedDirectFare = directFares.find((f: any) => {
              return (
                f.vehicleId === vehicleId || 
                normalizeVehicleId(f.vehicleId) === normalizedVehicleId
              );
            });
            
            if (matchedDirectFare) {
              console.log(`Retrieved fare directly from database API: ${vehicleId}`);
              
              // Extract the appropriate price based on the package
              if (packageId.includes('4hrs-40km')) {
                price = Number(matchedDirectFare.price4hrs40km || 0);
              } else if (packageId.includes('8hrs-80km')) {
                price = Number(matchedDirectFare.price8hrs80km || 0);
              } else if (packageId.includes('10hrs-100km')) {
                price = Number(matchedDirectFare.price10hrs100km || 0);
              }
              
              console.log(`Retrieved fare directly from database API: ${price}`);
            } else if (validateVehicleMatch) {
              console.log(`Warning: No matching vehicle found in direct API response for ${vehicleId}`);
              console.log('Available vehicles:', directFares.map((f: any) => f.vehicleId).join(', '));
            }
          }
        }
        
        // If we have a valid price, update state and cache
        if (price > 0) {
          setFare(price);
          
          // Store in localStorage for future use
          try {
            localStorage.setItem(cacheKey, String(price));
            console.log(`BookingSummary: Stored fare in localStorage: ${cacheKey} = ${price}`);
          } catch (storageError) {
            console.warn('Failed to store fare in localStorage:', storageError);
          }
          
          return price;
        } else {
          throw new Error(`No valid fare found for ${vehicleId} with package ${packageId}`);
        }
      } catch (err: any) {
        // Only set error if this request wasn't aborted
        if (!axios.isCancel(err)) {
          console.error(`Error fetching local package fare for ${vehicleId}:`, err);
          setError(err.message || 'Failed to fetch fare');
          return 0;
        }
      } finally {
        // Clear fetching state if this is the current vehicle
        if (currentVehicleIdRef.current === vehicleId) {
          setIsFetching(false);
        }
      }
      
      return 0;
    },
    [isFetching, validateVehicleMatch]
  );

  // Function to change the hourly package
  const changePackage = useCallback((newPackage: string) => {
    setHourlyPackage(newPackage);
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
