
import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Loader2 } from "lucide-react";
import { HourlyPackage, hourlyPackages, getLocalPackagePrice, fetchAndCacheLocalFares } from '@/lib/packageData';
import { normalizePackageId, normalizeVehicleId } from '@/config/requestConfig';
import { toast } from 'sonner';

interface LocalTripSelectorProps {
  selectedPackage: string | undefined;
  onPackageSelect: (packageId: string) => void;
  selectedCabId?: string | null; // Added prop for selected cab
}

export function LocalTripSelector({ selectedPackage, onPackageSelect, selectedCabId }: LocalTripSelectorProps) {
  const [packages, setPackages] = useState<HourlyPackage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [lastSelectedCabId, setLastSelectedCabId] = useState<string | null | undefined>(selectedCabId);
  const [apiFailureCount, setApiFailureCount] = useState<number>(0);
  
  // Ensure the standard package IDs are consistent
  const standardPackageIds: Record<string, string> = {
    "4hr_40km": "4hrs-40km",
    "04hr_40km": "4hrs-40km",
    "04hrs_40km": "4hrs-40km",
    "4hrs_40km": "4hrs-40km",
    "8hr_80km": "8hrs-80km",
    "8hrs_80km": "8hrs-80km", 
    "10hr_100km": "10hrs-100km",
    "10hrs_100km": "10hrs-100km"
  };
  
  // Vehicle-specific pricing table for fallback
  const fallbackPrices: Record<string, Record<string, number>> = {
    'sedan': {
      '4hrs-40km': 1400,
      '8hrs-80km': 2400,
      '10hrs-100km': 3000
    },
    'ertiga': {
      '4hrs-40km': 1800,
      '8hrs-80km': 3000,
      '10hrs-100km': 3600
    },
    'innova_crysta': {
      '4hrs-40km': 2400,
      '8hrs-80km': 4000,
      '10hrs-100km': 4800
    },
    'innova_hycross': {
      '4hrs-40km': 2600,
      '8hrs-80km': 4200,
      '10hrs-100km': 5000
    },
    'tempo': {
      '4hrs-40km': 3000,
      '8hrs-80km': 5000,
      '10hrs-100km': 6000
    },
    'luxury': {
      '4hrs-40km': 2800,
      '8hrs-80km': 4500,
      '10hrs-100km': 5500
    },
    'dzire_cng': {
      '4hrs-40km': 1400,
      '8hrs-80km': 2400,
      '10hrs-100km': 3000
    },
    'etios': {
      '4hrs-40km': 1400,
      '8hrs-80km': 2400,
      '10hrs-100km': 3000
    }
  };
  
  // Load packages with API prices
  const loadPackages = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log('LocalTripSelector: Loading package data from API');
      
      // Create package objects with template data first
      const updatedPackages: HourlyPackage[] = [...hourlyPackages];
      
      // Use the selected cab if available, otherwise default to sedan
      const referenceVehicle = selectedCabId ? 
        normalizeVehicleId(selectedCabId) : 'sedan';
      
      console.log(`LocalTripSelector: Using ${referenceVehicle} as reference for package prices (original ID: ${selectedCabId})`);
      
      // Track whether we had API failures
      let apiFailures = 0;
      
      // Update all package prices in parallel
      await Promise.all(updatedPackages.map(async (pkg) => {
        try {
          // Get prices directly from API with the correct vehicle ID
          const price = await getLocalPackagePrice(pkg.id, referenceVehicle, true);
          if (price > 0) {
            pkg.basePrice = price;
            console.log(`Updated ${pkg.id} price to ${price} from API for ${referenceVehicle}`);
            
            // Also dispatch an event to notify other components about this fare
            window.dispatchEvent(new CustomEvent('local-fare-updated', {
              detail: { 
                packageId: pkg.id, 
                vehicleType: referenceVehicle, 
                price: price,
                timestamp: Date.now()
              }
            }));
            
            // Store the price in localStorage with the correct vehicle ID
            localStorage.setItem(`selected_fare_${referenceVehicle}_${pkg.id}`, price.toString());
          } else {
            console.warn(`API returned zero or invalid price for ${pkg.id} with vehicle ${referenceVehicle}`);
            apiFailures++;
            
            // Try a direct API call as fallback - use the normalized vehicle ID
            try {
              const apiUrl = `/api/local-package-fares.php?vehicle_id=${referenceVehicle}&package_id=${pkg.id}`;
              const response = await fetch(apiUrl, {
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'X-Force-Refresh': 'true'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.price) {
                  const altPrice = Number(data.price);
                  if (altPrice > 0) {
                    pkg.basePrice = altPrice;
                    console.log(`Updated ${pkg.id} price to ${altPrice} from alternative API for ${referenceVehicle}`);
                    return;
                  }
                }
              }
              
              throw new Error(`Could not get valid price from alternative API for ${pkg.id}`);
            } catch (altError) {
              console.error(`Failed to get price from alternative API:`, altError);
              apiFailures++;
              
              // Use cached price if available
              const cachedKey = `selected_fare_${referenceVehicle}_${pkg.id}`;
              const cachedPrice = localStorage.getItem(cachedKey);
              if (cachedPrice) {
                const parsedPrice = parseFloat(cachedPrice);
                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                  pkg.basePrice = parsedPrice;
                  console.log(`Using cached price for ${pkg.id}: ${parsedPrice}`);
                  return;
                }
              }
              
              // Use fallback prices
              useFallbackPricingForPackage(pkg, referenceVehicle);
            }
          }
        } catch (error) {
          console.error(`Could not fetch price for package ${pkg.id}:`, error);
          apiFailures++;
          
          // Use fallback prices based on vehicle type
          useFallbackPricingForPackage(pkg, referenceVehicle);
        }
      }));
      
      // Update API failure count
      setApiFailureCount(apiFailures);
      
      // If all API calls failed, show error message but still display packages
      if (apiFailures >= updatedPackages.length) {
        setLoadError(`Unable to connect to pricing server. Using fallback prices.`);
        toast.error("Network error: Using offline pricing", { 
          id: "pricing-fallback",
          duration: 3000
        });
      }
      
      console.log('Available hourly packages with updated prices:', updatedPackages);
      setPackages(updatedPackages);
      
      // Select default package if none is selected
      if (!selectedPackage && updatedPackages.length > 0) {
        const defaultPackage = updatedPackages[1].id; // 8hrs-80km is usually the default
        console.log('Setting default package:', defaultPackage);
        onPackageSelect(defaultPackage);
        
        // Announce the selection with the correct vehicle type
        window.dispatchEvent(new CustomEvent('hourly-package-selected', {
          detail: { 
            packageId: defaultPackage, 
            vehicleType: referenceVehicle,
            timestamp: Date.now() 
          }
        }));
      }
      
      const timestamp = Date.now();
      setLastUpdateTime(timestamp);
      
      // Dispatch an event to trigger fare recalculation if we have a selected package
      if (selectedPackage) {
        console.log('Re-announcing selected package:', selectedPackage);
        window.dispatchEvent(new CustomEvent('hourly-package-selected', {
          detail: { 
            packageId: selectedPackage, 
            vehicleType: referenceVehicle,
            timestamp 
          }
        }));
        
        // Also announce the correct vehicle and fare combination
        window.dispatchEvent(new CustomEvent('fare-source-update', {
          detail: {
            cabId: referenceVehicle,
            source: 'LocalTripSelector',
            forceConsistency: true,
            timestamp
          }
        }));
        
        // Also broadcast a direct fare update event to ensure BookingSummary is updated
        const normalizedPackageId = normalizePackageId(selectedPackage);
        const packagePrice = getPackagePriceByVehicle(normalizedPackageId, referenceVehicle);
        
        if (packagePrice > 0) {
          // Save to localStorage to ensure consistency
          localStorage.setItem(`selected_fare_${referenceVehicle}_${normalizedPackageId}`, packagePrice.toString());
          
          window.dispatchEvent(new CustomEvent('booking-summary-update', {
            detail: {
              cabId: referenceVehicle,
              tripType: 'local',
              packageId: normalizedPackageId,
              fare: packagePrice,
              source: 'LocalTripSelector-direct',
              timestamp
            }
          }));
        }
      }
      
      // Pre-fetch all fares in the background - include the current vehicle ID
      fetchAndCacheLocalFares(true).catch(error => {
        console.error('Error fetching local fares in background:', error);
      });
      
    } catch (error) {
      console.error('Failed to load package data:', error);
      setLoadError(`Unable to load package pricing. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to get fallback price for a package based on vehicle type
  const getPackagePriceByVehicle = (packageId: string, vehicleId: string): number => {
    // Normalize the IDs
    const normalizedPackageId = normalizePackageId(packageId);
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    
    // Check localStorage first
    const cacheKey = `selected_fare_${normalizedVehicleId}_${normalizedPackageId}`;
    const cachedPrice = localStorage.getItem(cacheKey);
    if (cachedPrice) {
      const parsedPrice = parseFloat(cachedPrice);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        return parsedPrice;
      }
    }
    
    // Find the most specific matching vehicle type in our fallback prices
    let matchingVehicleType: string | null = null;
    
    for (const vehicleType of Object.keys(fallbackPrices)) {
      if (normalizedVehicleId.includes(vehicleType)) {
        if (!matchingVehicleType || vehicleType.length > matchingVehicleType.length) {
          matchingVehicleType = vehicleType;
        }
      }
    }
    
    // If no match found, use sedan as default
    if (!matchingVehicleType) {
      matchingVehicleType = 'sedan';
    }
    
    // Get the price from our fallback prices
    const vehiclePrices = fallbackPrices[matchingVehicleType];
    const price = vehiclePrices[normalizedPackageId] || 3000;
    
    return price;
  };
  
  // Helper function to set fallback pricing for a package
  const useFallbackPricingForPackage = (pkg: HourlyPackage, vehicleId: string) => {
    const normalizedVehicleType = vehicleId.toLowerCase().replace(/\s+/g, '_');
    const price = getPackagePriceByVehicle(pkg.id, normalizedVehicleType);
    
    pkg.basePrice = price;
    console.log(`Using fallback price for ${pkg.id} with ${vehicleId}: ₹${price}`);
    
    // Store in localStorage for consistency
    localStorage.setItem(`selected_fare_${normalizedVehicleType}_${pkg.id}`, price.toString());
    
    return price;
  };
  
  // Initial load and setup event listeners
  useEffect(() => {
    // Initial fetch
    loadPackages();
    
    // Setup event listeners for fare updates
    const handleLocalFaresUpdated = () => {
      console.log('LocalTripSelector detected local fares updated event, refreshing packages');
      loadPackages();
    };
    
    const handleForceRecalculation = () => {
      console.log('LocalTripSelector detected force recalculation event, refreshing packages');
      loadPackages();
    };
    
    const handleLocalFareUpdated = (event: CustomEvent) => {
      if (event.detail && event.detail.packageId && event.detail.price) {
        console.log(`LocalTripSelector detected local fare update for ${event.detail.packageId}: ${event.detail.price}`);
        
        // Update just the specific package price if it exists in our packages array
        setPackages(prevPackages => {
          return prevPackages.map(pkg => {
            if (pkg.id === event.detail.packageId && selectedCabId) {
              // Properly normalize vehicle type before comparison 
              const normalizedSelectedCab = normalizeVehicleId(selectedCabId);
              const normalizedEventVehicle = event.detail.vehicleType.toLowerCase().replace(/\s+/g, '_');
              
              if (normalizedSelectedCab === normalizedEventVehicle) {
                return { ...pkg, basePrice: event.detail.price };
              }
            }
            return pkg;
          });
        });
      }
    };
    
    const handleCabSelected = (event: CustomEvent) => {
      if (event.detail && event.detail.cabId) {
        console.log(`LocalTripSelector: Cab selection changed to ${event.detail.cabId}, reloading packages`);
        // Reload packages with prices for the newly selected cab
        loadPackages();
      }
    };
    
    // Set up all event listeners
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    window.addEventListener('local-fare-updated', handleLocalFareUpdated as EventListener);
    window.addEventListener('cab-selected', handleCabSelected as EventListener);
    
    return () => {
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
      window.removeEventListener('local-fare-updated', handleLocalFareUpdated as EventListener);
      window.removeEventListener('cab-selected', handleCabSelected as EventListener);
    };
  }, [selectedPackage, onPackageSelect, selectedCabId]);
  
  // Refresh package prices when selected cab changes
  useEffect(() => {
    if (selectedCabId && selectedCabId !== lastSelectedCabId) {
      console.log(`LocalTripSelector: Selected cab changed from ${lastSelectedCabId} to ${selectedCabId}, reloading packages`);
      setLastSelectedCabId(selectedCabId);
      
      // Add a small delay to ensure the cab selection is processed first
      setTimeout(() => {
        loadPackages();
        
        // Also dispatch a new event to force consistency
        if (selectedPackage) {
          const normalizedVehicleId = normalizeVehicleId(selectedCabId);
          window.dispatchEvent(new CustomEvent('force-fare-consistency', {
            detail: { 
              vehicleId: normalizedVehicleId,
              packageId: selectedPackage,
              timestamp: Date.now() 
            }
          }));
        }
      }, 100);
    }
  }, [selectedCabId, lastSelectedCabId, selectedPackage]);
  
  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    console.log(`Selected package: ${packageId}`);
    
    // Normalize the package ID for consistent handling
    const normalizedPackageId = normalizePackageId(packageId);
    console.log(`Normalized package ID: ${normalizedPackageId}`);
    
    // Always call onPackageSelect to update the parent component
    onPackageSelect(normalizedPackageId);
    
    // Force a refresh of all cached local package prices
    if (typeof window !== 'undefined') {
      window.localPackagePriceCache = {};
    }
    
    // Add debounce to prevent too many events firing at once
    setTimeout(() => {
      // Use the properly normalized vehicle ID
      const referenceVehicle = selectedCabId ? 
        normalizeVehicleId(selectedCabId) : 'sedan';
        
      console.log(`Dispatching hourly-package-selected event with vehicle ${referenceVehicle}`);
      
      // Dispatch an event to notify other components about the package selection
      window.dispatchEvent(new CustomEvent('hourly-package-selected', {
        detail: { 
          packageId: normalizedPackageId, 
          vehicleType: referenceVehicle,
          timestamp: Date.now() 
        }
      }));
      
      // Also dispatch a global force refresh event
      window.dispatchEvent(new CustomEvent('force-fare-recalculation', {
        detail: { 
          source: 'LocalTripSelector', 
          vehicleType: referenceVehicle,
          timestamp: Date.now() 
        }
      }));
      
      // Add an additional event to ensure consistent fares
      window.dispatchEvent(new CustomEvent('selected-package-fare-sync', {
        detail: { 
          packageId: normalizedPackageId,
          vehicleId: referenceVehicle,
          needsSync: true,
          timestamp: Date.now() 
        }
      }));
      
      // Also broadcast a direct fare update event to ensure BookingSummary is updated
      const packagePrice = getPackagePriceByVehicle(normalizedPackageId, referenceVehicle);
      
      if (packagePrice > 0) {
        // Save to localStorage to ensure consistency
        localStorage.setItem(`selected_fare_${referenceVehicle}_${normalizedPackageId}`, packagePrice.toString());
        
        window.dispatchEvent(new CustomEvent('booking-summary-update', {
          detail: {
            cabId: referenceVehicle,
            tripType: 'local',
            packageId: normalizedPackageId,
            fare: packagePrice,
            source: 'LocalTripSelector-package-selection',
            timestamp: Date.now()
          }
        }));
      }
    }, 300);
    
    // Show a toast notification
    toast.success(`Selected ${normalizedPackageId.replace(/-/g, ' ')} package`);
  };
  
  // Display an error message if loading failed
  if (loadError) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-4">
          <CardTitle className="mb-4">Select Hourly Package</CardTitle>
          <Alert variant={apiFailureCount > 0 ? "default" : "destructive"} className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {loadError}
            </AlertDescription>
          </Alert>
          {packages.length > 0 && (
            <RadioGroup 
              value={selectedPackage} 
              onValueChange={handlePackageSelect}
              className="space-y-3"
              data-last-update={lastUpdateTime}
              data-selected-cab={selectedCabId || 'none'}
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
                        ₹{pkg.basePrice.toLocaleString('en-IN')}
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
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Display a loading state
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
  
  // Display a message if no packages are available
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
  
  // Format price for display
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
          data-selected-cab={selectedCabId || 'none'}
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
