
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TripMode } from "@/lib/cabData";
import { ArrowRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RadioGroupTripModeProps {
  value: TripMode;
  onChange: (value: TripMode) => void;
  className?: string;
}

export function RadioGroupTripMode({ 
  value, 
  onChange, 
  className 
}: RadioGroupTripModeProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-gray-700">Trip Type</p>
      <RadioGroup 
        value={value} 
        onValueChange={(value) => onChange(value as TripMode)}
        className="flex space-x-4"
      >
        <div 
          className={cn(
            "flex items-center space-x-2 border rounded-md px-4 py-3",
            "hover:bg-gray-50 cursor-pointer w-full transition-colors",
            "bg-white text-gray-600", 
            value === "one-way" && "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200"
          )}
          onClick={() => onChange('one-way')}
        >
          <RadioGroupItem value="one-way" id="one-way" className="sr-only" />
          <ArrowRight className="h-4 w-4 flex-shrink-0" />
          <div className="grid">
            <Label htmlFor="one-way" className="text-sm font-medium cursor-pointer">One Way</Label>
            <p className="text-xs text-blue-600">Base fare for 300km included</p>
          </div>
          {value === "one-way" && (
            <div className="ml-auto">
              <div className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                ✓
              </div>
            </div>
          )}
        </div>
        
        <div 
          className={cn(
            "flex items-center space-x-2 border rounded-md px-4 py-3",
            "hover:bg-gray-50 cursor-pointer w-full transition-colors",
            "bg-white text-gray-600",
            value === "round-trip" && "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200"
          )}
          onClick={() => onChange('round-trip')}
        >
          <RadioGroupItem value="round-trip" id="round-trip" className="sr-only" />
          <RotateCw className="h-4 w-4 flex-shrink-0" />
          <div className="grid">
            <Label htmlFor="round-trip" className="text-sm font-medium cursor-pointer">Round Trip</Label>
            <p className="text-xs text-blue-600">Multi-day journey with return</p>
          </div>
          {value === "round-trip" && (
            <div className="ml-auto">
              <div className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                ✓
              </div>
            </div>
          )}
        </div>
      </RadioGroup>
    </div>
  );
}
