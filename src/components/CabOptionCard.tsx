
import React from 'react';
import { formatPrice } from '@/lib/utils';
import { Users, Briefcase, CheckCircle2, Info } from 'lucide-react';
import { CabType } from '@/types/cab';

interface CabOptionCardProps {
  cab: CabType;
  fare: number;
  isSelected: boolean;
  onSelect: () => void;
  fareDetails?: string;
  isCalculating?: boolean;
}

const CabOptionCard: React.FC<CabOptionCardProps> = ({
  cab,
  fare,
  isSelected,
  onSelect,
  fareDetails,
  isCalculating = false
}) => {
  // Card highlight classes based on selection state
  const cardClasses = `
    relative p-4 rounded-lg border transition-all cursor-pointer
    ${isSelected 
      ? 'border-blue-500 bg-blue-50 shadow-md' 
      : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'}
  `;

  return (
    <div className={cardClasses} onClick={onSelect}>
      {/* Selected indicator checkmark */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full text-white p-0.5">
          <CheckCircle2 size={18} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Cab image and details */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-12 bg-gray-200 rounded">
            {cab.image ? (
              <img 
                src={cab.image} 
                alt={cab.name} 
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                {cab.name.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{cab.name}</h3>
            
            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{cab.capacity} persons</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Briefcase size={14} />
                <span>{cab.luggageCapacity} bags</span>
              </div>
            </div>
            
            {cab.description && (
              <p className="text-sm text-gray-500 mt-1">{cab.description}</p>
            )}
          </div>
        </div>
        
        {/* Fare display */}
        <div className="flex flex-col items-end">
          {isCalculating ? (
            <div className="text-gray-400 font-medium">Calculating...</div>
          ) : fare > 0 ? (
            <div className="text-xl font-bold text-gray-900">
              {formatPrice(fare)}
            </div>
          ) : (
            <div className="text-gray-500">Price unavailable</div>
          )}
          
          {fareDetails && (
            <div className="text-sm text-gray-500">
              {fareDetails}
            </div>
          )}
        </div>
      </div>
      
      {/* Features list if available */}
      {cab.amenities && cab.amenities.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {cab.amenities.map((feature, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CabOptionCard;
