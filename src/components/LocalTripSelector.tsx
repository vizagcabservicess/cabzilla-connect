
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
  notifyPackageChange,
  shouldThrottle,
  clearPackageFareCache
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
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Normalize the selected package for consistency
  const normalizedSelectedPackage = selectedPackage ? normalizePackageId(selectedPackage) : undefined;
  
  // Debug logging for package normalization
  useEffect(() => {
    if (selectedPackage) {
      console.log(`[DEBUG] LocalTripSelector: Selected package normalized from ${selectedPackage} to ${normalizedSelectedPackage}`);
    }
  }, [selectedPackage, normalizedSelectedPackage]);
  
  const loadPackages = async (forceRefresh = false) => {
    // Skip if already loading
    if (loadingRef.current) {
      console.log('LocalTripSelector: Already loading packages, skipping');
      return;
    }
    
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadRef.current;
    
    if (!forceRefresh && timeSinceLastLoad < 5000 && loadAttemptsRef.current > 0) { // 5 second throttle
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
      let successfulPrices = 0;
      
      try {
        for (const pkg of updatedPackages) {
          const normalizedPackageId = normalizePackageId(pkg.id);
          // Update the package id to normalized form for consistency
          pkg.id = normalizedPackageId;
          
          const cacheKey = `package_price_${normalizedPackageId}_${referenceVehicle}`;
          const cachedPrice = localStorage.getItem(cacheKey);
          
          if (cachedPrice) {
            const price = parseInt(cachedPrice, 10);
            if (!isNaN(price) && price > 0) {
              pkg.basePrice = price;
              console.log(`Using cached price for ${pkg.id}: ${price}`);
              usedCache = true;
              successfulPrices++;
            }
          }
        }
      } catch (cacheError) {
        console.error('Error using cached prices:', cacheError);
      }
      
      // Only make network requests if cache was incomplete or force refreshing
      if (forceRefresh || !usedCache || successfulPrices < updatedPackages.length) {
        console.log(`Cache status: ${successfulPrices}/${updatedPackages.length} packages from cache. ${forceRefresh ? 'Force refreshing.' : ''}`);
        
        // Use a timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Package price fetch timed out')), 5000);
        });
        
        // Process packages one at a time to avoid overwhelming the server
        for (const pkg of updatedPackages) {
          if (!mountedRef.current) break;
          
          // Skip if we already have a price for this package and not forcing refresh
          if (!forceRefresh && pkg.basePrice > 0) continue;
          
          try {
            const normalizedPackageId = pkg.id; // Already normalized above
            // Don't force refresh unless explicitly needed to reduce network traffic
            const shouldForceRefresh = forceRefresh || loadAttemptsRef.current <= 1;
            
            const pricePromise = getLocalPackagePrice(normalizedPackageId, referenceVehicle, shouldForceRefresh);
            const price = await Promise.race([pricePromise, timeoutPromise]) as number;
            
            if (price > 0) {
              pkg.basePrice = price;
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
            // Don't set error if some packages succeeded - we'll try again later
            if (successfulPrices === 0 && updatedPackages.every(p => p.basePrice <= 0)) {
              setLoadError(`Unable to load pricing for ${pkg.name}. Please try again.`);
            }
          }
        }
      }
      
      console.log('Available hourly packages with updated prices:', updatedPackages);
      setPackages(updatedPackages);
      
      // Set default package if none selected yet
      if (!normalizedSelectedPackage && updatedPackages.length > 0) {
        // Prefer 8hr package as default
        const defaultPackage = updatedPackages.find(p => p.id === '8hrs-80km')?.id || 
                               updatedPackages[1]?.id || 
                               updatedPackages[0]?.id;
        
        if (defaultPackage) {
          console.log('Setting default package:', defaultPackage);
          
          // Set default package using consistent utilities
          const normalizedDefaultPackage = normalizePackageId(defaultPackage);
          
          // Use our utility functions for consistent handling
          onPackageSelect(normalizedDefaultPackage);
          savePackageSelection(normalizedDefaultPackage);
          notifyPackageChange(normalizedDefaultPackage);
        }
      }
      
      setLastUpdateTime(Date.now());
      
      // If we got no successful prices, schedule a retry
      if (successfulPrices === 0 && updatedPackages.every(p => p.basePrice <= 0)) {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            console.log('Retrying package price fetch due to previous failure');
            loadPackages(true);
          }
          retryTimeoutRef.current = null;
        }, 3000); // 3 second delay before retry
      } else {
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
      }
    } catch (error) {
      console.error('Failed to load package data:', error);
      setLoadError(`Unable to load package pricing. Please try again.`);
      
      // Schedule retry after error
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log('Retrying package price fetch after error');
          loadPackages(true);
        }
        retryTimeoutRef.current = null;
      }, 5000); // 5 second delay before retry after error
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
      loadPackages(true);
    };
    
    const handleLocalFareUpdated = (event: CustomEvent) => {
      if (!mountedRef.current || shouldThrottle('fare-updated', 2000)) return;
      
      if (event.detail && event.detail.packageId && event.detail.price) {
        console.log(`LocalTripSelector detected local fare update for ${event.detail.packageId}: ${event.detail.price}`);
        
        setPackages(prevPackages => {
          return prevPackages.map(pkg => {
            if (normalizePackageId(pkg.id) === normalizePackageId(event.detail.packageId) && 
                event.detail.vehicleType === 'sedan') {
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
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
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
    
    // Don't proceed if package hasn't changed
    if (normalizedPackageId === normalizedSelectedPackage) {
      console.log(`Package ${normalizedPackageId} already selected, skipping update`);
      return;
    }
    
    // Clear relevant caches for the new package to ensure fresh pricing
    clearPackageFareCache(normalizedPackageId);
    
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
        <AlertDescription className="flex items-center justify-between">
          <span>{loadError}</span>
          <button 
            onClick={() => loadPackages(true)} 
            className="px-3 py-1 bg-destructive/10 hover:bg-destructive/20 rounded-md text-xs"
          >
            Try Again
          </button>
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
        <AlertDescription className="flex items-center justify-between">
          <span>No hourly packages are currently available.</span>
          <button 
            onClick={() => loadPackages(true)} 
            className="px-3 py-1 bg-primary/10 hover:bg-primary/20 rounded-md text-xs"
          >
            Refresh
          </button>
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
        <CardTitle className="mb-4 flex justify-between items-center">
          <span>Select Hourly Package</span>
          <button 
            onClick={() => loadPackages(true)} 
            className="text-xs text-muted-foreground hover:text-primary flex items-center"
            title="Refresh prices"
          >
            <Loader2 className="h-3 w-3 mr-1" />
            Refresh
          </button>
        </CardTitle>
        
        <RadioGroup 
          value={normalizedSelectedPackage} 
          onValueChange={handlePackageSelect}
          className="space-y-3"
          data-last-update={lastUpdateTime}
        >
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted ${
                normalizedSelectedPackage === pkg.id ? "border-primary bg-primary/5" : ""
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
