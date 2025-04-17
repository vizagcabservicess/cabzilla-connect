
import React, { useState, useEffect, useRef } from 'react';
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
  const [fareRequestId, setFareRequestId] = useState<number>(0);
  const { fare, isFetching, error, hourlyPackage, fetchFare, changePackage, clearFare } = useLocalPackageFare();
  const queryClient = useQueryClient();
  const pendingFetchRef = useRef<boolean>(false);

  // When cab selection changes, fetch new fare
  useEffect(() => {
    if (selectedCab && currentCabId !== selectedCab.id) {
      console.log(`Selection state transition: ${selectionState} -> selecting (cab changed to ${selectedCab.name})`);
      setSelectionState('selecting');
      setCurrentFare(0);
      setCurrentCabId(selectedCab.id);
      clearFare();
      
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
            toast.error(`Could not retrieve price for ${selectedCab.name}`);
          }
        });
    }
  }, [selectedCab, currentCabId, hourlyPackage, clearFare, fetchFare, fareRequestId]);

  // Update current fare when the fare from the hook changes
  useEffect(() => {
    if (fare > 0 && selectedCab) {
      console.log(`LocalPackagesTemplate: Received fare update from hook: ${fare} for ${selectedCab.id}`);
      setCurrentFare(fare);
      setSelectionState('ready');
    }
  }, [fare, selectedCab]);

  // Handle user selecting a cab
  const handleSelectCab = (cab: CabType) => {
    console.log(`User selected cab: ${cab.name}`);
    clearFare();
    setCurrentFare(0);
    
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
        .catch(() => {
          if (fareRequestId === newRequestId) {
            setSelectionState('error');
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
        .catch(() => {
          if (fareRequestId === newRequestId) {
            setSelectionState('error');
          }
        });
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ['localPackageFare'] });
    };
  }, [queryClient]);

  // Listen for global fare updates
  useEffect(() => {
    const handleFareUpdate = (event: any) => {
      const detail = event.detail;
      if (detail && selectedCab && normalizeVehicleId(selectedCab.id) === detail.cabId) {
        console.log(`LocalPackagesTemplate: Received fare update for ${selectedCab.id}: ${detail.fare}`);
        
        // Only update if we're not in the middle of our own fetch
        if (selectionState !== 'fetching') {
          setCurrentFare(detail.fare);
          setSelectionState('ready');
          
          // Update the selected cab with the new fare
          setSelectedCab(prev => {
            if (!prev) return null;
            return { ...prev, price: detail.fare };
          });
        }
      }
    };
    
    window.addEventListener('fare-updated', handleFareUpdate);
    
    return () => {
      window.removeEventListener('fare-updated', handleFareUpdate);
    };
  }, [selectedCab, selectionState]);

  // Helper function to normalize vehicle IDs
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/\s+/g, '_');
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
          isCalculatingFares={selectionState === 'fetching' || selectionState === 'selecting'}
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
