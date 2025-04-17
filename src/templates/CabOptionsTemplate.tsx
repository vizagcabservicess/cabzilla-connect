import React from 'react';
import { CabType } from '@/types/cab';

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
  isCalculatingFares?: boolean;
  onPackageChange?: (packageId: string) => void;
}

export const CabOptionsTemplate: React.FC<CabOptionsProps> = ({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate,
  isCalculatingFares = false,
  onPackageChange
}) => {
  const handleCabSelect = (cab: CabType) => {
    onSelectCab(cab);
  };

  const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onPackageChange) {
      onPackageChange(e.target.value);
    }
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow-md">
      <h2 className="text-xl font-bold mb-4">Select a Cab</h2>
      
      {tripType === 'local' && onPackageChange && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
          <select 
            value={hourlyPackage} 
            onChange={handlePackageChange} 
            className="w-full border border-gray-300 rounded-md p-2"
            disabled={isCalculatingFares}
          >
            <option value="4hrs-40km">4 Hours / 40 KM</option>
            <option value="8hrs-80km">8 Hours / 80 KM</option>
            <option value="10hrs-100km">10 Hours / 100 KM</option>
          </select>
        </div>
      )}
      
      <div className="space-y-4">
        {cabTypes.map(cab => (
          <div 
            key={cab.id}
            className={`p-3 border rounded-md cursor-pointer ${
              selectedCab?.id === cab.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => handleCabSelect(cab)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{cab.name}</h3>
                <p className="text-sm text-gray-500">
                  {cab.capacity} persons • {cab.luggageCapacity} bags
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${isCalculatingFares && selectedCab?.id === cab.id ? 'animate-pulse' : ''}`}>
                  {isCalculatingFares && selectedCab?.id === cab.id 
                    ? 'Calculating...' 
                    : `₹${cab.price || 'N/A'}`}
                </p>
                <p className="text-xs text-gray-500">
                  {tripType === 'local' ? hourlyPackage?.replace(/-/g, ' ').toUpperCase() : 'Base price'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CabOptionsTemplate;
