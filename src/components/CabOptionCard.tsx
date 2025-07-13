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
  breakdown?: any;
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
  fareSource = 'unknown',
  breakdown
}: CabOptionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const displayFare =
    tripType === 'outstation' && (tripMode === 'round' || tripMode === 'round-trip') && breakdown?.totalFare
      ? breakdown.totalFare
      : fare;

  return (
    <>
      {/* Mobile: horizontal, enhanced modern design */}
      <div className="block md:hidden">
        <div 
          className={cn(
            "bg-[#fff] rounded-xl shadow p-4 mb-4 flex flex-col gap-2 border border-gray-200",
            isSelected 
              ? "ring-2 ring-blue-400" 
              : ""
          )}
          onClick={() => { if (typeof onSelect === 'function') onSelect(); }}
        >
          <div className="flex items-center gap-4">
            {/* Car Image */}
            <img src={cab.image} alt={cab.name} className="w-16 h-12 rounded object-cover bg-gray-100" />
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[14px] text-gray-900 truncate">{cab.name}</span>
                <span className="text-lg font-bold text-gray-900 ml-2">₹{typeof displayFare === 'number' ? displayFare.toLocaleString() : fareDetails}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                <span>{cab.capacity || 4} Seats</span>
                <span>• {cab.luggageCapacity || 2} Bags</span>
                <span>• {cab.fuelType || 'CNG'}</span>
              </div>
              {/* Amenities */}
              {cab.amenities && cab.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {cab.amenities.slice(0, 3).map((amenity, index) => (
                    <span key={index} className="inline-block px-2 py-1 text-[0.7rem] bg-green-100 text-green-700 rounded-full">
                      {amenity}
                    </span>
                  ))}
                  {cab.amenities.length > 3 && (
                    <span className="inline-block px-2 py-1 text-[0.7rem] bg-gray-100 text-gray-600 rounded-full">
                      +{cab.amenities.length - 3} more
                    </span>
                  )}
                </div>
              )}
              {/* View Details link */}
              <button
                type="button"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[0.8rem] font-semibold mt-2 focus:outline-none"
                onClick={e => { e.stopPropagation(); setShowDetails(!showDetails); }}
              >
                {showDetails ? 'Hide Details' : 'View Details'}
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {/* Extra details accordion (mobile only) */}
          {showDetails && (
            <div className="mt-2 text-xs bg-gray-50 rounded p-2">
              {/* Inclusions */}
              <div className="mb-2">
                <h4 className="font-semibold mb-1 text-sm">Inclusions</h4>
                {cab.inclusions && cab.inclusions.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-700 text-sm">
                    {cab.inclusions.map((inc: string, idx: number) => (
                      <li key={idx}>✓ {inc}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 italic text-sm">No inclusions listed.</div>
                )}
              </div>
              {/* Exclusions */}
              <div>
                <h4 className="font-semibold mb-1 text-sm">Exclusions</h4>
                {cab.exclusions && cab.exclusions.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-700 text-sm">
                    {cab.exclusions.map((exc: string, idx: number) => (
                      <li key={idx}>✗ {exc}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 italic text-sm">No exclusions listed.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Desktop: similar layout, responsive */}
      <div className="hidden md:block">
        <div 
          className={cn(
            "bg-[#fff] rounded-xl shadow p-4 mb-4 flex flex-col gap-2 border border-gray-200 cursor-pointer hover:shadow-lg transition-all text-xs md:text-[12px]",
            isSelected 
              ? "ring-2 ring-blue-400" 
              : ""
          )}
          onClick={() => { if (typeof onSelect === 'function') onSelect(); }}
        >
          <div className="flex items-center gap-4">
            {/* Car Image */}
            <img src={cab.image} alt={cab.name} className="w-20 h-16 rounded object-cover bg-gray-100" />
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[14px] text-gray-900 truncate">{cab.name}</span>
                <span className="text-lg md:text-base font-bold text-gray-900 ml-2">₹{typeof displayFare === 'number' ? displayFare.toLocaleString() : fareDetails}</span>
              </div>
              <div className="flex items-center gap-3 text-xs md:text-[11px] text-gray-500 mt-1">
                <span>{cab.capacity || 4} Seats</span>
                <span>• {cab.luggageCapacity || 2} Bags</span>
                <span>• {cab.fuelType || 'CNG'}</span>
              </div>
              {/* Amenities */}
              {cab.amenities && cab.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {cab.amenities.slice(0, 3).map((amenity, index) => (
                    <span key={index} className="inline-block px-2 py-1 text-[10px] bg-green-100 text-green-700 rounded-full">
                      {amenity}
                    </span>
                  ))}
                  {cab.amenities.length > 3 && (
                    <span className="inline-block px-2 py-1 text-[10px] bg-gray-100 text-gray-600 rounded-full">
                      +{cab.amenities.length - 3} more
                    </span>
                  )}
                </div>
              )}
              {/* View Details link */}
              <button
                type="button"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs md:text-[11px] font-semibold mt-2 focus:outline-none"
                onClick={e => { e.stopPropagation(); setShowDetails(!showDetails); }}
              >
                {showDetails ? 'Hide Details' : 'View Details'}
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {/* Fare is already on the right */}
          </div>
          {/* Extra details accordion (desktop) */}
          {showDetails && (
            <div className="mt-2 text-xs md:text-[11px] bg-gray-50 rounded p-2">
              {/* Inclusions */}
              <div className="mb-2">
                <h4 className="font-semibold mb-1 text-xs md:text-[11px]">Inclusions</h4>
                {cab.inclusions && cab.inclusions.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-700 text-xs md:text-[11px]">
                    {cab.inclusions.map((inc: string, idx: number) => (
                      <li key={idx}>✓ {inc}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 italic text-xs md:text-[11px]">No inclusions listed.</div>
                )}
              </div>
              {/* Exclusions */}
              <div>
                <h4 className="font-semibold mb-1 text-xs md:text-[11px]">Exclusions</h4>
                {cab.exclusions && cab.exclusions.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-700 text-xs md:text-[11px]">
                    {cab.exclusions.map((exc: string, idx: number) => (
                      <li key={idx}>✗ {exc}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 italic text-xs md:text-[11px]">No exclusions listed.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
