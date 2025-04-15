
import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { HourlyPackage } from '@/types/cab';
import { hourlyPackages, fetchAndCacheLocalFares } from '@/lib/packageData';
import { toast } from 'sonner';

interface LocalTripSelectorProps {
  selectedPackage: string | undefined;
  onPackageSelect: (packageId: string) => void;
}

interface FareData {
  price4hrs40km?: number;
  price_4hr_40km?: number;
  price8hrs80km?: number;
  price_8hr_80km?: number;
  price10hrs100km?: number;
  price_10hr_100km?: number;
  [key: string]: any;
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
  
  // Load packages from API
  const loadPackagesFromApi = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log('LocalTripSelector: Loading package data from API');
      // Fetch up-to-date fare data from the API
      const fares = await fetchAndCacheLocalFares();
      
      if (!fares || Object.keys(fares).length === 0) {
        throw new Error('No fare data available from API');
      }
      
      // Create default packages structure - these will be populated with API data
      const packageTemplates: HourlyPackage[] = [
        {
          id: '4hrs-40km',
          name: '4 Hours Package',
          hours: 4,
          kilometers: 40,
          basePrice: 0
        },
        {
          id: '8hrs-80km',
          name: '8 Hours Package',
          hours: 8,
          kilometers: 80,
          basePrice: 0
        },
        {
          id: '10hrs-100km',
          name: '10 Hours Package',
          hours: 10,
          kilometers: 100,
          basePrice: 0
        }
      ];
      
      // Populate package prices using the first vehicle's fares
      // (UI will display package options, actual vehicle-specific pricing is handled elsewhere)
      const firstVehicle = Object.values(fares)[0] as FareData;
      
      if (firstVehicle) {
        packageTemplates[0].basePrice = firstVehicle.price4hrs40km || firstVehicle.price_4hr_40km || 0;
        packageTemplates[1].basePrice = firstVehicle.price8hrs80km || firstVehicle.price_8hr_80km || 0;
        packageTemplates[2].basePrice = firstVehicle.price10hrs100km || firstVehicle.price_10hr_100km || 0;
      }

      // Filter out packages with no pricing
      const validPackages = packageTemplates.filter(pkg => pkg.basePrice > 0);
      
      if (validPackages.length === 0) {
        throw new Error('No valid package pricing received from API');
      }
      
      console.log('Available hourly packages:', validPackages);
      setPackages(validPackages);
      
      // Select default package if none is selected
      if (!selectedPackage && validPackages.length > 0) {
        const defaultPackage = validPackages[0].id;
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
    } catch (error) {
      console.error('Failed to load package data from API:', error);
      setLoadError(`Unable to load package pricing. Please try again later. (${error instanceof Error ? error.message : 'Unknown error'})`);
      
      // Fallback to template packages with no prices (UI only)
      setPackages(hourlyPackages);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial load and setup event listeners
  useEffect(() => {
    // Initial fetch from API
    loadPackagesFromApi();
    
    // Setup event listeners for fare updates
    const handleLocalFaresUpdated = () => {
      console.log('LocalTripSelector detected local fares updated event, refreshing packages');
      loadPackagesFromApi();
    };
    
    const handleForceRecalculation = () => {
      console.log('LocalTripSelector detected force recalculation event, refreshing packages');
      loadPackagesFromApi();
    };
    
    // Set up all event listeners
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    
    return () => {
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
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
