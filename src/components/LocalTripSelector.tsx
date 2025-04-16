
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Loader2 } from "lucide-react";
import { HourlyPackage, hourlyPackages, getLocalPackagePrice, fetchAndCacheLocalFares } from '@/lib/packageData';
import { toast } from 'sonner';
import { 
  normalizePackageId, 
  getPackageDisplayName,
  savePackageSelection,
  notifyPackageChange 
} from '@/lib/packageUtils';

interface LocalTripSelectorProps {
  selectedPackage: string | undefined;
  onPackageSelect: (packageId: string) => void;
}

export function LocalTripSelector({ selectedPackage, onPackageSelect }: LocalTripSelectorProps) {
  const [packages, setPackages] = useState<HourlyPackage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  
  // Add refs for throttling and tracking
  const lastLoadRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false);
  const loadAttemptsRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const lastEventTimeRef = useRef<Record<string, number>>({});
  
  // Function to check if we should throttle an event
  const shouldThrottle = (eventType: string, throttleMs: number = 5000): boolean => {
    const now = Date.now();
    const lastTime = lastEventTimeRef.current[eventType] || 0;
    
    if (now - lastTime < throttleMs) {
      console.log(`LocalTripSelector: Throttling ${eventType} (${now - lastTime}ms < ${throttleMs}ms)`);
      return true;
    }
    
    lastEventTimeRef.current[eventType] = now;
    return false;
  };
  
  const loadPackages = async () => {
    // Skip if already loading or throttled
    if (loadingRef.current) {
      console.log('LocalTripSelector: Already loading packages, skipping');
      return;
    }
    
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadRef.current;
    
    if (timeSinceLastLoad < 5000 && loadAttemptsRef.current > 0) { // 5 second throttle
      console.log(`LocalTripSelector: Throttling load (${timeSinceLastLoad}ms since last load)`);
      return;
    }
    
    loadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);
    lastLoadRef.current = now;
    loadAttemptsRef.current++;
    
    try {
      console.log('LocalTripSelector: Loading package data');
      
      const updatedPackages: HourlyPackage[] = [...hourlyPackages];
      
      const referenceVehicle = 'sedan';
      
      // First try to load from localStorage cache to avoid network requests
      let usedCache = false;
      try {
        for (const pkg of updatedPackages) {
          const normalizedPackageId = normalizePackageId(pkg.id);
          const cacheKey = `package_price_${normalizedPackageId}_${referenceVehicle}`;
          const cachedPrice = localStorage.getItem(cacheKey);
          
          if (cachedPrice) {
            const price = parseInt(cachedPrice, 10);
            if (!isNaN(price) && price > 0) {
              pkg.basePrice = price;
              pkg.id = normalizedPackageId;
              console.log(`Using cached price for ${pkg.id}: ${price}`);
              usedCache = true;
            }
          }
        }
      } catch (cacheError) {
        console.error('Error using cached prices:', cacheError);
      }
      
      // Only make network requests if cache was incomplete
      if (!usedCache || loadAttemptsRef.current === 1) {
        // Use a timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Package price fetch timed out')), 5000);
        });
        
        // Process packages one at a time to avoid overwhelming the server
        for (const pkg of updatedPackages) {
          if (!mountedRef.current) break;
          
          try {
            const normalizedPackageId = normalizePackageId(pkg.id);
            // Don't force refresh unless explicitly needed to reduce network traffic
            const forceRefresh = loadAttemptsRef.current <= 1;
            
            const pricePromise = getLocalPackagePrice(normalizedPackageId, referenceVehicle, forceRefresh);
            const price = await Promise.race([pricePromise, timeoutPromise]) as number;
            
            if (price > 0) {
              pkg.basePrice = price;
              pkg.id = normalizedPackageId;
              console.log(`Updated ${pkg.id} price to ${price} from API`);
              
              // Cache the price in localStorage
              try {
                const cacheKey = `package_price_${normalizedPackageId}_${referenceVehicle}`;
                localStorage.setItem(cacheKey, price.toString());
              } catch (cacheError) {
                console.error('Error caching price:', cacheError);
              }
            } else {
              console.warn(`API returned zero or invalid price for ${pkg.id}`);
            }
          } catch (error) {
            console.error(`Could not fetch price for package ${pkg.id}:`, error);
            // Only set error if all packages fail
            if (!updatedPackages.some(p => p.basePrice > 0)) {
              setLoadError(`Unable to load pricing for ${pkg.name}. Please try again.`);
            }
          }
        }
      }
      
      console.log('Available hourly packages with updated prices:', updatedPackages);
      setPackages(updatedPackages);
      
      if (!selectedPackage && updatedPackages.length > 0) {
        const defaultPackage = updatedPackages[1]?.id || updatedPackages[0]?.id;
        if (defaultPackage) {
          console.log('Setting default package:', defaultPackage);
          
          // Set default package using consistent utilities
          const normalizedDefaultPackage = normalizePackageId(defaultPackage);
          onPackageSelect(normalizedDefaultPackage);
          
          // Use our utility functions for consistent handling
          savePackageSelection(normalizedDefaultPackage);
          
          // Throttle notification events
          if (!shouldThrottle('default-package-selection', 5000)) {
            notifyPackageChange(normalizedDefaultPackage);
          }
        }
      }
      
      setLastUpdateTime(Date.now());
      
      // Fetch additional fare data in the background with low priority
      if (!shouldThrottle('background-fetch', 30000)) {
        setTimeout(() => {
          if (mountedRef.current) {
            fetchAndCacheLocalFares(false).catch(error => {
              console.error('Error fetching local fares in background:', error);
            });
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to load package data:', error);
      setLoadError(`Unable to load package pricing. Please try again.`);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        loadingRef.current = false;
      }
    }
  };
  
  useEffect(() => {
    mountedRef.current = true;
    loadPackages();
    
    const handleLocalFaresUpdated = () => {
      if (!mountedRef.current || shouldThrottle('fares-updated', 10000)) return;
      
      console.log('LocalTripSelector detected local fares updated event, refreshing packages');
      loadPackages();
    };
    
    const handleForceRecalculation = () => {
      if (!mountedRef.current || shouldThrottle('force-recalculation', 10000)) return;
      
      console.log('LocalTripSelector detected force recalculation event, refreshing packages');
      loadPackages();
    };
    
    const handleLocalFareUpdated = (event: CustomEvent) => {
      if (!mountedRef.current || shouldThrottle('fare-updated', 2000)) return;
      
      if (event.detail && event.detail.packageId && event.detail.price) {
        console.log(`LocalTripSelector detected local fare update for ${event.detail.packageId}: ${event.detail.price}`);
        
        setPackages(prevPackages => {
          return prevPackages.map(pkg => {
            if (pkg.id === event.detail.packageId && event.detail.vehicleType === 'sedan') {
              return { ...pkg, basePrice: event.detail.price };
            }
            return pkg;
          });
        });
      }
    };
    
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    window.addEventListener('local-fare-updated', handleLocalFareUpdated as EventListener);
    
    return () => {
      mountedRef.current = false;
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
      window.removeEventListener('local-fare-updated', handleLocalFareUpdated as EventListener);
    };
  }, []);
  
  // Handle package selection with consistent normalization
  const handlePackageSelect = (packageId: string) => {
    if (shouldThrottle('package-selection', 1000)) return;
    
    console.log(`Selected package: ${packageId}`);
    
    // Normalize the package ID using our utility
    const normalizedPackageId = normalizePackageId(packageId);
    
    // Don't clear caches on every selection to reduce needless refreshes
    // Only clear relevant cache entries
    try {
      if (typeof window !== 'undefined') {
        const localStorageKeys = Object.keys(localStorage);
        for (const key of localStorageKeys) {
          // Be more selective about which keys to clear
          if (key.startsWith(`selected_fare_${normalizedPackageId}`) || 
              key.startsWith(`fare_local_${normalizedPackageId}`)) {
            localStorage.removeItem(key);
            console.log(`Cleared specific cache for ${key}`);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing specific caches:', error);
    }
    
    // Update parent component
    onPackageSelect(normalizedPackageId);
    
    // Use utilities for consistent handling
    savePackageSelection(normalizedPackageId);
    notifyPackageChange(normalizedPackageId);
    
    toast.success(`Selected ${getPackageDisplayName(normalizedPackageId)} package`);
  };
  
  if (loadError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {loadError}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-4">
          <CardTitle className="mb-4">Select Hourly Package</CardTitle>
          <div className="flex items-center justify-center p-4">
            <div className="animate-pulse text-center flex flex-col items-center">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p>Loading package options from server...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (packages.length === 0) {
    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          No hourly packages are currently available. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  const formatPrice = (price?: number) => {
    if (!price || price <= 0) return "Price unavailable";
    return `₹${price.toLocaleString('en-IN')}`;
  };
  
  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <CardTitle className="mb-4">Select Hourly Package</CardTitle>
        
        <RadioGroup 
          value={selectedPackage} 
          onValueChange={handlePackageSelect}
          className="space-y-3"
          data-last-update={lastUpdateTime}
        >
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted ${
                selectedPackage === pkg.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => handlePackageSelect(pkg.id)}
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={pkg.id} id={pkg.id} />
                <Label htmlFor={pkg.id} className="flex flex-col cursor-pointer">
                  <span className="font-medium">{pkg.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {pkg.hours} hours, up to {pkg.kilometers} km
                  </span>
                </Label>
              </div>
              
              <div className="text-right">
                {pkg.basePrice > 0 ? (
                  <span className="font-medium text-sm">
                    {formatPrice(pkg.basePrice)}
                  </span>
                ) : (
                  <span className="text-sm text-destructive">
                    <Loader2 className="h-4 w-4 inline-block animate-spin mr-1" />
                    Loading...
                  </span>
                )}
                <span className="block text-xs text-muted-foreground">
                  Base price
                </span>
              </div>
            </div>
          ))}
        </RadioGroup>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p className="mb-1">Additional charges:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Extra hours charged separately</li>
            <li>Extra km beyond package limit will be charged</li>
            <li>Toll and parking charges extra</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
