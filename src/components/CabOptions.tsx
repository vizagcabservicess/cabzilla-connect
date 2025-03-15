import { useState, useEffect } from 'react';
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
  const [selectedCabId, setSelectedCabId] = useState<string | null>(selectedCab?.id || null);

  useEffect(() => {
    if (selectedCab) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);

  const toggleExpand = (id: string) => {
    setExpandedCab(expandedCab === id ? null : id);
  };

  const handleSelectCab = (cab: CabType) => {
    setSelectedCabId(cab.id);
    onSelectCab(cab);
    
    sessionStorage.setItem('selectedCab', JSON.stringify(cab));
    
    const bookingSummary = document.getElementById('booking-summary');
    if (bookingSummary) {
      setTimeout(() => {
        bookingSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const calculateCabFare = (cab: CabType): number => {
    let totalFare = 0;
    
    if (tripType === 'airport') {
      totalFare = calculateAirportFare(cab.name, distance);
    }
    else if (tripType === 'local' && hourlyPackage) {
      totalFare = getLocalPackagePrice(hourlyPackage, cab.name);
      
      const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 100;
      if (distance > packageKm) {
        const extraKm = distance - packageKm;
        totalFare += extraKm * cab.pricePerKm;
      }
    }
    else if (tripType === 'outstation') {
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
        default:
          baseRate = cab.price;
          perKmRate = cab.pricePerKm;
          nightHaltCharge = 1000;
      }
      
      if (tripMode === "one-way") {
        const effectiveDistance = distance * 2;
        const minKm = 300 * 2;
        
        let totalBaseFare = baseRate;
        let totalDistanceFare = Math.max(effectiveDistance - minKm, 0) * 13;
        
        totalFare = totalBaseFare + totalDistanceFare + 250;
      } else {
        let days = returnDate ? Math.max(1, differenceInDays(returnDate, pickupDate || new Date()) + 1) : 1;
        let minKm = days * 300;
        
        let effectiveDistance = distance * 2;
        
        let totalBaseFare = days * baseRate;
        let totalDistanceFare = Math.max(effectiveDistance - minKm, 0) * perKmRate;
        let totalNightHalt = (days - 1) * nightHaltCharge;
        
        totalFare = totalBaseFare + totalDistanceFare + totalNightHalt + (days * 250);
      }
    }
    
    return Math.ceil(totalFare / 10) * 10;
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Select a cab type</h3>
        <div className="text-xs text-gray-500">{cabTypes.length} cab types available</div>
      </div>
      
      <div className="space-y-3">
        {cabTypes.slice(0, 3).map((cab) => {
          const fare = calculateCabFare(cab);
          const isSelected = selectedCabId === cab.id;
          
          let fareDetails = "";
          if (tripType === 'airport') {
            fareDetails = "Airport transfer";
          } else if (tripType === 'local' && hourlyPackage) {
            const packageInfo = hourlyPackage === '8hrs-80km' ? '8 hrs / 80 km' : '10 hrs / 100 km';
            fareDetails = packageInfo;
          } else if (tripType === 'outstation') {
            fareDetails = tripMode === 'one-way' 
              ? `One way - double distance fare` 
              : `Round trip - ${distance * 2}km total`;
          }

          return (
            <div 
              key={cab.id}
              className={cn(
                "border rounded-lg overflow-hidden transition-all duration-300",
                isSelected 
                  ? "border-blue-500 shadow-md bg-blue-50 transform scale-[1.02]" 
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
            >
              <div 
                className="p-4 cursor-pointer relative"
                onClick={() => handleSelectCab(cab)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                    <Check size={16} />
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-12 h-12 rounded-md flex items-center justify-center",
                      isSelected ? "bg-blue-100" : "bg-gray-100"
                    )}>
                      <span className={isSelected ? "text-blue-500 text-xs" : "text-gray-500 text-xs"}>
                        {cab.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-gray-800">{cab.name}</h4>
                      <p className="text-xs text-gray-500">{cab.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className={cn(
                      "text-lg font-bold",
                      isSelected ? "text-blue-600" : "text-gray-800"
                    )}>
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
