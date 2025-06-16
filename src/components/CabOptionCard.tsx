
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
            "border-2 rounded-xl bg-white shadow-sm flex flex-row items-stretch mb-3 overflow-hidden box-border transition-all duration-200",
            isSelected 
              ? "border-4 border-blue-600 bg-blue-50/70 shadow-lg ring-2 ring-blue-300" 
              : "border-gray-200"
          )}
          onClick={() => { if (typeof onSelect === 'function') onSelect(); }}
        >
          <div className="flex items-center justify-center w-20 h-16 bg-gray-100 flex-shrink-0">
            {cab.image ? (
              <img src={cab.image} alt={cab.name} className="object-contain w-full h-full rounded-lg" />
            ) : (
              <span className={cn("text-xl font-bold text-gray-600")}>{cab.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-between p-2 w-full min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base text-gray-900">{cab.name}</span>
              {cab.model && <span className="ml-2 text-xs text-gray-500">{cab.model}</span>}
              {cab.make && <span className="ml-2 text-xs text-gray-500">{cab.make}</span>}
              {cab.year && <span className="ml-2 text-xs text-gray-500">{cab.year}</span>}
              {isSelected && <span className="ml-2 px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-semibold">Selected</span>}
            </div>
            
            <button
              type="button"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-base font-semibold my-2 focus:outline-none"
              onClick={e => { e.stopPropagation(); setShowDetails(!showDetails); }}
            >
              {showDetails ? 'Hide Details' : 'View Details'}
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {showDetails && (
              <>
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1"><Star className="h-3 w-3 inline" /> 4.5</span>
                
                <div className="mt-2 text-xs bg-gray-50 rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">4.5</span>
                    </div>
                    <span className="text-gray-500">(150+ reviews)</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-gray-600 mb-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{cab.capacity || 4} Seats</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{cab.luggageCapacity || 2} Bags</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="h-4 w-4" />
                      <span>{cab.fuelType || 'CNG'}</span>
                    </div>
                  </div>
                  
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

                  {/* Display inclusions */}
                  {cab.inclusions && cab.inclusions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-700 mb-1">Inclusions:</p>
                      <div className="flex flex-wrap gap-1">
                        {cab.inclusions.slice(0, 3).map((inclusion, index) => (
                          <span key={index} className="text-xs text-green-600">✓ {inclusion}</span>
                        ))}
                        {cab.inclusions.length > 3 && (
                          <span className="text-xs text-green-600">+{cab.inclusions.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Display exclusions */}
                  {cab.exclusions && cab.exclusions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-700 mb-1">Exclusions:</p>
                      <div className="flex flex-wrap gap-1">
                        {cab.exclusions.slice(0, 2).map((exclusion, index) => (
                          <span key={index} className="text-xs text-red-600">✗ {exclusion}</span>
                        ))}
                        {cab.exclusions.length > 2 && (
                          <span className="text-xs text-red-600">+{cab.exclusions.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Display cancellation policy */}
                  {cab.cancellationPolicy && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-blue-700 mb-1">Cancellation:</p>
                      <p className="text-xs text-blue-600">{cab.cancellationPolicy}</p>
                    </div>
                  )}
                </div>
              </>
            )}
            
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
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">{cab.name}</h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">4.5</span>
                      </div>
                      <span className="text-sm text-gray-500">(150+ reviews)</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{cab.capacity || 4} Seats</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{cab.luggageCapacity || 2} Bags</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="h-4 w-4" />
                        <span>{cab.fuelType || 'CNG'}</span>
                      </div>
                    </div>
                    
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
                
                {showDetails && (
                  <div className="mt-4 px-4 pb-4">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">Inclusions</h4>
                        {cab.inclusions && cab.inclusions.length > 0 ? (
                          <ul className="text-sm text-gray-700 list-none space-y-1">
                            {cab.inclusions.map((inc: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="text-green-600">✓</span>
                                {inc}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-gray-500 italic">No inclusions listed.</div>
                        )}
                      </div>
                      
                      {cab.exclusions && cab.exclusions.length > 0 && (
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Exclusions</h4>
                          <ul className="text-sm text-gray-700 list-none space-y-1">
                            {cab.exclusions.map((exc: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="text-red-600">✗</span>
                                {exc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {cab.cancellationPolicy && (
                      <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600 border border-gray-200">
                        <strong>Cancellation Policy:</strong><br />
                        {cab.cancellationPolicy}
                      </div>
                    )}
                    
                    {cab.fuelType && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Fuel Type:</strong> {cab.fuelType}
                      </div>
                    )}
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
