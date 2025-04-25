
import React, { useState } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { Users, Briefcase, Info, Check, Database, Clock, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CabOptionCardProps {
  cab: CabType;
  fare: number | string;
  isSelected: boolean;
  onSelect: (cab: CabType) => void;
  fareDetails: string;
  isCalculating: boolean;
  tripType?: string;
  tripMode?: string;
  fareSource?: string;
}

export function CabOptionCard({ 
  cab, 
  fare, 
  isSelected, 
  onSelect, 
  fareDetails,
  isCalculating,
  tripType = 'local',
  tripMode = 'one-way',
  fareSource = 'unknown'
}: CabOptionCardProps) {
  const [expandedDetails, setExpandedDetails] = useState(false);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDetails(!expandedDetails);
  };

  return (
    <div 
      className={cn(
        "cab-card group",
        isSelected && "ring-2 ring-blue-500 bg-blue-50"
      )}
      onClick={() => onSelect(cab)}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center flex-1 gap-3">
          <div className={cn(
            "w-16 h-16 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-cover bg-center",
            isSelected ? "bg-blue-100" : "bg-gray-100"
          )} style={{backgroundImage: cab.image ? `url(${cab.image})` : 'none'}}>
            {!cab.image && (
              <span className={cn(
                "text-lg font-semibold",
                isSelected ? "text-blue-500" : "text-gray-500"
              )}>
                {cab.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{cab.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{cab.description}</p>
          </div>
        </div>

        <div className="flex flex-col items-end justify-center gap-1">
          {isCalculating ? (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              Calculating...
            </div>
          ) : (
            <>
              <div className={cn(
                "text-lg font-bold",
                isSelected ? "text-blue-600" : "text-gray-900"
              )}>
                {typeof fare === 'number' ? `₹${fare.toLocaleString()}` : fareDetails}
              </div>
              <div className="text-xs text-gray-500">{fareSource}</div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <div className="cab-feature">
          <Users size={14} className="mr-1.5" />
          <span>{cab.capacity} persons</span>
        </div>
        <div className="cab-feature">
          <Briefcase size={14} className="mr-1.5" />
          <span>{cab.luggageCapacity} bags</span>
        </div>
        {cab.ac && (
          <div className="cab-feature">
            <Check size={14} className="mr-1.5" />
            <span>AC</span>
          </div>
        )}
      </div>

      {cab.amenities && cab.amenities.length > 0 && (
        <button 
          onClick={toggleExpand}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center"
        >
          <Info size={14} className="mr-1.5" />
          {expandedDetails ? 'Hide details' : 'More details'}
        </button>
      )}

      {expandedDetails && cab.amenities && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-sm font-medium text-gray-700 mb-2">Amenities</div>
          <div className="flex flex-wrap gap-2">
            {cab.amenities.map((amenity, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
