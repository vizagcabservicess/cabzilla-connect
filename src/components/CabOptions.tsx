
import { useState } from 'react';
import { CabType, formatPrice, TripType, TripMode, getLocalPackagePrice } from '@/lib/cabData';
import { Users, Briefcase, Tag, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { calculateAirportFare } from '@/lib/locationData';

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

  const calculateCabFare = (cab: CabType): number => {
    let totalFare = 0;
    
    if (tripType === 'airport') {
      // Use airport fare calculation based on distance tiers
      totalFare = calculateAirportFare(cab.name, distance);
    }
    else if (tripType === 'local' && hourlyPackage) {
      // Use local package pricing with updated structure
      totalFare = getLocalPackagePrice(hourlyPackage, cab.name);
      
      // Add extra km charges if applicable (based on selected package)
      const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 100;
      if (distance > packageKm) {
        const extraKm = distance - packageKm;
        totalFare += extraKm * cab.pricePerKm;
      }
    }
    else if (tripType === 'outstation') {
      // Calculate outstation pricing
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
      
      let days = returnDate ? Math.max(1, differenceInDays(returnDate, pickupDate || new Date()) + 1) : 1;
      let minKm = days * 300;
      let effectiveDistance = tripMode === "one-way" ? distance : distance;
      let totalBaseFare = days * baseRate;
      let totalDistanceFare = Math.max(effectiveDistance - minKm, 0) * perKmRate;
      let totalNightHalt = tripMode === "round-trip" ? (days - 1) * nightHaltCharge : 0;
      
      totalFare = totalBaseFare + totalDistanceFare + totalNightHalt;
    }
    
    return Math.ceil(totalFare / 10) * 10; // Round to nearest 10
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Select a cab type</h3>
        <div className="text-xs text-gray-500">{cabTypes.length} cab types available</div>
      </div>
      
      <div className="space-y-3">
        {cabTypes.slice(0, 3).map((cab) => { // Only show first 3 cab types
          const fare = calculateCabFare(cab);
          
          let fareDetails = "";
          if (tripType === 'airport') {
            fareDetails = "Airport transfer";
          } else if (tripType === 'local' && hourlyPackage) {
            const packageInfo = hourlyPackage === '8hrs-80km' ? '8 hrs / 80 km' : '10 hrs / 100 km';
            fareDetails = packageInfo;
          } else if (tripType === 'outstation') {
            fareDetails = tripMode === 'one-way' 
              ? `One way - 300km included` 
              : `Round trip - 300km/day`;
          }

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
                      {formatPrice(fare)}
                    </div>
                    <div className="text-xs text-blue-600">
                      {fareDetails}
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <span className="text-green-600 mr-1 text-[10px]">✓</span>
                      Includes taxes & fees (Tolls & Permits Extra)
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                    <Users size={12} className="mr-1" />
                    {cab.capacity} persons
                  </div>
                  <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                    <Briefcase size={12} className="mr-1" />
                    {cab.luggage} bags
                  </div>
                  {cab.ac && (
                    <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                      <Check size={12} className="mr-1" />
                      AC
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
