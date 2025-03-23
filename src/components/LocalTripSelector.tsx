
import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { HourlyPackage } from '@/types/cab';
import { hourlyPackages } from '@/lib/packageData';

interface LocalTripSelectorProps {
  selectedPackage: string | undefined;
  onPackageSelect: (packageId: string) => void;
}

export function LocalTripSelector({ selectedPackage, onPackageSelect }: LocalTripSelectorProps) {
  const [packages, setPackages] = useState<HourlyPackage[]>([]);
  
  // Load packages on component mount
  useEffect(() => {
    // Create default packages - these will ALWAYS be shown even if not in hourlyPackages
    const defaultPackages: HourlyPackage[] = [
      {
        id: '4hr_40km',
        name: '4 Hours Package',
        hours: 4,
        kilometers: 40,
        basePrice: 1000
      },
      {
        id: '8hr_80km',
        name: '8 Hours Package',
        hours: 8,
        kilometers: 80,
        basePrice: 2000
      },
      {
        id: '10hr_100km',
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
        // Only add if not already in our mergedPackages array
        if (!mergedPackages.some(p => p.id === pkg.id)) {
          mergedPackages.push(pkg);
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
      onPackageSelect(sortedPackages[0].id);
    }
    
    // Listen for local fare updates event and refresh packages
    const handleLocalFaresUpdated = () => {
      console.log('LocalTripSelector detected local fares updated event, refreshing packages');
      // Force a refresh of the component by triggering a re-render
      setPackages([...sortedPackages]);
    };
    
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    
    return () => {
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
    };
  }, [selectedPackage, onPackageSelect]);
  
  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    onPackageSelect(packageId);
    
    // Dispatch an event to notify other components about the package selection
    window.dispatchEvent(new CustomEvent('hourly-package-selected', {
      detail: { packageId, timestamp: Date.now() }
    }));
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
