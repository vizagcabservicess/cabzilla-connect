
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { CabOptionCard } from './CabOptionCard';
import { useCabOptions } from './cab-options/useCabOptions';
import { CabLoading } from './cab-options/CabLoading';
import { CabOptionsHeader } from './cab-options/CabOptionsHeader';
import { CabRefreshWarning } from './cab-options/CabRefreshWarning';
import { EmptyCabList } from './cab-options/EmptyCabList';
import { CabList } from './cab-options/CabList';
import { useState, useEffect } from 'react';
import { calculateFare } from '@/lib/fareCalculationService';

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType?: TripType;
  tripMode?: TripMode;
  pickupDate?: Date;
  returnDate?: Date;
  hourlyPackage?: string;
}

export function CabOptions({
  cabTypes: initialCabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType = 'outstation',
  tripMode = 'one-way',
  pickupDate,
  returnDate,
  hourlyPackage
}: CabOptionsProps) {
  const [selectedCabId, setSelectedCabId] = useState<string | null>(selectedCab?.id || null);
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);
  const [refreshSuccessful, setRefreshSuccessful] = useState<boolean | null>(null);
  const [isRefreshingCabs, setIsRefreshingCabs] = useState(false);

  // Use the hook to fetch cab options
  const { 
    cabOptions, 
    isLoading: isLoadingCabs, 
    error, 
    filterLoading,
    refresh: refreshCabOptions 
  } = useCabOptions({ 
    tripType, 
    tripMode, 
    distance 
  });

  // Function to refresh cab types
  const refreshCabTypes = async () => {
    setIsRefreshingCabs(true);
    try {
      await refreshCabOptions();
      setRefreshSuccessful(true);
    } catch (error) {
      console.error("Failed to refresh cab types:", error);
      setRefreshSuccessful(false);
    } finally {
      setIsRefreshingCabs(false);
    }
  };

  // Initial calculation of fares when cab options or distance changes
  useEffect(() => {
    const calculateFares = async () => {
      if (cabOptions.length > 0 && distance > 0) {
        setIsCalculatingFares(true);
        const fares: Record<string, number> = {};
        
        for (const cab of cabOptions) {
          try {
            const fare = await calculateFare({
              cabType: cab,
              distance,
              tripType,
              tripMode,
              hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
              pickupDate,
              returnDate
            });
            fares[cab.id] = fare;
          } catch (error) {
            console.error(`Error calculating fare for ${cab.name}:`, error);
            fares[cab.id] = 0;
          }
        }
        
        setCabFares(fares);
      }
      setIsCalculatingFares(false);
    };
    
    calculateFares();
  }, [cabOptions, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  // Update selected cab ID when selectedCab changes from outside
  useEffect(() => {
    if (selectedCab) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);

  // Handle selecting a cab
  const handleSelectCab = (cab: CabType) => {
    setSelectedCabId(cab.id);
    onSelectCab(cab);
  };

  // Function to get fare details for a cab
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return `${hourlyPackage} package`;
    }
    if (tripType === 'outstation') {
      return tripMode === 'one-way' ? 'One way trip' : 'Round trip';
    }
    return '';
  };

  if (isLoadingCabs) {
    return <CabLoading />;
  }

  return (
    <div className="space-y-4 mt-6">
      <CabOptionsHeader 
        cabCount={cabOptions.length}
        isRefreshing={isRefreshingCabs}
        refreshSuccessful={refreshSuccessful}
        onRefresh={refreshCabTypes}
      />
      
      {refreshSuccessful === false && <CabRefreshWarning />}
      
      {cabOptions.length === 0 ? (
        <EmptyCabList 
          onRefresh={refreshCabTypes}
          isRefreshing={isRefreshingCabs}
        />
      ) : (
        <CabList
          cabTypes={cabOptions}
          selectedCabId={selectedCabId}
          cabFares={cabFares}
          isCalculatingFares={isCalculatingFares}
          handleSelectCab={handleSelectCab}
          getFareDetails={getFareDetails}
        />
      )}
    </div>
  );
}
