
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
  // Local state to handle warnings and errors
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Fetch data from useCabOptions hook
  const {
    isLoading,
    error,
    refresh
  } = useCabOptions({ 
    tripType, 
    tripMode, 
    distance 
  });

  // Convert error to errorMessage if present
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
    } else {
      setErrorMessage(null);
    }
  }, [error]);

  // Refresh handler
  const handleRefresh = () => {
    return refresh();
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      <CabOptionsHeader
        cabCount={cabTypes.length}
        isRefreshing={isLoading}
        refreshSuccessful={!error}
        onRefresh={handleRefresh}
      />

      {isLoading ? (
        <CabLoading />
      ) : errorMessage ? (
        <FareUpdateError
          error={new Error(errorMessage)}
          onRetry={handleRefresh}
        />
      ) : cabTypes.length > 0 ? (
        <CabList
          cabTypes={cabTypes}
          selectedCabId={selectedCab?.id || ''}
          onSelectCab={onSelectCab}
          distance={distance}
          tripType={tripType}
          tripMode={tripMode}
          hourlyPackage={hourlyPackage}
          pickupDate={pickupDate}
          returnDate={returnDate || undefined}
          isCalculating={isCalculatingFares}
          handleSelectCab={onSelectCab}
        />
      ) : (
        <EmptyCabList
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
        />
      )}

      {showWarning && (
        <CabRefreshWarning
          message="There was an issue with refreshing the cab data."
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
};
