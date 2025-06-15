
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Luggage, Zap, Star } from "lucide-react";
import { CabType } from '@/types/cab';
import { Skeleton } from '@/components/ui/skeleton';

interface CabOptionCardProps {
  cab: CabType;
  onSelect: () => void;
  isSelected?: boolean;
  fare: number;
  isCalculating: boolean;
  fareDetails: string;
}

export const CabOptionCard = ({ cab, onSelect, isSelected = false, fare, isCalculating, fareDetails }: CabOptionCardProps) => {
  const formatPrice = (price: number) => {
    if (price <= 0) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card 
        className={`transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
        onClick={!isCalculating && fare > 0 ? onSelect : undefined}
        style={{ cursor: !isCalculating && fare > 0 ? 'pointer' : 'not-allowed' }}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
          <div className="flex items-center space-x-3 mb-3 sm:mb-0">
            <img
              src={cab.image}
              alt={cab.name}
              className="w-24 h-16 object-contain rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/cars/sedan.png';
              }}
            />
            <div>
              <h3 className="font-semibold text-lg">{cab.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{cab.capacity} Seats</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Luggage className="w-4 h-4" />
                  <span>{cab.luggageCapacity || 2} Bags</span>
                </span>
                {cab.ac && (
                  <span className="flex items-center space-x-1">
                    <Zap className="w-4 h-4" />
                    <span>AC</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right w-full sm:w-auto">
            {isCalculating ? (
               <div className="flex flex-col items-end">
                <Skeleton className="h-7 w-24 mb-1" />
                <Skeleton className="h-4 w-20" />
               </div>
            ) : (
                <>
                    <div className="text-2xl font-bold text-blue-600">
                        {formatPrice(fare)}
                    </div>
                    <div className="text-xs text-gray-500">{fare > 0 ? fareDetails : 'Price unavailable'}</div>
                </>
            )}
          </div>
        </div>

        {cab.amenities && cab.amenities.length > 0 && (
          <div className="py-2 border-t mt-2">
            <div className="flex flex-wrap gap-2">
              {cab.amenities.slice(0, 4).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs font-normal">
                  {amenity}
                </Badge>
              ))}
              {cab.amenities.length > 4 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  +{cab.amenities.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-1 text-yellow-500">
                <Star className="w-4 w-4 fill-current" />
                <span className="text-sm font-medium text-gray-700">4.5</span>
                <span className="text-xs text-gray-500">(120+ rides)</span>
            </div>
          
          <Button 
            size="sm" 
            variant={isSelected ? "default" : "outline"}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            disabled={isCalculating || fare <= 0}
          >
            {isCalculating ? 'Calculating...' : isSelected ? 'Selected' : 'Select Cab'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
