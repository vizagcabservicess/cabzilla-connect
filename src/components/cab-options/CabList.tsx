
import React from 'react';
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { CabType } from '@/types/cab';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  cabErrors?: Record<string, string>;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
}

export function CabList({
  cabTypes,
  selectedCabId,
  cabFares,
  cabErrors = {},
  isCalculatingFares,
  handleSelectCab,
  getFareDetails
}: CabListProps) {
  if (cabTypes.length === 0) {
    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          No cab options are currently available. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const formatPrice = (cabId: string) => {
    if (isCalculatingFares) {
      return <Skeleton className="h-6 w-24" />;
    }
    
    if (cabErrors[cabId]) {
      return (
        <span className="text-destructive flex items-center text-sm">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Price unavailable
        </span>
      );
    }
    
    const fare = cabFares[cabId];
    if (!fare || fare <= 0) {
      return <span className="text-muted-foreground">Price unavailable</span>;
    }
    
    return `₹${fare.toLocaleString('en-IN')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {cabTypes.map((cab) => (
        <Card
          key={cab.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedCabId === cab.id
              ? "ring-2 ring-primary shadow-sm"
              : "hover:border-primary/50"
          }`}
          onClick={() => {
            if (!cabErrors[cab.id]) {
              handleSelectCab(cab);
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-lg">{cab.name}</h3>
                <CardDescription>{getFareDetails(cab)}</CardDescription>
              </div>
              <img
                src={cab.image || `/cars/${cab.id.toLowerCase()}.png`}
                alt={cab.name}
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/cars/default-car.png';
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-muted rounded p-2 text-center">
                <span className="block text-xs text-muted-foreground">Capacity</span>
                <span className="font-medium">{cab.capacity} People</span>
              </div>
              <div className="bg-muted rounded p-2 text-center">
                <span className="block text-xs text-muted-foreground">Luggage</span>
                <span className="font-medium">{cab.luggageCapacity || 2} Bags</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-1">
                {cab.amenities?.slice(0, 2).map((amenity, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {cab.ac && (
                  <Badge variant="outline" className="text-xs">
                    AC
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">
                  {formatPrice(cab.id)}
                </div>
                {cabErrors[cab.id] ? (
                  <span className="text-xs text-destructive">{cabErrors[cab.id]}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Base price</span>
                )}
              </div>
            </div>

            {selectedCabId === cab.id && (
              <Badge className="mt-2 w-full flex items-center justify-center bg-primary text-primary-foreground">
                Selected
              </Badge>
            )}
            
            {cabErrors[cab.id] && (
              <div className="mt-2">
                <Alert variant="destructive" className="py-1 px-2">
                  <AlertTriangle className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    {cabErrors[cab.id] || "Price unavailable"}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
