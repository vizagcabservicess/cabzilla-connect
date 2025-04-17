
import React, { useState, useEffect } from 'react';
import { CabOptions } from '@/components/CabOptions';
import { BookingSummary } from '@/components/cab-options/BookingSummary';
import { useFareFetching } from '@/hooks/useFareFetching';
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
  // State for the selected cab and package
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [hourlyPackage, setHourlyPackage] = useState<string>('8hrs-80km');

  // Use our custom hook for fare fetching
  const { fetchFare, isFetching, currentFare, error } = useFareFetching();

  // Fetch fare when selected cab or hourly package changes
  useEffect(() => {
    if (selectedCab) {
      console.log(`Selected cab changed to ${selectedCab.name} or package changed to ${hourlyPackage}, fetching fare...`);
      fetchFare(selectedCab.id, hourlyPackage).then(fare => {
        if (fare > 0 && selectedCab) {
          // Update the cab's price property for display
          setSelectedCab(prevCab => {
            if (!prevCab) return null;
            return { ...prevCab, price: fare };
          });
        }
      });
    }
  }, [selectedCab?.id, hourlyPackage, fetchFare]);

  // Handle selecting a cab
  const handleSelectCab = (cab: CabType) => {
    console.log(`User selected cab: ${cab.name}`);
    setSelectedCab(cab);
  };

  // Handle changing hourly package
  const handlePackageChange = (packageId: string) => {
    console.log(`User changed package to: ${packageId}`);
    setHourlyPackage(packageId);
  };

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
