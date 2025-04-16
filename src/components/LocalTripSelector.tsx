
import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Loader2 } from "lucide-react";
import { HourlyPackage, hourlyPackages, getLocalPackagePrice, fetchAndCacheLocalFares } from '@/lib/packageData';
import { toast } from 'sonner';

interface LocalTripSelectorProps {
  selectedPackage: string | undefined;
  onPackageSelect: (packageId: string) => void;
}

export function LocalTripSelector({ selectedPackage, onPackageSelect }: LocalTripSelectorProps) {
  const [packages, setPackages] = useState<HourlyPackage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  
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
  
  const normalizePackageId = (packageId: string): string => {
    if (!packageId) return "8hrs-80km";
    
    const normalized = packageId
      .replace('hrs-', 'hr_')
      .replace('hr-', 'hr_');
    
    return standardPackageIds[normalized as keyof typeof standardPackageIds] || packageId;
  };
  
  const loadPackages = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log('LocalTripSelector: Loading package data from API');
      
      const updatedPackages: HourlyPackage[] = [...hourlyPackages];
      
      const referenceVehicle = 'sedan';
      
      await Promise.all(updatedPackages.map(async (pkg) => {
        try {
          const price = await getLocalPackagePrice(pkg.id, referenceVehicle, true);
          if (price > 0) {
            pkg.basePrice = price;
            console.log(`Updated ${pkg.id} price to ${price} from API`);
          } else {
            console.warn(`API returned zero or invalid price for ${pkg.id}`);
            throw new Error(`Invalid price (${price}) for ${pkg.id}`);
          }
        } catch (error) {
          console.error(`Could not fetch price for package ${pkg.id}:`, error);
          setLoadError(`Unable to load pricing for ${pkg.name}. Please try again.`);
        }
      }));
      
      console.log('Available hourly packages with updated prices:', updatedPackages);
      setPackages(updatedPackages);
      
      if (!selectedPackage && updatedPackages.length > 0) {
        const defaultPackage = updatedPackages[1].id;
        console.log('Setting default package:', defaultPackage);
        onPackageSelect(defaultPackage);
        
        window.dispatchEvent(new CustomEvent('hourly-package-selected', {
          detail: { packageId: defaultPackage, timestamp: Date.now() }
        }));
      }
      
      const timestamp = Date.now();
      setLastUpdateTime(timestamp);
      
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
  
  useEffect(() => {
    loadPackages();
    
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
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
      window.removeEventListener('local-fare-updated', handleLocalFareUpdated as EventListener);
    };
  }, [selectedPackage, onPackageSelect]);
  
  const handlePackageSelect = (packageId: string) => {
    console.log(`Selected package: ${packageId}`);
    
    let normalizedPackageId = packageId;
    
    if (packageId === '04hrs-40km') {
      normalizedPackageId = '4hrs-40km';
    } else {
      normalizedPackageId = normalizePackageId(packageId);
    }
    
    // Clear all selected fare cache for ALL cab types to force refresh
    try {
      if (typeof window !== 'undefined') {
        console.log(`Clearing all fare caches due to package change to ${normalizedPackageId}`);
        
        // First, clear our global fare cache object
        window.localPackagePriceCache = {};
        
        // Clear any selected_fare entries in localStorage for ALL vehicles
        const localStorageKeys = Object.keys(localStorage);
        for (const key of localStorageKeys) {
          if (key.startsWith('selected_fare_') || key.startsWith('fare_local_')) {
            localStorage.removeItem(key);
            console.log(`Cleared cached fare for ${key} due to package change`);
          }
        }
        
        // Clear any pending fare calculations - safely check if property exists first
        if (window.pendingFareRequests) {
          window.pendingFareRequests = {};
        }
      }
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
    
    onPackageSelect(normalizedPackageId);
    
    // Dispatch multiple events to ensure all components update correctly
    window.dispatchEvent(new CustomEvent('hourly-package-selected', {
      detail: { 
        packageId: normalizedPackageId, 
        timestamp: Date.now() 
      }
    }));
    
    // Force all fare calculations to refresh
    window.dispatchEvent(new CustomEvent('force-fare-recalculation', {
      detail: { 
        source: 'LocalTripSelector', 
        packageId: normalizedPackageId,
        timestamp: Date.now() + 1 
      }
    }));
    
    // Force booking summary to update with new package
    window.dispatchEvent(new CustomEvent('booking-package-changed', {
      detail: {
        packageId: normalizedPackageId,
        packageName: getPackageDisplayName(normalizedPackageId),
        source: 'LocalTripSelector',
        timestamp: Date.now() + 2
      }
    }));
    
    // Send specific package update to booking summary
    window.dispatchEvent(new CustomEvent('booking-summary-package-update', {
      detail: {
        packageId: normalizedPackageId,
        packageName: getPackageDisplayName(normalizedPackageId),
        source: 'LocalTripSelector',
        timestamp: Date.now() + 3
      }
    }));
    
    toast.success(`Selected ${normalizedPackageId.replace(/-/g, ' ')} package`);
  };
  
  const getPackageDisplayName = (packageId: string): string => {
    if (packageId.includes('4hrs-40km')) {
      return '4hrs 40KM Package';
    } else if (packageId.includes('8hrs-80km')) {
      return '8hrs 80KM Package';
    } else if (packageId.includes('10hrs-100km')) {
      return '10hrs 100KM Package';
    }
    return packageId.replace(/-/g, ' ');
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

const formatPrice = (price?: number) => {
  if (!price || price <= 0) return "Price unavailable";
  return `₹${price.toLocaleString('en-IN')}`;
};
