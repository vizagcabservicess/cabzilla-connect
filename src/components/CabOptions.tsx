
import { useState } from 'react';
import { CabType, formatPrice, TripType, TripMode } from '@/lib/cabData';
import { Users, Briefcase, Tag, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

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
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType = 'outstation',
  tripMode = 'one-way',
  pickupDate,
  returnDate,
  hourlyPackage
}: CabOptionsProps) {
  const [expandedCab, setExpandedCab] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCab(expandedCab === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Select a cab type</h3>
        <div className="text-xs text-gray-500">{cabTypes.length} cab types available</div>
      </div>
      
      <div className="space-y-3">
        {cabTypes.map((cab) => {
          let baseRate = 0, perKmRate = 0, nightHaltCharge = 0;
          switch (cab.name.toLowerCase()) {
            case "sedan":
              baseRate = 4200;
              perKmRate = 14;
              nightHaltCharge = 700;
              break;
            case "ertiga":
              baseRate = 5400;
              perKmRate = 18;
              nightHaltCharge = 1000;
              break;
            case "innova crysta":
              baseRate = 6000;
              perKmRate = 20;
              nightHaltCharge = 1000;
              break;
          }
          
          let days = returnDate ? Math.max(1, differenceInDays(returnDate, pickupDate) + 1) : 1;
          let minKm = days * 300;
          let effectiveDistance = tripMode === "one-way" ? distance * 2 : distance;
          let totalBaseFare = days * baseRate;
          let totalDistanceFare = Math.max(effectiveDistance - minKm, 0) * perKmRate;
          let totalNightHalt = tripMode === "round-trip" ? (days - 1) * nightHaltCharge : 0;
          let totalFare = totalBaseFare + totalDistanceFare + totalNightHalt;

          return (
            <div 
              key={cab.id}
              className={cn(
                "border rounded-lg overflow-hidden transition-all duration-300",
                selectedCab?.id === cab.id 
                  ? "border-blue-500 shadow-sm bg-blue-50" 
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => onSelectCab(cab)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-gray-500 text-xs">{cab.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-gray-800">{cab.name}</h4>
                      <p className="text-xs text-gray-500">{cab.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-lg font-bold text-blue-600">
                      {formatPrice(totalFare)}
                    </div>
                    {tripType === 'outstation' && (
                      <div className="text-xs text-blue-600">
                        {tripMode === 'one-way' 
                          ? `₹${baseRate} for 300km, then ₹${perKmRate}/km` 
                          : `₹${baseRate}/day + ₹${perKmRate}/km`}
                      </div>
                    )}
                    <div className="flex items-center text-xs text-gray-400">
                      <span className="text-green-600 mr-1 text-[10px]">✓</span>
                      Includes taxes & fees (Tolls & Permits Extra)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
