
import { useState } from 'react';
import { CabType, formatPrice } from '@/lib/cabData';
import { Users, Briefcase, Tag, Info, Check } from 'lucide-react';
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Select a cab type
        </h3>
        <div className="text-xs text-gray-500">
          {cabTypes.length} cab types available
        </div>
      </div>
      
      <div className="space-y-3">
        {cabTypes.map((cab) => (
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
                    {/* Replace with actual image when available */}
                    <span className="text-gray-500 text-xs">{cab.name.charAt(0)}</span>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-base text-gray-800">{cab.name}</h4>
                    <p className="text-xs text-gray-500">{cab.description}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="text-lg font-bold text-blue-600">
                    {formatPrice(cab.price + (distance * cab.pricePerKm))}
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <span className="text-green-600 mr-1 text-[10px]">✓</span>
                    Includes taxes & fees
                  </div>
                </div>
              </div>
              
              <div className="flex mt-1 space-x-4 text-xs border-t pt-2 border-gray-100">
                <div className="flex items-center text-gray-600">
                  <Users size={12} className="mr-1" />
                  <span>{cab.capacity} seater</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Briefcase size={12} className="mr-1" />
                  <span>{cab.luggage} bags</span>
                </div>
                
                {cab.ac && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-1 text-[10px]">✓</span>
                    <span>AC</span>
                  </div>
                )}
                
                <div className="flex items-center text-gray-600">
                  <span className="mr-1 text-[10px]">✓</span>
                  <span>Free cancellation</span>
                </div>
              </div>
            </div>
            
            <button
              className={cn(
                "w-full text-blue-500 text-xs py-1.5 text-center border-t border-gray-100 hover:bg-blue-50 transition-colors",
                expandedCab === cab.id && "bg-blue-50"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(cab.id);
              }}
            >
              <div className="flex items-center justify-center">
                <Info size={12} className="mr-1" />
                {expandedCab === cab.id ? "Hide details" : "More details"}
              </div>
            </button>
            
            {expandedCab === cab.id && (
              <div className="p-3 bg-blue-50 border-t border-gray-200 animate-fade-in">
                <h5 className="font-medium text-gray-700 text-xs mb-2">Amenities & Features</h5>
                <div className="flex flex-wrap gap-2">
                  {cab.features.map((feature, index) => (
                    <div 
                      key={index}
                      className="bg-white border border-gray-200 rounded-full px-3 py-1 text-xs flex items-center"
                    >
                      <Check size={10} className="mr-1 text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <h5 className="font-medium text-gray-700 text-xs mb-1">Pricing breakdown</h5>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Base fare</span>
                      <span>{formatPrice(cab.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance fare ({distance} km @ {formatPrice(cab.pricePerKm)}/km)</span>
                      <span>{formatPrice(distance * cab.pricePerKm)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-1 border-t border-gray-200 mt-1">
                      <span>Total fare</span>
                      <span className="text-blue-600">{formatPrice(cab.price + (distance * cab.pricePerKm))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4">
        <div className="flex items-start">
          <div className="text-amber-500 mr-2">
            <Info size={16} />
          </div>
          <div className="text-xs text-gray-700">
            <p className="font-medium mb-1">Fare Inclusions & Terms</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Fares include all taxes and fees</li>
              <li>Waiting time: First 15 minutes free, thereafter ₹100/hr</li>
              <li>Night charges (10 PM - 6 AM): Additional 10% on total fare</li>
              <li>Free cancellation: Up to 2 hours before pickup</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
