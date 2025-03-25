import React, { useState } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { Users, Briefcase, Info, Check, Star, X } from 'lucide-react';
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
  
  // Tax calculation (roughly 15% of base fare)
  const taxAmount = Math.floor(fare * 0.15);
  
  if (isMobile) {
    // Map cab.name to a more user-friendly name with similar
    let cabDisplayName = cab.name;
    let showSimilar = true;
    
    if (cab.name === "Sedan") {
      cabDisplayName = "Indica, Swift";
    } else if (cab.name === "Ertiga") {
      cabDisplayName = "Xylo, Ertiga";
    } else if (cab.name === "Innova Crysta") {
      cabDisplayName = "Toyota Innova";
      showSimilar = false;
    } else if (cab.name === "Luxury Sedan") {
      cabDisplayName = "Dzire, Etios";
    } else if (cab.name === "Tempo Traveller") {
      cabDisplayName = "Tempo Traveller";
      showSimilar = false;
    }
    
    // Determine fuel type badge color
    const fuelTypeColor = cab.fuelType?.toLowerCase() === 'diesel' 
      ? "bg-amber-700" 
      : cab.fuelType?.toLowerCase() === 'cng' 
        ? "bg-teal-600" 
        : "bg-blue-600";
    
    return (
      <div 
        className={cn(
          "bg-white rounded-xl overflow-hidden mb-3 border border-gray-200",
          isSelected ? "border-2 border-blue-500" : ""
        )}
        onClick={handleCardClick}
      >
        <div className="p-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <div>
                <h3 className="font-semibold text-base">{cabDisplayName}</h3>
                {showSimilar && <span className="text-xs text-gray-500">or similar</span>}
              </div>
              
              <div className="flex mt-1 mb-2">
                <div className="text-xs bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded flex items-center mr-2">
                  <Star className="h-3 w-3 mr-0.5 text-green-600" />
                  {rating}
                </div>
                
                {cab.fuelType && (
                  <div className={cn(
                    "text-xs text-white font-medium px-2 py-0.5 rounded",
                    fuelTypeColor
                  )}>
                    {cab.fuelType}
                  </div>
                )}
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
                + ₹{taxAmount} (Taxes & Charges)
              </div>
            </div>
          </div>
          
          <div className="flex items-center text-sm mt-1 mb-1">
            <div className="flex items-center">
              <Users size={14} className="mr-1 text-gray-500" />
              <span>{cab.capacity} Seats</span>
            </div>
            <div className="mx-2 text-gray-300">•</div>
            <div className="flex items-center">
              <span>AC</span>
            </div>
          </div>
          
          {cab.luggageCapacity > 0 && (
            <div className="mt-2 px-2 py-1.5 bg-amber-50 border-t border-amber-100 -mx-3 text-sm">
              <div className="flex items-start">
                <div className="text-amber-500 mr-2">⚡</div>
                <div className="text-xs text-amber-800">
                  Roof carrier available with this car starting @ INR {Math.floor(fare * 0.06)}
                </div>
              </div>
            </div>
          )}
        </div>
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
