
import React from 'react';
import { CabType } from '@/types/cab';
import { Star, Users, Briefcase, Fuel, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileCabCardProps {
  cab: CabType;
  fare: number | string;
  isSelected: boolean;
  onSelect: () => void;
  isCalculating: boolean;
  fareSource?: string;
}

export function MobileCabCard({
  cab,
  fare,
  isSelected,
  onSelect,
  isCalculating,
  fareSource = 'unknown'
}: MobileCabCardProps) {
  return (
    <div 
      className={cn(
        "border rounded-lg p-4 transition-all cursor-pointer",
        isSelected 
          ? "border-blue-500 bg-blue-50/50 shadow-md" 
          : "border-gray-200 bg-white hover:shadow-sm"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        {/* Vehicle Image */}
        <div className={cn(
          "w-16 h-12 rounded-lg flex items-center justify-center bg-cover bg-center flex-shrink-0",
          isSelected ? "bg-blue-100" : "bg-gray-100"
        )} style={{backgroundImage: cab.image ? `url(${cab.image})` : 'none'}}>
          {!cab.image && (
            <span className={cn(
              "text-lg font-bold",
              isSelected ? "text-blue-600" : "text-gray-600"
            )}>
              {cab.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Vehicle Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-base text-gray-900">{cab.name}</h3>
              
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">4.5</span>
                </div>
                <span className="text-xs text-gray-500">•</span>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>4</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    <span>2</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Fuel className="h-3 w-3" />
                    <span>CNG</span>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {cab.amenities && cab.amenities.length > 0 && (
                <div className="flex gap-1 mt-2">
                  <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    AC
                  </span>
                </div>
              )}
            </div>

            {/* Price and Select */}
            <div className="text-right ml-3">
              {isCalculating ? (
                <div className="flex items-center text-xs text-gray-500">
                  <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full mr-1"></div>
                  Calculating...
                </div>
              ) : (
                <>
                  <div className="text-lg font-bold text-gray-900">
                    {typeof fare === 'number' ? `₹${fare.toLocaleString()}` : '₹--'}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">Incl. taxes</div>
                </>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {isSelected ? (
                  <>
                    <Check className="inline h-3 w-3 mr-1" />
                    Selected
                  </>
                ) : (
                  'Select'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
