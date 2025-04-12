
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
    console.log('Card clicked, selecting cab:', cab.name);
    onSelect(cab);
  };

  return (
    <div 
      className={cn(
        "border rounded-lg overflow-hidden transition-all duration-200",
        isSelected 
          ? "border-blue-500 shadow-md bg-blue-50" 
          : "border-gray-200 hover:border-gray-300 bg-white"
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="p-5 cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={cn(
              "w-16 h-16 rounded-md flex items-center justify-center bg-cover bg-center mr-3",
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
              <p className="text-xs text-gray-500 mt-1">{cab.description}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-3">
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
              onClick={toggleExpand}
            >
              <Info size={12} className="mr-1" />
              {expandedDetails ? 'Hide details' : 'More details'}
            </div>
          )}
        </div>
        
        {expandedDetails && cab.amenities && cab.amenities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
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
        
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {fareDetails}
            <div className="text-xs text-gray-400 mt-1">
              <span className="text-green-600 mr-1 text-[10px]">✓</span>
              Includes taxes & fees
            </div>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-md flex items-center",
            isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
          )}>
            {isCalculating ? (
              <span className="text-sm">Calculating...</span>
            ) : (
              <span className="text-lg font-bold">{formatPrice(fare)}</span>
            )}
            {isSelected && !isCalculating && <Check size={18} className="ml-2" />}
          </div>
        </div>
      </div>
    </div>
  );
}
