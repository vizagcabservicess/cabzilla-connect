
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Loader2 } from "lucide-react";
import { HourlyPackage, hourlyPackages, getLocalPackagePrice } from '@/lib/packageData';
import { toast } from 'sonner';
import { 
  normalizePackageId, 
  getPackageDisplayName,
  savePackageSelection,
  notifyPackageChange,
  shouldThrottle,
  clearPackageFareCache,
  fareManager
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
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Define a reference vehicle for fare lookups
  const referenceVehicle = 'sedan';
  
  // Normalize the selected package for consistency
  const normalizedSelectedPackage = selectedPackage ? normalizePackageId(selectedPackage) : undefined;
  
  // Debug logging for package normalization
  useEffect(() => {
    if (selectedPackage) {
      console.log(`[DEBUG] LocalTripSelector: Selected package normalized from ${selectedPackage} to ${normalizedSelectedPackage}`);
    }
  }, [selectedPackage, normalizedSelectedPackage]);
  
  // Function to load packages with prices - optimized to reduce API calls and event emissions
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
      
      // Use the fareManager to get cached prices first
      let successfulPrices = 0;
      
      for (const pkg of updatedPackages) {
        const normalizedPackageId = normalizePackageId(pkg.id);
        // Update the package id to normalized form for consistency
        pkg.id = normalizedPackageId;
        
        // Try to get price from fare manager
        const cachedResult = fareManager.getFare(referenceVehicle, normalizedPackageId);
        if (cachedResult && cachedResult.price > 0) {
          pkg.basePrice = cachedResult.price;
          console.log(`Using cached price for ${pkg.id}: ${cachedResult.price} (source: ${cachedResult.source})`);
          successfulPrices++;
        }
      }
      
      // Set up API timeout
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
      }
      
      // If no prices are available after 3 seconds, use default prices
      apiTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current || !loadingRef.current) return;
        
        console.log('LocalTripSelector: API timeout, using default prices');
        
        // Update packages with default prices
        const packagesWithDefaults = updatedPackages.map(pkg => {
          if (pkg.basePrice <= 0) {
            // Default prices by package type
            if (pkg.id === '10hrs-100km') {
              pkg.basePrice = 3500;
            } else if (pkg.id === '8hrs-80km') {
              pkg.basePrice = 2500;
            } else if (pkg.id === '4hrs-40km') {
              pkg.basePrice = 1800;
            } else {
              pkg.basePrice = 2500; // Default
            }
            
            // Store in fare manager
            fareManager.storeFare(referenceVehicle, pkg.id, pkg.basePrice, 'default');
          }
          return pkg;
        });
        
        setPackages(packagesWithDefaults);
        setIsLoading(false);
        loadingRef.current = false;
        
        // Also set a reasonable default package if none selected
        if (!normalizedSelectedPackage && packagesWithDefaults.length > 0) {
          const defaultPackage = packagesWithDefaults.find(p => p.id === '8hrs-80km')?.id || 
                                packagesWithDefaults[0]?.id;
          
          if (defaultPackage) {
            console.log(`Setting default package due to timeout: ${defaultPackage}`);
            onPackageSelect(defaultPackage);
            savePackageSelection(defaultPackage);
            notifyPackageChange(defaultPackage);
          }
        }
      }, 3000); // 3 second timeout
      
      // Only make network requests if we don't have all cached prices or force refreshing
      if (forceRefresh || successfulPrices < updatedPackages.length) {
        console.log(`Cache status: ${successfulPrices}/${updatedPackages.length} packages from cache. ${forceRefresh ? 'Force refreshing.' : ''}`);
        
        // Instead of making multiple parallel requests, we'll make a single sequential request for each package
        // This prevents overwhelming the network and reduces redundant callbacks
        for (const pkg of updatedPackages) {
          if (forceRefresh || pkg.basePrice <= 0) {
            try {
              const price = await getLocalPackagePrice(pkg.id, referenceVehicle, forceRefresh);
              if (price > 0) {
                pkg.basePrice = price;
                console.log(`Updated ${pkg.id} price to ${price} from API`);
                
                // Store in fare manager
                fareManager.storeFare(referenceVehicle, pkg.id, price, 'api');
              }
            } catch (error) {
              console.error(`Error fetching price for ${pkg.id}:`, error);
              // Continue with other packages
            }
            
            // Small delay between requests to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Clear API timeout if we have successful results
        if (apiTimeoutRef.current) {
          clearTimeout(apiTimeoutRef.current);
          apiTimeoutRef.current = null;
        }
      }
      
      console.log('Available hourly packages with updated prices:', updatedPackages);
      setPackages(updatedPackages);
      
      // Set default package if none selected yet
      if (!normalizedSelectedPackage && updatedPackages.length > 0) {
        // Prefer 8hr package as default
        const defaultPackage = updatedPackages.find(p => p.id === '8hrs-80km')?.id || 
                              updatedPackages[0]?.id;
        
        if (defaultPackage) {
          console.log('Setting default package:', defaultPackage);
          
          // Set default package using consistent utilities
          onPackageSelect(defaultPackage);
          savePackageSelection(defaultPackage);
          notifyPackageChange(defaultPackage);
        }
      }
      
      setLastUpdateTime(Date.now());
      
      // Clear API timeout if we're done processing
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
        apiTimeoutRef.current = null;
      }
      
      setIsLoading(false);
      loadingRef.current = false;
    } catch (error) {
      console.error('Failed to load package data:', error);
      setLoadError(`Unable to load package pricing. Please try again.`);
      
      // Use default prices as fallback
      const updatedPackagesWithDefaults = hourlyPackages.map(pkg => {
        const normalizedId = normalizePackageId(pkg.id);
        
        // Default prices by package type
        let defaultPrice = 2500; // Default 8hrs price
        if (normalizedId === '10hrs-100km') {
          defaultPrice = 3500;
        } else if (normalizedId === '4hrs-40km') {
          defaultPrice = 1800;
        }
        
        // Store in fare manager
        fareManager.storeFare(referenceVehicle, normalizedId, defaultPrice, 'error-fallback');
        
        return {
          ...pkg,
          id: normalizedId,
          basePrice: defaultPrice
        };
      });
      
      setPackages(updatedPackagesWithDefaults);
      
      // Set default package if needed
      if (!normalizedSelectedPackage && updatedPackagesWithDefaults.length > 0) {
        const defaultPackage = updatedPackagesWithDefaults.find(p => p.id === '8hrs-80km')?.id || 
                              updatedPackagesWithDefaults[0]?.id;
        
        if (defaultPackage) {
          console.log(`Setting default package due to error: ${defaultPackage}`);
          onPackageSelect(defaultPackage);
          savePackageSelection(defaultPackage);
          notifyPackageChange(defaultPackage);
        }
      }
      
      setIsLoading(false);
      loadingRef.current = false;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        loadingRef.current = false;
      }
      
      // Clear API timeout if it's still active
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
        apiTimeoutRef.current = null;
      }
    }
  };
  
  // Initial load and event handlers
  useEffect(() => {
    mountedRef.current = true;
    loadPackages();
    
    // Handle fare update events - optimized to reduce redundant updates
    const handleFareUpdated = (event: CustomEvent) => {
      // Throttle fare update handling to prevent excessive re-renders
      if (!mountedRef.current || shouldThrottle('fare-update-packages', 1000)) return;
      
      if (event.detail && event.detail.packageId) {
        console.log(`LocalTripSelector: Received fare update for ${event.detail.packageId}: ${event.detail.price}`);
        
        // Update matching package price - use functional update to prevent race conditions
        setPackages(prevPackages => {
          return prevPackages.map(pkg => {
            if (pkg.id === event.detail.packageId) {
              return { ...pkg, basePrice: event.detail.price };
            }
            return pkg;
          });
        });
        
        // Update last update time to trigger re-render
        setLastUpdateTime(Date.now());
      }
    };
    
    // Listen for fare-related events - use a single handler for multiple event types
    window.addEventListener('fare-updated', handleFareUpdated as EventListener);
    
    // Handle force recalculation events with throttling
    const handleForceRecalculation = () => {
      if (!mountedRef.current || shouldThrottle('force-recalc-packages', 10000)) return;
      
      console.log('LocalTripSelector detected force recalculation event, refreshing packages');
      loadPackages(true);
    };
    
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (apiTimeoutRef.current) {
        clearTimeout(apiTimeoutRef.current);
      }
      window.removeEventListener('fare-updated', handleFareUpdated as EventListener);
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
    };
  }, []);
  
  // Handle package selection with consistent normalization and event throttling
  const handlePackageSelect = (packageId: string) => {
    if (shouldThrottle('package-selection', 1000)) {
      console.log('Package selection throttled, skipping to prevent multiple events');
      return;
    }
    
    if (!packageId) {
      console.warn('Attempted to select null or empty package ID');
      return;
    }
    
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
    
    // Use utilities for consistent handling - but only do this ONCE
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
