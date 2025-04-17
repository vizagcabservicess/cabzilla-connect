
import React, { useState, useEffect, useRef } from 'react';
import { CabOptions } from '@/components/CabOptions';
import { BookingSummary } from '@/components/cab-options/BookingSummary';
import { useLocalPackageFare } from '@/hooks/useLocalPackageFare';
import { CabType } from '@/types/cab';
import { Location } from '@/lib/locationData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FareUpdateError } from '@/components/cab-options/FareUpdateError';

interface LocalPackagesTemplateProps {
  cabTypes: CabType[];
  pickupLocation: Location | null;
  pickupDate: Date;
  distance: number;
}

type SelectionState = 'initial' | 'selecting' | 'fetching' | 'ready' | 'error';

export const LocalPackagesTemplate: React.FC<LocalPackagesTemplateProps> = ({
  cabTypes,
  pickupLocation,
  pickupDate,
  distance
}) => {
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>('initial');
  const [currentFare, setCurrentFare] = useState<number>(0);
  const [currentCabId, setCurrentCabId] = useState<string | null>(null);
  const [fareRequestId, setFareRequestId] = useState<number>(0);
  const [errorDetails, setErrorDetails] = useState<Error | null>(null);
  const { fare, isFetching, error, hourlyPackage, fetchFare, changePackage, clearFare } = useLocalPackageFare();
  const queryClient = useQueryClient();
  
  // Normalize vehicle ID to ensure consistency
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  };

  // When cab selection changes, fetch new fare
  useEffect(() => {
    if (!selectedCab) return;
    
    const normalizedSelectedCabId = normalizeVehicleId(selectedCab.id);
    
    if (currentCabId !== normalizedSelectedCabId) {
      console.log(`Selection state transition: ${selectionState} -> selecting (cab changed to ${selectedCab.name})`);
      setSelectionState('selecting');
      setCurrentFare(0);
      setCurrentCabId(normalizedSelectedCabId);
      clearFare(); // This will purge all cached fares
      
      // Set state to fetching and initiate the fare fetch
      setSelectionState('fetching');
      const newRequestId = Date.now();
      setFareRequestId(newRequestId);
      
      fetchFare(selectedCab.id, hourlyPackage, true)
        .then(newFare => {
          // Only update if this is still the current request
          if (fareRequestId === newRequestId) {
            console.log(`Selection state transition: fetching -> ready (fare: ${newFare})`);
            setCurrentFare(newFare);
            setSelectionState('ready');
            setErrorDetails(null);
            
            // Update the selected cab with the new fare
            setSelectedCab(prev => {
              if (!prev) return null;
              return { ...prev, price: newFare };
            });
          } else {
            console.log(`Fare response received for ${selectedCab.id} but request ID has changed, ignoring`);
          }
        })
        .catch(err => {
          // Only update error state if this is still the current request
          if (fareRequestId === newRequestId) {
            console.log(`Selection state transition: fetching -> error`);
            setSelectionState('error');
            setErrorDetails(err instanceof Error ? err : new Error('Failed to retrieve fare'));
            toast.error(`Could not retrieve price for ${selectedCab.name}`);
          }
        });
    }
  }, [selectedCab, currentCabId, hourlyPackage, clearFare, fetchFare, fareRequestId, selectionState]);

  // Handle user selecting a cab
  const handleSelectCab = (cab: CabType) => {
    console.log(`User selected cab: ${cab.name} (${normalizeVehicleId(cab.id)})`);
    clearFare();
    setCurrentFare(0);
    setErrorDetails(null);
    
    // If selecting the same cab, re-fetch the fare with force refresh
    if (selectedCab?.id === cab.id) {
      setSelectionState('selecting');
      const newRequestId = Date.now();
      setFareRequestId(newRequestId);
      
      fetchFare(cab.id, hourlyPackage, true)
        .then(newFare => {
          if (fareRequestId === newRequestId) {
            setCurrentFare(newFare);
            setSelectionState('ready');
            setSelectedCab(prev => {
              if (!prev) return null;
              return { ...prev, price: newFare };
            });
          }
        })
        .catch((err) => {
          if (fareRequestId === newRequestId) {
            setSelectionState('error');
            setErrorDetails(err instanceof Error ? err : new Error('Failed to retrieve fare'));
          }
        });
    } else {
      // Set the new selected cab (this will trigger the useEffect for fare fetching)
      setSelectedCab(cab);
    }
  };

  // Handle package change
  const handlePackageChange = (packageId: string) => {
    console.log(`User changed package to: ${packageId}`);
    clearFare();
    setCurrentFare(0);
    setSelectionState('selecting');
    setErrorDetails(null);
    changePackage(packageId);
    
    if (selectedCab) {
      setSelectionState('fetching');
      const newRequestId = Date.now();
      setFareRequestId(newRequestId);
      
      fetchFare(selectedCab.id, packageId, true)
        .then(newFare => {
          if (fareRequestId === newRequestId) {
            setCurrentFare(newFare);
            setSelectionState('ready');
            setSelectedCab(prev => {
              if (!prev) return null;
              return { ...prev, price: newFare };
            });
          }
        })
        .catch((err) => {
          if (fareRequestId === newRequestId) {
            setSelectionState('error');
            setErrorDetails(err instanceof Error ? err : new Error('Failed to retrieve fare'));
          }
        });
    }
  };

  // Retry handler for error state
  const handleRetryFetch = () => {
    if (!selectedCab) return;
    
    setSelectionState('fetching');
    setErrorDetails(null);
    const newRequestId = Date.now();
    setFareRequestId(newRequestId);
    
    fetchFare(selectedCab.id, hourlyPackage, true)
      .then(newFare => {
        if (fareRequestId === newRequestId) {
          setCurrentFare(newFare);
          setSelectionState('ready');
          setSelectedCab(prev => {
            if (!prev) return null;
            return { ...prev, price: newFare };
          });
        }
      })
      .catch((err) => {
        if (fareRequestId === newRequestId) {
          setSelectionState('error');
          setErrorDetails(err instanceof Error ? err : new Error('Failed to retrieve fare'));
        }
      });
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ['localPackageFare'] });
    };
  }, [queryClient]);

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
          isCalculatingFares={selectionState === 'fetching'}
          onPackageChange={handlePackageChange}
        />
      </div>
      
      <div className="lg:col-span-1">
        {errorDetails && selectionState === 'error' ? (
          <FareUpdateError 
            error={errorDetails}
            onRetry={handleRetryFetch}
            cabId={selectedCab?.id}
          />
        ) : (
          selectedCab && (
            <BookingSummary
              selectedCab={selectedCab}
              pickupLocation={pickupLocation?.name || ''}
              pickupDate={pickupDate}
              tripType="local"
              distance={distance}
              hourlyPackage={hourlyPackage}
              isCalculatingFares={selectionState === 'fetching' || selectionState === 'selecting'}
              fare={currentFare}
            />
          )
        )}
      </div>
    </div>
  );
};
