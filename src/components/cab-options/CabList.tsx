import React, { useEffect, useState } from 'react';
import { CabType } from '@/types/cab';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  cabErrors?: Record<string, string>;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  tripType?: string;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  cabFares,
  isCalculatingFares,
  cabErrors = {},
  handleSelectCab,
  getFareDetails,
  tripType
}) => {
  const [localFares, setLocalFares] = useState<Record<string, number>>(cabFares);
  
  // Listen for fare update events to keep the displayed prices in sync
  useEffect(() => {
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare } = customEvent.detail;
        
        // Only update if this is for the current trip type
        if (customEvent.detail.tripType === tripType) {
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          console.log(`CabList: Updated fare for ${cabId} to ${fare} from event`);
        }
      }
    };
    
    // Listen for fare calculation events
    window.addEventListener('fare-calculated', handleFareCalculated);
    
    // Clean up
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated);
    };
  }, [tripType]);
  
  // Update local fares when props change
  useEffect(() => {
    setLocalFares(cabFares);
  }, [cabFares]);
  
  // Format price with Indian Rupee symbol
  const formatPrice = (price?: number) => {
    if (!price && price !== 0) return "Price unavailable";
    return `₹${price.toLocaleString('en-IN')}`;
  };

  // If no vehicles are available
  if (cabTypes.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-lg font-semibold">No vehicles available</p>
        <p className="text-muted-foreground">Please try selecting a different trip type.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cabTypes.map((cab) => {
        const isSelected = selectedCabId === cab.id;
        const cabId = cab.id.toLowerCase().replace(/\s+/g, '_');
        const cabFare = localFares[cabId] || cabFares[cab.id] || 0;
        const hasError = cabErrors[cab.id];
        
        return (
          <Card
            key={cab.id}
            className={`relative border overflow-hidden transition-all duration-200 h-full ${
              isSelected
                ? "border-primary shadow-md ring-1 ring-primary"
                : "hover:border-primary/50 hover:shadow-sm"
            }`}
          >
            <CardContent className="p-4 h-full flex flex-col">
              <div className="relative mb-4 pb-[56.25%] overflow-hidden rounded-md bg-muted">
                <img
                  src={cab.image || "/cars/sedan.png"}
                  alt={cab.name}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                />
              </div>

              <h3 className="text-lg font-semibold leading-tight">{cab.name}</h3>
              <p className="text-muted-foreground text-sm mb-2">
                {getFareDetails(cab)}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-secondary/40 rounded px-2 py-1">
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="font-medium">{cab.capacity} People</p>
                </div>
                <div className="bg-secondary/40 rounded px-2 py-1">
                  <p className="text-xs text-muted-foreground">Luggage</p>
                  <p className="font-medium">{cab.luggageCapacity} Bags</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-auto mb-3">
                {cab.amenities?.slice(0, 3).map((amenity, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-secondary/40 rounded-full"
                  >
                    {amenity}
                  </span>
                ))}
                {cab.amenities && cab.amenities.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-secondary/40 rounded-full">
                    +{cab.amenities.length - 3} more
                  </span>
                )}
              </div>

              <div
                onClick={() => !isCalculatingFares && handleSelectCab(cab)}
                className={`flex items-center justify-between p-3 mt-auto w-full rounded-md cursor-pointer transition-colors font-medium ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <span>
                  {isSelected ? "Selected" : "Select"}
                </span>
                <span className="font-semibold">
                  {isCalculatingFares ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasError ? (
                    <span className="text-xs text-destructive">{hasError}</span>
                  ) : cabFare > 0 ? (
                    formatPrice(cabFare)
                  ) : (
                    <span className="text-xs">Getting price...</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
