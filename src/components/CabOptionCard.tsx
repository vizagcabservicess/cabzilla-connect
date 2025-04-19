
import React, { useState } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { Users, Briefcase, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDetails(!expandedDetails);
  };

  const handleCardClick = () => {
    console.log('Card clicked, selecting cab:', cab.name, 'with fare:', fare);
    onSelect(cab);
  };

  // Determine what to display for the price
  const renderPriceDisplay = () => {
    if (isCalculating) {
      return <span className="text-sm flex items-center">
        <div className="h-3 w-3 rounded-full border-2 border-t-transparent border-blue-500 animate-spin mr-2"></div>
        Calculating...
      </span>;
    } else if (fare > 0) {
      return formatPrice(fare);
    } else {
      return <span className="text-sm text-gray-500">Calculating fare...</span>;
    }
  };

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
              <p className="text-xs text-gray-500">{cab.description || ''}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className={cn(
              "text-lg font-bold",
              isSelected ? "text-blue-600" : "text-gray-800"
            )}>
              {renderPriceDisplay()}
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
              className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer" 
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
