
import { useState, useEffect, useCallback } from 'react';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { toast } from 'sonner';
import { useCabTypes } from '@/hooks/useCabTypes';
import { useFareCalculation } from '@/hooks/useFareCalculation';
import { LoadingState } from './cab-options/LoadingState';
import { CabOptionsHeader } from './cab-options/CabOptionsHeader';
import { RefreshWarning } from './cab-options/RefreshWarning';
import { CabOptionsContent } from './cab-options/CabOptionsContent';

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
  
  // Custom hooks for data management
  const { 
    cabTypes, 
    isLoadingCabs, 
    isRefreshingCabs, 
    refreshSuccessful, 
    refreshCabTypes 
  } = useCabTypes(initialCabTypes);
  
  const { 
    cabFares, 
    isCalculatingFares, 
    getFareDetails, 
    currentCalculationParams 
  } = useFareCalculation(
    cabTypes, 
    distance, 
    tripType, 
    tripMode, 
    hourlyPackage, 
    pickupDate, 
    returnDate
  );
  
  // Reset selections when trip parameters change
  useEffect(() => {
    // This ensures we maintain the state properly when params change
    if (selectedCab && selectedCab.id) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);
  
  // Handle refreshing cabs on trip parameter changes
  const handleRefreshCabs = useCallback(async () => {
    const updatedCabs = await refreshCabTypes();
    
    // Reset selection when refreshing
    setSelectedCabId(null);
    if (selectedCab) {
      onSelectCab(null as any);
    }
    
    return updatedCabs;
  }, [refreshCabTypes, selectedCab, onSelectCab]);
  
  // Monitor trip parameter changes to reset selection
  useEffect(() => {
    // Only reset if we have a valid previous calculation
    const resetSelections = async () => {
      console.log('Trip parameters changed, resetting selections');
      setSelectedCabId(null);
      
      if (selectedCab) {
        onSelectCab(null as any);
      }
      
      await handleRefreshCabs();
    };
    
    // This will run on mount and when trip params change
    if (currentCalculationParams) {
      resetSelections().catch(err => {
        console.error('Failed to reset selections on trip parameter change:', err);
      });
    }
  }, [currentCalculationParams, handleRefreshCabs, onSelectCab, selectedCab]);

  const handleSelectCab = (cab: CabType) => {
    setSelectedCabId(cab.id);
    onSelectCab(cab);
    
    const cabData = {
      cab: cab,
      tripType: tripType,
      tripMode: tripMode,
      hourlyPackage: hourlyPackage,
      fare: cabFares[cab.id]
    };
    
    sessionStorage.setItem('selectedCab', JSON.stringify(cabData));
    
    const bookingSummary = document.getElementById('booking-summary');
    if (bookingSummary) {
      setTimeout(() => {
        bookingSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  if (isLoadingCabs) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4 mt-6">
      <CabOptionsHeader 
        cabCount={cabTypes.length}
        isRefreshing={isRefreshingCabs}
        refreshFailed={refreshSuccessful === false}
        onRefresh={handleRefreshCabs}
      />
      
      {refreshSuccessful === false && <RefreshWarning />}
      
      <CabOptionsContent 
        cabTypes={cabTypes}
        cabFares={cabFares}
        selectedCabId={selectedCabId}
        isCalculatingFares={isCalculatingFares}
        isRefreshingCabs={isRefreshingCabs}
        fareDetails={getFareDetails()}
        onSelectCab={handleSelectCab}
        onRefresh={handleRefreshCabs}
      />
    </div>
  );
}
