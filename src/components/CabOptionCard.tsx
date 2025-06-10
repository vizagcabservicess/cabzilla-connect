import React, { useState } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { Users, Briefcase, Info, Check, Database, Clock, Calculator, Star, Fuel, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CabOptionCardProps {
  cab: CabType;
  fare: number | string;
  isSelected: boolean;
  onSelect: (...args: any[]) => void;
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
  onSelect = () => {},
  fareDetails,
  isCalculating,
  tripType = 'local',
  tripMode = 'one-way',
  fareSource = 'unknown'
}: CabOptionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getFareBreakdown = () => {
    if (typeof fare !== 'number' || !fare) return null;
    
    // Sample breakdown - you can enhance this based on your fare calculation logic
    const baseFare = Math.floor(fare * 0.7);
    const taxes = Math.floor(fare * 0.12);
    const driverAllowance = fare - baseFare - taxes;
    
    return {
      baseFare,
      driverAllowance,
      taxes,
      total: fare
    };
  };

  const breakdown = getFareBreakdown();

  return (
    <>
      {/* Mobile: horizontal, enhanced modern design */}
      <div className="block md:hidden">
        <div 
          className={cn(
            "border rounded-xl bg-white shadow-sm flex flex-row items-stretch mb-3 overflow-hidden box-border",
            isSelected 
              ? "border-blue-500 bg-blue-50/50 shadow-md" 
              : "border-gray-200"
          )}
          onClick={() => { if (typeof onSelect === 'function') onSelect(); }}
        >
          {/* Car Image */}
          <div className="flex items-center justify-center w-20 h-16 bg-gray-100 flex-shrink-0">
            {cab.image ? (
              <img src={cab.image} alt={cab.name} className="object-contain w-full h-full rounded-lg" />
            ) : (
              <span className={cn("text-xl font-bold text-gray-600")}>{cab.name.charAt(0)}</span>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 flex flex-col justify-between p-2 w-full min-w-0">
            {/* Top row: Car name, rating, discount, old price */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base text-gray-900">{cab.name}</span>
            </div>
            {/* View more details link (mobile only, always under vehicle type) */}
            <button
              type="button"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-base font-semibold my-2 focus:outline-none"
              onClick={e => { e.stopPropagation(); setShowDetails(!showDetails); }}
            >
              {showDetails ? 'Hide Details' : 'View Details'}
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {/* Extra details accordion (mobile only) */}
            {showDetails && (
              <>
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1"><Star className="h-3 w-3 inline" /> 4.5</span>
                {cab.discount && (
                  <span className="ml-1 px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">{cab.discount}</span>
                )}
                {cab.oldPrice && (
                  <span className="ml-1 text-xs text-gray-400 line-through">{cab.oldPrice}</span>
                )}
                <div className="mt-2 text-xs bg-gray-50 rounded p-2">
                  {/* Rating and Reviews */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">4.5</span>
                    </div>
                    <span className="text-gray-500">(150+ reviews)</span>
                  </div>
                  {/* Vehicle Features */}
                  <div className="flex items-center gap-4 text-gray-600 mb-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>4 Seats</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>2 Bags</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="h-4 w-4" />
                      <span>{cab.fuelType || 'CNG'}</span>
                    </div>
                  </div>
                  {/* Amenities Tags */}
                  {cab.amenities && cab.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {cab.amenities.slice(0, 3).map((amenity, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full"
                        >
                          {amenity}
                        </span>
                      ))}
                      {cab.amenities.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{cab.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Third row: Price, taxes, select button */}
            <div className="flex flex-col gap-1 mt-2 w-full">
              <div className="flex items-end justify-between w-full">
                <div>
                  <span className="text-lg font-bold text-gray-900 block">₹{typeof fare === 'number' ? fare.toLocaleString() : fareDetails}</span>
                  <span className="text-xs text-gray-500 block">Incl. taxes</span>
                </div>
                <button
                  onClick={onSelect}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-medium text-xs transition-colors ml-2",
                    isSelected
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="inline h-4 w-4 mr-1" />
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
      {/* Desktop: original vertical, detailed card */}
      <div className="hidden md:block">
        <div 
          className={cn(
            "border rounded-lg transition-all cursor-pointer hover:shadow-md",
            isSelected 
              ? "border-blue-500 bg-blue-50/50 shadow-md" 
              : "border-gray-200 bg-white"
          )}
          onClick={() => { if (typeof onSelect === 'function') onSelect(); }}
        >
          <div className="p-4">
            <div className="flex items-start gap-4">
              {/* Vehicle Image/Icon */}
              <div className={cn(
                "w-20 h-16 rounded-lg flex items-center justify-center bg-cover bg-center flex-shrink-0",
                isSelected ? "bg-blue-100" : "bg-gray-100"
              )} style={{backgroundImage: cab.image ? `url(${cab.image})` : 'none'}}>
                {!cab.image && (
                  <span className={cn(
                    "text-xl font-bold",
                    isSelected ? "text-blue-600" : "text-gray-600"
                  )}>
                    {cab.name.charAt(0)}
                  </span>
                )}
              </div>
              {/* Vehicle Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">{cab.name}</h3>
                    {/* Rating and Reviews */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">4.5</span>
                      </div>
                      <span className="text-sm text-gray-500">(150+ reviews)</span>
                    </div>
                    {/* Vehicle Features */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>4 Seats</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>2 Bags</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="h-4 w-4" />
                        <span>CNG</span>
                      </div>
                    </div>
                    {/* Amenities Tags */}
                    {cab.amenities && cab.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {cab.amenities.slice(0, 3).map((amenity, index) => (
                          <span 
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full"
                          >
                            {amenity}
                          </span>
                        ))}
                        {cab.amenities.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{cab.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Price Section */}
                  <div className="text-right ml-4">
                    {isCalculating ? (
                      <div className="flex items-center text-sm text-gray-500">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                        Calculating...
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-gray-900">
                          {typeof fare === 'number' ? `₹${fare.toLocaleString()}` : fareDetails}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{fareSource}</div>
                        <div className="text-xs text-gray-500">Incl. taxes & fees</div>
                      </>
                    )}
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(!showDetails);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    {showDetails ? 'Hide Details' : 'View Details'}
                    {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={onSelect}
                    className={cn(
                      "px-6 py-2 rounded-lg font-medium text-sm transition-colors",
                      isSelected
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    {isSelected ? (
                      <>
                        <Check className="inline h-4 w-4 mr-1" />
                        Selected
                      </>
                    ) : (
                      'Select Cab'
                    )}
                  </button>
                </div>
                {/* Expandable Details */}
                {showDetails && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Inclusions */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-900 mb-2">Inclusions</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-600" />
                            Base fare & fuel
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-600" />
                            Driver allowance
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-600" />
                            Taxes & tolls
                          </li>
                        </ul>
                      </div>
                      {/* Fare Breakdown */}
                      {breakdown && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-900 mb-2">Fare Breakdown</h4>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Base fare</span>
                              <span>₹{breakdown.baseFare.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Driver allowance</span>
                              <span>₹{breakdown.driverAllowance.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Taxes & fees</span>
                              <span>₹{breakdown.taxes.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-medium border-t pt-1">
                              <span>Total</span>
                              <span>₹{breakdown.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Cancellation Policy */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-sm text-gray-900 mb-1">Cancellation Policy</h4>
                      <p className="text-xs text-gray-600">
                        Free cancellation up to 1 hour before pickup. ₹100 charge after that.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
