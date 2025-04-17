
import React, { useState, useEffect } from 'react';
import { CabOptions } from '@/components/CabOptions';
import { BookingSummary } from '@/components/cab-options/BookingSummary';
import { useLocalPackageFare } from '@/hooks/useLocalPackageFare';
import { CabType } from '@/types/cab';
import { Location } from '@/lib/locationData';

interface LocalPackagesTemplateProps {
  cabTypes: CabType[];
  pickupLocation: Location | null;
  pickupDate: Date;
  distance: number;
}

export const LocalPackagesTemplate: React.FC<LocalPackagesTemplateProps> = ({
  cabTypes,
  pickupLocation,
  pickupDate,
  distance
}) => {
  // State for the selected cab
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  
  // Use our custom hook for fare fetching
  const { fare, isFetching, error, hourlyPackage, fetchFare, changePackage } = useLocalPackageFare();

  // Fetch fare when selected cab changes
  useEffect(() => {
    if (selectedCab) {
      console.log(`Selected cab changed to ${selectedCab.name}, fetching fare...`);
      fetchFare(selectedCab.id, hourlyPackage);
    }
  }, [selectedCab?.id, hourlyPackage, fetchFare]);

  // Handle selecting a cab
  const handleSelectCab = (cab: CabType) => {
    console.log(`User selected cab: ${cab.name}`);
    setSelectedCab(prevCab => {
      // If selecting the same cab, don't trigger a re-render
      if (prevCab?.id === cab.id) return prevCab;
      return { ...cab, price: fare > 0 ? fare : cab.price };
    });
  };

  // Handle changing hourly package
  const handlePackageChange = (packageId: string) => {
    console.log(`User changed package to: ${packageId}`);
    changePackage(packageId);
  };

  // Update cab price when fare changes
  useEffect(() => {
    if (selectedCab && fare > 0) {
      setSelectedCab(prevCab => {
        if (!prevCab) return null;
        return { ...prevCab, price: fare };
      });
    }
  }, [fare]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
      <div className="lg:col-span-2">
        <CabOptions
          cabTypes={cabTypes}
          selectedCab={selectedCab}
          onSelectCab={handleSelectCab}
          distance={distance}
          tripType="local"
          tripMode="one-way"
          hourlyPackage={hourlyPackage}
          pickupDate={pickupDate}
          isCalculatingFares={isFetching}
          onPackageChange={handlePackageChange}
        />
      </div>
      
      <div className="lg:col-span-1">
        {selectedCab && (
          <BookingSummary
            selectedCab={selectedCab}
            pickupLocation={pickupLocation?.name || ''}
            pickupDate={pickupDate}
            tripType="local"
            distance={distance}
            hourlyPackage={hourlyPackage}
            isCalculatingFares={isFetching}
            fare={fare}
          />
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
