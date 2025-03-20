
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { CabOptionCard } from './CabOptionCard';
import { useCabOptions } from './cab-options/useCabOptions';
import { CabLoading } from './cab-options/CabLoading';
import { CabOptionsHeader } from './cab-options/CabOptionsHeader';
import { CabRefreshWarning } from './cab-options/CabRefreshWarning';
import { EmptyCabList } from './cab-options/EmptyCabList';
import { CabList } from './cab-options/CabList';

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
  const {
    cabTypes,
    selectedCabId,
    cabFares,
    isLoadingCabs,
    isRefreshingCabs,
    isCalculatingFares,
    refreshSuccessful,
    refreshCabTypes,
    handleSelectCab,
    getFareDetails
  } = useCabOptions({
    initialCabTypes,
    selectedCab,
    onSelectCab,
    distance,
    tripType,
    tripMode,
    pickupDate,
    returnDate,
    hourlyPackage
  });

  if (isLoadingCabs) {
    return <CabLoading />;
  }

  return (
    <div className="space-y-4 mt-6">
      <CabOptionsHeader 
        cabCount={cabTypes.length}
        isRefreshing={isRefreshingCabs}
        refreshSuccessful={refreshSuccessful}
        onRefresh={refreshCabTypes}
      />
      
      {refreshSuccessful === false && <CabRefreshWarning />}
      
      {cabTypes.length === 0 ? (
        <EmptyCabList 
          onRefresh={refreshCabTypes}
          isRefreshing={isRefreshingCabs}
        />
      ) : (
        <CabList
          cabTypes={cabTypes}
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
