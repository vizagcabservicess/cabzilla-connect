
import { useState } from 'react';
import { CabType } from '@/lib/cabData';
import { Users, Briefcase, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
}

export function CabOptions({ 
  cabTypes, 
  selectedCab, 
  onSelectCab,
  distance 
}: CabOptionsProps) {
  const [expandedCab, setExpandedCab] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCab(expandedCab === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-cabGray-800">Select a Cab</h3>
      
      <div className="space-y-3">
        {cabTypes.map((cab) => (
          <div 
            key={cab.id}
            className={cn(
              "border rounded-lg overflow-hidden transition-all duration-300",
              selectedCab?.id === cab.id 
                ? "border-cabBlue-500 shadow-sm bg-cabBlue-50" 
                : "border-cabGray-200 hover:border-cabGray-300 bg-white"
            )}
          >
            <div 
              className="p-4 cursor-pointer"
              onClick={() => onSelectCab(cab)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-cabGray-100 rounded-md flex items-center justify-center">
                    {/* Replace with actual image when available */}
                    <span className="text-cabGray-500 text-xs">CAR</span>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg text-cabGray-800">{cab.name}</h4>
                    <p className="text-sm text-cabGray-600">{cab.description}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-semibold text-cabGray-800">
                    ₹{(cab.price + (distance * cab.pricePerKm)).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-cabGray-500">
                    ₹{cab.pricePerKm}/km after {Math.floor(cab.price / cab.pricePerKm)} km
                  </div>
                </div>
              </div>
              
              <div className="flex mt-3 space-x-6 text-sm">
                <div className="flex items-center text-cabGray-600">
                  <Users size={14} className="mr-1.5" />
                  <span>{cab.capacity} persons</span>
                </div>
                <div className="flex items-center text-cabGray-600">
                  <Briefcase size={14} className="mr-1.5" />
                  <span>{cab.luggage} bags</span>
                </div>
              </div>
            </div>
            
            <button
              className={cn(
                "w-full text-cabBlue-600 text-sm py-1.5 text-center border-t border-cabGray-100 hover:bg-cabBlue-50 transition-colors",
                expandedCab === cab.id && "bg-cabBlue-50"
              )}
              onClick={() => toggleExpand(cab.id)}
            >
              {expandedCab === cab.id ? "Show less" : "More details"}
            </button>
            
            {expandedCab === cab.id && (
              <div className="p-4 bg-cabBlue-50 border-t border-cabGray-200 animate-fade-in">
                <h5 className="font-medium text-cabGray-700 mb-2">Cab Features</h5>
                <div className="flex flex-wrap gap-2">
                  {cab.features.map((feature, index) => (
                    <div 
                      key={index}
                      className="bg-white border border-cabGray-200 rounded-full px-3 py-1 text-xs flex items-center"
                    >
                      <Tag size={12} className="mr-1 text-cabBlue-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
