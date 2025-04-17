import React, { useState, useEffect } from 'react';
import { CabList } from './cab-options/CabList';
import { CabOptionsHeader } from './cab-options/CabOptionsHeader';
import { CabLoading } from './cab-options/CabLoading';
import { EmptyCabList } from './cab-options/EmptyCabList';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import { CabType } from '@/types/cab';
import { useCabOptions } from './cab-options/useCabOptions';
import { CabRefreshWarning } from './cab-options/CabRefreshWarning';
import { FareUpdateError } from './cab-options/FareUpdateError';

export interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  dropLocation?: string;
  returnDate?: Date | null;
  onPackageChange?: (packageId: string) => void;
  isCalculatingFares?: boolean;
}

export const CabOptions: React.FC<CabOptionsProps> = ({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage = '8hrs-80km',
  pickupDate,
  dropLocation,
  returnDate = null,
  onPackageChange,
  isCalculatingFares = false
}) => {
  const {
    isLoading,
    isError,
    handleRefresh,
    showWarning,
    setShowWarning,
    errorMessage
  } = useCabOptions();

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      <CabOptionsHeader
        tripType={tripType}
        hourlyPackage={hourlyPackage}
        onPackageChange={onPackageChange}
        isCalculatingFares={isCalculatingFares}
      />

      {isLoading ? (
        <CabLoading />
      ) : isError ? (
        <FareUpdateError
          errorMessage={errorMessage}
          onRefresh={handleRefresh}
        />
      ) : cabTypes.length > 0 ? (
        <CabList
          cabTypes={cabTypes}
          selectedCab={selectedCab}
          onSelectCab={onSelectCab}
          distance={distance}
          tripType={tripType}
          tripMode={tripMode}
          hourlyPackage={hourlyPackage}
          pickupDate={pickupDate}
          dropLocation={dropLocation}
          returnDate={returnDate}
          isCalculatingFares={isCalculatingFares}
        />
      ) : (
        <EmptyCabList />
      )}

      <CabRefreshWarning
        showWarning={showWarning}
        onClose={() => setShowWarning(false)}
      />
    </div>
  );
};
