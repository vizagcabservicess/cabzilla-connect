import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { IndianRupee } from "lucide-react";

interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  price: number;
}

interface LocalTripSelectorProps {
  vehicleType: 'sedan' | 'suv' | 'auto';
  selectedPackage: string;
  onPackageSelect: (packageId: string) => void;
}

const hourlyPackages: HourlyPackage[] = [
  {
    id: 'local-4h-40k',
    name: '4 Hours • 40 KM',
    hours: 4,
    kilometers: 40,
    price: 0, // Will be calculated based on vehicle type
  },
  {
    id: 'local-8h-80k',
    name: '8 Hours • 80 KM',
    hours: 8,
    kilometers: 80,
    price: 0, // Will be calculated based on vehicle type
  },
  {
    id: 'local-12h-120k',
    name: '12 Hours • 120 KM',
    hours: 12,
    kilometers: 120,
    price: 0, // Will be calculated based on vehicle type
  }
];

export function LocalTripSelector({ vehicleType, selectedPackage, onPackageSelect }: LocalTripSelectorProps) {
  const getPriceForVehicle = (packageItem: HourlyPackage): number => {
    let basePrice = 0;
    switch (vehicleType) {
      case 'sedan':
        basePrice = packageItem.hours * 300;
        break;
      case 'suv':
        basePrice = packageItem.hours * 500;
        break;
      case 'auto':
        basePrice = packageItem.hours * 150;
        break;
      default:
        basePrice = packageItem.hours * 200;
    }
    return basePrice;
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Select Local Trip Package</h2>
        <RadioGroup value={selectedPackage} onValueChange={onPackageSelect} className="space-y-2">
          {hourlyPackages.map((packageItem) => {
            const calculatedPrice = getPriceForVehicle(packageItem);
            return (
              <div key={packageItem.id} className="flex items-center space-x-2">
                <RadioGroupItem value={packageItem.id} id={packageItem.id} />
                <Label htmlFor={packageItem.id} className="flex justify-between w-full p-2 rounded-md border hover:bg-secondary hover:text-secondary-foreground">
                  <span>{packageItem.name}</span>
                  <span className="font-semibold">
                    <IndianRupee className="inline-block h-4 w-4 mr-1" />
                    {calculatedPrice}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
