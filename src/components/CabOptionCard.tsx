
import React from 'react';
import { CabType } from '@/types/cab';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CabOptionCardProps {
  cab: CabType;
  fare: number;
  isSelected: boolean;
  onSelect: () => void;
  fareDetails: string;
  isCalculating: boolean;
  tripType: string;
  tripMode: string;
  fareSource: string;
}

export function CabOptionCard({
  cab,
  fare,
  isSelected,
  onSelect,
  fareDetails,
  isCalculating,
  tripType,
  tripMode,
  fareSource
}: CabOptionCardProps) {
  return (
    <Card className={cn(
      "cursor-pointer transition-all",
      isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"
    )}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{cab.name}</h3>
            <p className="text-sm text-gray-600">{cab.capacity} seats</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{fareDetails}</p>
            <Button
              onClick={onSelect}
              variant={isSelected ? "default" : "outline"}
              disabled={isCalculating}
            >
              {isSelected ? "Selected" : "Select"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
