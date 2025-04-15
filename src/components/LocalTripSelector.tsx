import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
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
  
  // Convert legacy package ID to standard format if needed
  const normalizePackageId = (packageId: string): string => {
    if (!packageId) return "8hrs-80km"; // Default package if none provided
    
    const normalized = packageId
      .replace('hrs-', 'hr_')
      .replace('hr-', 'hr_');
    
    // Map to standard IDs if possible
    return standardPackageIds[normalized as keyof typeof standardPackageIds] || packageId;
  };
  
  // Load packages with API pricing
  const loadPackages = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log('LocalTripSelector: Loading package data with API pricing');
      
      // Create package objects with template data first
      const updatedPackages: HourlyPackage[] = [...hourlyPackages];
      
      // Use these vehicles as references for getting prices
      const referenceVehicles = ['sedan', 'ertiga', 'innova_crysta'];
      
      // Update all package prices in parallel for each vehicle type
      await Promise.all(updatedPackages.map(async (pkg) => {
        try {
          // Try to get prices from multiple vehicle types to ensure we have accurate data
          for (const vehicleId of referenceVehicles) {
            const price = await getLocalPackagePrice(pkg.id, vehicleId, true);
            if (price > 0) {
              // Only update if we got a valid price and it's for the reference sedan
              if (vehicleId === 'sedan') {
                pkg.basePrice = price;
                console.log(`Updated ${pkg.id} price to ${price} from ${vehicleId}`);
                break;
              }
            }
          }
        } catch (error) {
          console.warn(`Could not fetch reference price for package ${pkg.id}:`, error);
          // Keep the default template price if API fails
        }
      }));
      
      console.log('Available hourly packages with updated prices:', updatedPackages);
      setPackages(updatedPackages);
      
      // Select default package if none is selected
      if (!selectedPackage && updatedPackages.length > 0) {
        const defaultPackage = updatedPackages[1].id; // 8hrs-80km is usually the default
        console.log('Setting default package:', defaultPackage);
        onPackageSelect(defaultPackage);
        
        // Announce the selection
        window.dispatchEvent(new CustomEvent('hourly-package-selected', {
          detail: { packageId: defaultPackage, timestamp: Date.now() }
        }));
      }
      
      const timestamp = Date.now();
      setLastUpdateTime(timestamp);
      
      // Dispatch an event to trigger fare recalculation if we have a selected package
      if (selectedPackage) {
        console.log('Re-announcing selected package:', selectedPackage);
        window.dispatchEvent(new CustomEvent('hourly-package-selected', {
          detail: { packageId: selectedPackage, timestamp }
        }));
      }
      
      // Fetch full fares in the background
      fetchAndCacheLocalFares(true).catch(error => {
        console.error('Error fetching local fares in background:', error);
      });
      
    } catch (error) {
      console.error('Failed to load package data:', error);
      setLoadError(`Unable to load package pricing. Please try again later. (${error instanceof Error ? error.message : 'Unknown error'})`);
      
      // Fallback to template packages
      setPackages(hourlyPackages);
    } finally {
      setIsLoading(false);
    }
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
            if (pkg.id === event.detail.packageId && event.detail.vehicleType === 'sedan') {
              return { ...pkg, basePrice: event.detail.price };
            }
            return pkg;
          });
        });
      }
    };
    
    // Set up all event listeners
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    window.addEventListener('local-fare-updated', handleLocalFareUpdated as EventListener);
    
    return () => {
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
      window.removeEventListener('local-fare-updated', handleLocalFareUpdated as EventListener);
    };
  }, [selectedPackage, onPackageSelect]);
  
  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    console.log(`Selected package: ${packageId}`);
    
    // Support 04hrs-40km format by converting to 4hrs-40km
    let normalizedPackageId = packageId;
    
    // First check for the specific 04hrs-40km case
    if (packageId === '04hrs-40km') {
      normalizedPackageId = '4hrs-40km';
    } else {
      // Then apply general normalization rules
      normalizedPackageId = normalizePackageId(packageId);
    }
    
    // Always call onPackageSelect to update the parent component
    onPackageSelect(normalizedPackageId);
    
    // Force a refresh of all cached local package prices
    if (typeof window !== 'undefined') {
      window.localPackagePriceCache = {};
    }
    
    // Dispatch an event to notify other components about the package selection
    window.dispatchEvent(new CustomEvent('hourly-package-selected', {
      detail: { packageId: normalizedPackageId, timestamp: Date.now() }
    }));
    
    // Also dispatch a global force refresh event
    window.dispatchEvent(new CustomEvent('force-fare-recalculation', {
      detail: { source: 'LocalTripSelector', timestamp: Date.now() }
    }));
    
    // Show a toast notification
    toast.success(`Selected ${normalizedPackageId.replace(/-/g, ' ')} package`);
  };
  
  // Display an error message if loading failed
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
  
  // Display a loading state
  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-4">
          <CardTitle className="mb-4">Select Hourly Package</CardTitle>
          <div className="flex items-center justify-center p-4">
            <div className="animate-pulse text-center">
              <p>Loading package options...</p>
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
                <span className="font-medium text-sm">
                  {formatPrice(pkg.basePrice)}
                </span>
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
