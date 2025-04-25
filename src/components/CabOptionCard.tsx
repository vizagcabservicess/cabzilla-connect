
import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/cabData";
import { CabType } from "@/types/cab";
import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface CabOptionCardProps {
  cab: CabType;
  fare: number;
  isSelected: boolean;
  onSelect: () => void;
  isCalculating?: boolean;
  fareDetails?: string;
  tripType?: string;
  tripMode?: string;
  fareSource?: string;
}

export const CabOptionCard = ({
  cab,
  fare,
  isSelected,
  onSelect,
  isCalculating = false,
  fareDetails = "",
  tripType = "local",
  tripMode = "one-way",
  fareSource = "unknown"
}: CabOptionCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  
  // Format the price display
  const formattedPrice = isCalculating 
    ? "Calculating..." 
    : fare > 0 
      ? `₹${fare}` 
      : "Price unavailable";
  
  return (
    <div 
      className={cn(
        "border rounded-lg transition-all overflow-hidden cursor-pointer",
        isSelected 
          ? "border-blue-500 bg-blue-50" 
          : isHovered 
            ? "border-gray-300 bg-gray-50"
            : "border-gray-200 bg-white",
        isMobile ? "p-3" : "p-4"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div className="flex items-center gap-4">
        {/* Cab Image */}
        <div className="relative shrink-0">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-md bg-gray-100 overflow-hidden">
            {cab.imageUrl ? (
              <img
                src={cab.imageUrl}
                alt={cab.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
            )}
          </div>
          {isSelected && (
            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
              <Check size={14} />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <h3 className="font-medium text-gray-900 truncate">{cab.name}</h3>
            
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 flex items-center">
                <Users size={14} className="mr-1" />
                <span>{cab.capacity}</span>
              </div>
              <span className="text-xs text-gray-500">|</span>
              <div className="text-sm text-gray-600">{cab.acType || "AC"}</div>
            </div>
          </div>
          
          <div className="mt-1">
            <div className="flex items-center gap-1">
              <p className={cn(
                "font-semibold text-lg",
                isCalculating ? "text-gray-400" : "text-blue-700"
              )}>
                {formattedPrice}
              </p>
              {fareSource === "database" && (
                <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">
                  Verified
                </span>
              )}
            </div>
            
            {cab.features && cab.features.length > 0 && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {cab.features.join(' • ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
