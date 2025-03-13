
import { TripMode } from "@/lib/cabData";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface TripModeSelectorProps {
  value: TripMode;
  onChange: (value: TripMode) => void;
}

export function TripModeSelector({ value, onChange }: TripModeSelectorProps) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-700 mb-2">TRIP TYPE</p>
      <RadioGroup 
        value={value} 
        onValueChange={(val) => onChange(val as TripMode)}
        className="flex space-x-6"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="one-way" id="one-way" />
          <Label htmlFor="one-way" className="cursor-pointer">One Way</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="round-trip" id="round-trip" />
          <Label htmlFor="round-trip" className="cursor-pointer">Round Trip</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
