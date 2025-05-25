
import React from 'react';
import { CabList } from '@/components/cab-options/CabList';
import { CabType } from '@/types/cab';

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode: string;
  pickupDate?: Date;
  returnDate?: Date;
  hourlyPackage?: string;
  isCalculatingFares?: boolean;
}

export function CabOptions({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  pickupDate,
  returnDate,
  hourlyPackage,
  isCalculatingFares = false
}: CabOptionsProps) {
  const handleSelectCab = (cab: CabType, fareAmount: number, breakdown?: any) => {
    onSelectCab(cab);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Your Cab</h3>
      <CabList
        cabTypes={cabTypes}
        selectedCabId={selectedCab?.id || null}
        isCalculatingFares={isCalculatingFares}
        handleSelectCab={handleSelectCab}
        tripType={tripType}
        tripMode={tripMode}
        distance={distance}
        packageType={hourlyPackage}
        pickupDate={pickupDate}
      />
    </div>
  );
}
