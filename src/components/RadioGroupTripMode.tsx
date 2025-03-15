
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TripMode } from "@/lib/cabData";
import { ArrowRight, RotateCw } from "lucide-react";

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
    <div className={className}>
      <p className="text-sm font-medium text-gray-700 mb-2">Trip Type</p>
      <RadioGroup 
        value={value} 
        onValueChange={(value) => onChange(value as TripMode)}
        className="flex space-x-4"
      >
        <div className="flex items-center space-x-2 border rounded-md px-4 py-3 
          hover:bg-gray-50 cursor-pointer w-full transition-colors
          bg-white text-gray-600 
          data-[state=checked]:bg-blue-50 data-[state=checked]:border-blue-200 data-[state=checked]:text-blue-700"
          onClick={() => onChange('one-way')}
        >
          <RadioGroupItem value="one-way" id="one-way" className="sr-only" />
          <ArrowRight className="h-4 w-4" />
          <div className="grid">
            <Label htmlFor="one-way" className="text-sm font-medium cursor-pointer">One Way</Label>
            <p className="text-xs text-blue-600">Double distance for fare calculation</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 border rounded-md px-4 py-3
          hover:bg-gray-50 cursor-pointer w-full transition-colors
          bg-white text-gray-600
          data-[state=checked]:bg-blue-50 data-[state=checked]:border-blue-200 data-[state=checked]:text-blue-700"
          onClick={() => onChange('round-trip')}
        >
          <RadioGroupItem value="round-trip" id="round-trip" className="sr-only" />
          <RotateCw className="h-4 w-4" />
          <div className="grid">
            <Label htmlFor="round-trip" className="text-sm font-medium cursor-pointer">Round Trip</Label>
            <p className="text-xs text-blue-600">Multi-day journey with return</p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
