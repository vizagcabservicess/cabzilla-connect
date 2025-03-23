
import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { HourlyPackage } from '@/types/cab';
import { hourlyPackages } from '@/lib/packageData';
import { toast } from 'sonner';

interface LocalTripSelectorProps {
  selectedPackage: string | undefined;
  onPackageSelect: (packageId: string) => void;
}

export function LocalTripSelector({ selectedPackage, onPackageSelect }: LocalTripSelectorProps) {
  const [packages, setPackages] = useState<HourlyPackage[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  
  // Ensure the standard package IDs are consistent
  const standardPackageIds = {
    "4hr_40km": "4hrs-40km",
    "8hr_80km": "8hrs-80km",
    "10hr_100km": "10hrs-100km"
  };
  
  // Convert legacy package ID to standard format if needed
  const normalizePackageId = (packageId: string): string => {
    const normalized = packageId
      .replace('hrs-', 'hr_')
      .replace('hr-', 'hr_');
    
    // Map to standard IDs if possible
    return standardPackageIds[normalized as keyof typeof standardPackageIds] || packageId;
  };
  
  // Load packages on component mount
  useEffect(() => {
    // Create default packages - these will ALWAYS be shown even if not in hourlyPackages
    const defaultPackages: HourlyPackage[] = [
      {
        id: '4hrs-40km',
        name: '4 Hours Package',
        hours: 4,
        kilometers: 40,
        basePrice: 1000
      },
      {
        id: '8hrs-80km',
        name: '8 Hours Package',
        hours: 8,
        kilometers: 80,
        basePrice: 2000
      },
      {
        id: '10hrs-100km',
        name: '10 Hours Package',
        hours: 10,
        kilometers: 100,
        basePrice: 2500
      }
    ];
    
    // Start with all default packages to ensure they're always available
    const mergedPackages: HourlyPackage[] = [...defaultPackages];
    
    // Add any packages from hourlyPackages that aren't already in our defaults
    if (Array.isArray(hourlyPackages) && hourlyPackages.length > 0) {
      hourlyPackages.forEach(pkg => {
        // Normalize the package ID to ensure consistent format
        const normalizedId = normalizePackageId(pkg.id);
        // Only add if not already in our mergedPackages array
        if (!mergedPackages.some(p => normalizePackageId(p.id) === normalizedId)) {
          mergedPackages.push({
            ...pkg,
            id: normalizedId // Use the normalized ID for consistency
          });
        }
      });
    }
    
    console.log('Available hourly packages before sorting:', mergedPackages);
    
    // Sort packages by hours
    const sortedPackages = mergedPackages.sort((a, b) => a.hours - b.hours);
    
    console.log('Final available hourly packages:', sortedPackages);
    setPackages(sortedPackages);
    
    // Select default package if none is selected
    if (!selectedPackage && sortedPackages.length > 0) {
      const defaultPackage = sortedPackages[0].id;
      console.log('Setting default package:', defaultPackage);
      onPackageSelect(defaultPackage);
      
      // Announce the selection
      window.dispatchEvent(new CustomEvent('hourly-package-selected', {
        detail: { packageId: defaultPackage, timestamp: Date.now() }
      }));
    }
    
    // Function to refresh packages and force UI update
    const refreshPackages = () => {
      console.log('LocalTripSelector: Refreshing package data');
      const timestamp = Date.now();
      setLastUpdateTime(timestamp);
      
      // Force a rerender to ensure we show fresh data
      setPackages([...sortedPackages]);
      
      // If there's a selected package, re-announce it to trigger fare recalculation
      if (selectedPackage) {
        console.log('Re-announcing selected package:', selectedPackage);
        window.dispatchEvent(new CustomEvent('hourly-package-selected', {
          detail: { packageId: selectedPackage, timestamp }
        }));
      }
    };
    
    // Listen for local fare updates event and refresh packages
    const handleLocalFaresUpdated = () => {
      console.log('LocalTripSelector detected local fares updated event, refreshing packages');
      refreshPackages();
    };
    
    // Listen for fare cache cleared event
    const handleFareCacheCleared = () => {
      console.log('LocalTripSelector detected fare cache cleared event, refreshing packages');
      refreshPackages();
    };
    
    // Listen for force recalculation event
    const handleForceRecalculation = () => {
      console.log('LocalTripSelector detected force recalculation event, refreshing packages');
      refreshPackages();
    };
    
    // Setup all event listeners
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    window.addEventListener('force-fare-recalculation', handleForceRecalculation);
    
    // Set up periodic refresh (every 60 seconds)
    const refreshInterval = setInterval(refreshPackages, 60000);
    
    return () => {
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
      window.removeEventListener('force-fare-recalculation', handleForceRecalculation);
      clearInterval(refreshInterval);
    };
  }, [selectedPackage, onPackageSelect]);
  
  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    console.log(`Selected package: ${packageId}`);
    if (packageId === selectedPackage) {
      console.log('Package already selected, forcing refresh anyway');
    }
    
    // Always call onPackageSelect to update the parent component
    onPackageSelect(packageId);
    
    // Dispatch an event to notify other components about the package selection
    window.dispatchEvent(new CustomEvent('hourly-package-selected', {
      detail: { packageId, timestamp: Date.now() }
    }));
    
    // Also dispatch a global force refresh event
    window.dispatchEvent(new CustomEvent('force-fare-recalculation', {
      detail: { source: 'LocalTripSelector', timestamp: Date.now() }
    }));
    
    // Show a toast notification
    toast.success(`Selected ${packageId.replace(/-/g, ' ')} package`);
  };
  
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
    if (!price) return "Price unavailable";
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
