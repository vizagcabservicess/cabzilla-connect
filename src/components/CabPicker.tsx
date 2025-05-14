
import React from 'react';
import { Check } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CabType } from '@/types/cab';

interface CabPickerProps {
  cabs: CabType[];
  selectedCab: string;
  onSelect: (cabId: string) => void;
}

export function CabPicker({ cabs, selectedCab, onSelect }: CabPickerProps) {
  return (
    <RadioGroup
      value={selectedCab}
      onValueChange={onSelect}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {cabs.map((cab) => (
        <div key={cab.id} className="relative">
          <RadioGroupItem
            value={cab.id}
            id={`cab-${cab.id}`}
            className="peer sr-only"
          />
          <Label
            htmlFor={`cab-${cab.id}`}
            className={`
              flex flex-col h-full border rounded-lg p-4 cursor-pointer
              peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
              hover:bg-gray-50 dark:hover:bg-gray-900 transition-all
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-medium text-base">{cab.name}</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {cab.capacity} persons • {cab.luggageCapacity} luggage
                </p>
              </div>
              <div className="w-16 h-16 bg-gray-100 rounded">
                {cab.image && <img src={cab.image} alt={cab.name} className="w-full h-full object-cover rounded" />}
              </div>
            </div>
            
            <div className="mt-2 text-sm">
              <p>Base price: ₹{cab.basePrice}</p>
              {cab.ac && <p>AC: Yes</p>}
            </div>

            <div className={`
              absolute top-3 right-3 w-5 h-5 rounded-full
              border-2 border-primary flex items-center justify-center
              peer-data-[state=checked]:bg-primary
              text-white
            `}>
              <Check className="h-3 w-3" />
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
