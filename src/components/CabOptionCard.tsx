import React, { useState } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { Users, Briefcase, Info, Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CabOptionCardProps {
  cab: CabType;
  fare: number;
  isSelected: boolean;
  onSelect: (cab: CabType) => void;
  fareDetails: string;
  isCalculating: boolean;
}

export function CabOptionCard({ 
  cab, 
  fare, 
  isSelected, 
  onSelect, 
  fareDetails,
  isCalculating
}: CabOptionCardProps) {
  const [expandedDetails, setExpandedDetails] = useState(false);
  const isMobile = useIsMobile();
  
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDetails(!expandedDetails);
  };

  const handleCardClick = () => {
    console.log('Card clicked, selecting cab:', cab.name);
    onSelect(cab);
  };
  
  // Generate a random rating between 4.0 and 5.0 for display purposes
  const rating = (Math.floor(Math.random() * 10) / 10 + 4.0).toFixed(1);
  
  // Calculate discount (15-20%)
  const originalPrice = Math.floor(fare * (1 + (Math.random() * 5 + 15) / 100));
  const discountPercent = Math.floor(((originalPrice - fare) / originalPrice) * 100);
  
  if (isMobile) {
    return (
      <div 
        className={cn(
          "mobile-app-card mb-3 overflow-hidden",
          isSelected ? "border-2 border-blue-500" : ""
        )}
        onClick={handleCardClick}
      >
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-base">{cab.name}</h3>
                <span className="text-xs text-gray-500">or similar</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="text-xs bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded flex items-center">
                  <Star className="h-3 w-3 mr-0.5 text-green-600" />
                  {rating}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              {discountPercent > 0 && (
                <div className="text-xs text-green-600 font-medium">{discountPercent}% off</div>
              )}
              <div className="flex items-center">
                {originalPrice > fare && (
                  <span className="text-xs text-gray-500 line-through mr-1.5">₹{originalPrice}</span>
                )}
                <span className="font-bold text-lg">
                  {isCalculating ? "..." : `₹${fare}`}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                + ₹{Math.floor(fare * 0.15)} (Taxes & Charges)
              </div>
            </div>
          </div>
          
          <div className="border-t border-b border-gray-100 py-2 flex">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <Users size={14} className="mr-1 text-gray-500" />
                <span className="text-sm">{cab.capacity} Seats</span>
              </div>
              <div className="text-gray-300">•</div>
              <div className="flex items-center">
                <span className="text-sm">AC</span>
              </div>
            </div>
          </div>
          
          {cab.fuelType && (
            <div className="mt-2">
              <div className={cn(
                "inline-block px-2 py-1 text-xs font-medium text-white rounded",
                cab.fuelType.toLowerCase() === 'diesel' 
                  ? "bg-amber-600"
                  : cab.fuelType.toLowerCase() === 'cng' 
                    ? "bg-teal-600" 
                    : "bg-blue-600"
              )}>
                {cab.fuelType}
              </div>
            </div>
          )}
          
          {isSelected && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center text-blue-600">
                <Check size={16} className="mr-1" />
                <span className="text-sm font-medium">Selected</span>
              </div>
            </div>
          )}
          
          {expandedDetails && cab.amenities && cab.amenities.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100 text-sm">
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
                {cab.amenities.map((amenity, index) => (
                  <li key={index} className="flex items-center text-gray-600 text-xs">
                    <Check size={12} className="mr-1 text-green-500" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {cab.amenities && cab.amenities.length > 0 && (
          <div 
            className="bg-gray-50 py-2 px-4 text-center border-t border-gray-100"
            onClick={toggleExpand}
          >
            <span className="text-xs text-blue-600 font-medium">
              {expandedDetails ? "Hide details" : "Show more details"}
            </span>
          </div>
        )}
        
        {cab.luggageCapacity > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
            <div className="flex items-start">
              <div className="text-amber-500 mr-2">⚡</div>
              <div className="text-xs text-amber-800">
                Roof carrier available with this car starting @ INR {Math.floor(fare * 0.06)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "border rounded-lg overflow-hidden transition-all duration-300",
        isSelected 
          ? "border-blue-500 shadow-md bg-blue-50 transform scale-[1.02]" 
          : "border-gray-200 hover:border-gray-300 bg-white"
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="p-4 cursor-pointer relative">
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
            <Check size={16} />
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-12 h-12 rounded-md flex items-center justify-center bg-cover bg-center",
              isSelected ? "bg-blue-100" : "bg-gray-100"
            )} style={{backgroundImage: cab.image && !cab.image.includes('undefined') ? `url(${cab.image})` : 'none'}}>
              {(!cab.image || cab.image.includes('undefined')) && (
                <span className={isSelected ? "text-blue-500 text-xs" : "text-gray-500 text-xs"}>
                  {cab.name.charAt(0)}
                </span>
              )}
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
              {isCalculating ? (
                <span className="text-sm text-gray-400">Calculating...</span>
              ) : fare > 0 ? (
                formatPrice(fare)
              ) : (
                <span className="text-sm text-gray-400">Price unavailable</span>
              )}
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
            {cab.luggageCapacity} bags
          </div>
          {cab.ac && (
            <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
              <Check size={12} className="mr-1" />
              AC
            </div>
          )}
          {cab.amenities && cab.amenities.length > 0 && (
            <div 
              className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded" 
              onClick={(e) => {
                e.stopPropagation();  // Prevent card selection when clicking this button
                toggleExpand(e);
              }}
            >
              <Info size={12} className="mr-1" />
              {expandedDetails ? 'Hide details' : 'More details'}
            </div>
          )}
        </div>
        
        {expandedDetails && cab.amenities && cab.amenities.length > 0 && (
          <div className="mt-3 pt-3 border-t text-sm text-gray-600">
            <div className="font-medium mb-1">Amenities:</div>
            <div className="flex flex-wrap gap-1">
              {cab.amenities.map((amenity, index) => (
                <span key={index} className="bg-gray-50 text-xs px-2 py-1 rounded">
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
