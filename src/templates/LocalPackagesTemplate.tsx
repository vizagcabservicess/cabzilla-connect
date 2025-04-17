import React, { useState, useEffect } from 'react';
import { CabOptions } from '@/components/CabOptions';
import { BookingSummary } from '@/components/cab-options/BookingSummary';
import { useLocalPackageFare } from '@/hooks/useLocalPackageFare';
import { CabType } from '@/types/cab';
import { Location } from '@/lib/locationData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  const { fare, isFetching, error, hourlyPackage, fetchFare, changePackage, clearFare } = useLocalPackageFare();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedCab && currentCabId !== selectedCab.id) {
      console.log(`Selection state transition: ${selectionState} -> selecting (cab changed to ${selectedCab.name})`);
      setSelectionState('selecting');
      setCurrentFare(0);
      setCurrentCabId(selectedCab.id);
      clearFare();
      setSelectionState('fetching');
      fetchFare(selectedCab.id, hourlyPackage, true)
        .then(newFare => {
          if (currentCabId === selectedCab.id) {
            console.log(`Selection state transition: fetching -> ready (fare: ${newFare})`);
            setCurrentFare(newFare);
            setSelectionState('ready');
            setSelectedCab(prev => {
              if (!prev) return null;
              return { ...prev, price: newFare };
            });
          } else {
            console.log(`Fare response received for ${selectedCab.id} but current cab is now ${currentCabId}, ignoring`);
          }
        })
        .catch(err => {
          if (currentCabId === selectedCab.id) {
            console.log(`Selection state transition: fetching -> error`);
            setSelectionState('error');
            toast.error(`Could not retrieve price for ${selectedCab.name}`);
          }
        });
    }
  }, [selectedCab, currentCabId, hourlyPackage, clearFare, fetchFare]);

  const handleSelectCab = (cab: CabType) => {
    console.log(`User selected cab: ${cab.name}`);
    clearFare();
    setCurrentFare(0);
    setSelectedCab(prevCab => {
      if (prevCab?.id === cab.id) {
        setSelectionState('selecting');
        setTimeout(() => {
          fetchFare(cab.id, hourlyPackage, true)
            .then(newFare => {
              if (currentCabId === cab.id) {
                setCurrentFare(newFare);
                setSelectionState('ready');
              }
            })
            .catch(() => {
              if (currentCabId === cab.id) {
                setSelectionState('error');
              }
            });
        }, 0);
        return prevCab;
      }
      return cab;
    });
  };

  const handlePackageChange = (packageId: string) => {
    console.log(`User changed package to: ${packageId}`);
    clearFare();
    setCurrentFare(0);
    setSelectionState('selecting');
    changePackage(packageId);
    if (selectedCab) {
      setSelectionState('fetching');
      fetchFare(selectedCab.id, packageId, true)
        .then(newFare => {
          if (currentCabId === selectedCab.id) {
            setCurrentFare(newFare);
            setSelectionState('ready');
            setSelectedCab(prev => {
              if (!prev) return null;
              return { ...prev, price: newFare };
            });
          }
        })
        .catch(() => {
          if (currentCabId === selectedCab.id) {
            setSelectionState('error');
          }
        });
    }
  };

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
        {selectedCab && (
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
        )}
        
        {error && selectionState === 'error' && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
