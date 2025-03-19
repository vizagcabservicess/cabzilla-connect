
import { TripMode } from "@/lib/tripTypes";
import { ArrowRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripModeSelectorProps {
  value: TripMode;
  onChange: (value: TripMode) => void;
  className?: string;
}

export function TripModeSelector({ value, onChange, className }: TripModeSelectorProps) {
  return (
    <div className={cn("mb-4", className)}>
      <p className="text-xs font-medium text-gray-700 mb-2">TRIP TYPE</p>
      <div className="flex space-x-4">
        <button
          onClick={() => onChange("one-way")}
          className={cn(
            "flex items-center px-4 py-2 rounded-md border border-gray-200 transition-all",
            value === "one-way" 
              ? "bg-blue-50 border-blue-200 text-blue-700" 
              : "bg-white text-gray-600 hover:bg-gray-50"
          )}
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          <span className="text-sm font-medium">One Way</span>
          <span className="ml-1 text-xs text-blue-600">
            First 300km included, then ₹13/km
          </span>
        </button>
        
        <button
          onClick={() => onChange("round-trip")}
          className={cn(
            "flex items-center px-4 py-2 rounded-md border border-gray-200 transition-all",
            value === "round-trip" 
              ? "bg-blue-50 border-blue-200 text-blue-700" 
              : "bg-white text-gray-600 hover:bg-gray-50"
          )}
        >
          <RotateCw className="mr-2 h-4 w-4" />
          <span className="text-sm font-medium">Round Trip</span>
          <span className="ml-1 text-xs text-blue-600">₹14/km</span>
        </button>
      </div>
    </div>
  );
}
