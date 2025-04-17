
import React from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string;
  handleSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
  isCalculating: boolean;
  cabFares?: Record<string, number>;
  cabErrors?: Record<string, string>;
  getFareDetails?: (cab: CabType) => string;
}

export const CabListTemplate: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  handleSelectCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate,
  isCalculating,
  cabFares = {},
  cabErrors = {},
  getFareDetails = () => ''
}) => {
  return (
    <div className="space-y-4">
      {cabTypes.map((cab) => {
        const isSelected = cab.id === selectedCabId;
        const fare = cabFares[cab.id] || cab.price || 0;
        const hasError = cabErrors[cab.id];
        
        return (
          <div
            key={cab.id}
            onClick={() => handleSelectCab(cab)}
            className={`relative overflow-hidden bg-white p-4 rounded-lg border transition-all ${
              isSelected
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-blue-300'
            } cursor-pointer`}
          >
            {isSelected && (
              <div className="absolute top-0 left-0 w-0 h-0 border-t-[25px] border-l-[25px] border-t-blue-500 border-l-transparent border-r-transparent z-10"></div>
            )}
            
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-4">
                {cab.image ? (
                  <img
                    src={cab.image}
                    alt={cab.name}
                    className="w-24 h-16 object-contain"
                  />
                ) : (
                  <div className="w-24 h-16 bg-gray-200 flex items-center justify-center rounded">
                    <span className="text-gray-500 text-sm">No Image</span>
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <h3 className="font-medium text-lg">{cab.name}</h3>
                <div className="flex flex-wrap items-center text-sm text-gray-600 mt-1">
                  <span className="mr-4">{cab.capacity} Persons</span>
                  <span>{cab.luggageCapacity} Bags</span>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4 text-right">
                <div className="text-lg font-semibold">
                  {isCalculating && isSelected ? (
                    <span className="text-blue-500">Calculating...</span>
                  ) : hasError ? (
                    <span className="text-red-500 text-sm">{cabErrors[cab.id]}</span>
                  ) : (
                    formatPrice(fare)
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getFareDetails(cab)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
