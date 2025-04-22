import React from 'react';
import { useFare } from '@/hooks/useFare';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import { TripType } from '@/lib/tripTypes';
import { normalizeVehicleId } from '@/utils/safeStringUtils';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  tripType: TripType;
  distance: number;
  packageType?: string;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  isCalculatingFares,
  handleSelectCab,
  tripType,
  distance,
  packageType = '8hrs-80km'
}) => {
  return (
    <div className="space-y-3">
      {isCalculatingFares && (
        <div className="bg-blue-50 p-3 rounded-md flex items-center justify-center mb-3">
          <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-600 text-sm">Calculating fares...</span>
        </div>
      )}

      {(!cabTypes || cabTypes.length === 0) ? (
        <div className="bg-amber-50 p-4 rounded-md text-amber-800 text-center">
          <p className="font-medium">No cab options available</p>
          <p className="text-sm mt-1">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      ) : (
        cabTypes.map((cab) => {
          const { fareData, isLoading, error } = useFare(
            normalizeVehicleId(cab.id),
            tripType,
            distance,
            packageType
          );

          return (
            <div key={cab.id}>
              <CabOptionCard 
                cab={cab}
                fare={fareData?.totalPrice || 0}
                isSelected={selectedCabId === cab.id}
                onSelect={() => handleSelectCab(cab)}
                isCalculating={isLoading}
                fareDetails={error ? "Error fetching fare" : undefined}
              />
            </div>
          );
        })
      )}
    </div>
  );
};