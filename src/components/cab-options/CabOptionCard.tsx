
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Luggage, Zap, Star } from "lucide-react";
import { CabType } from '@/types/cab';

interface CabOptionCardProps {
  cab: CabType;
  fare: number;
  fareDetails: string;
  isCalculating: boolean;
  onSelect: () => void;
  isSelected?: boolean;
  tripType?: string;
}

export const CabOptionCard = ({ cab, fare, onSelect, isSelected = false, fareDetails, isCalculating }: CabOptionCardProps) => {
  const formatPrice = (price: number) => {
    if (isCalculating) return '...';
    if (!price || isNaN(price)) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
      isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
    }`} onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <img
              src={cab.image}
              alt={cab.name}
              className="w-20 h-14 object-cover rounded"
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
                  <span>{cab.capacity}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Luggage className="w-4 h-4" />
                  <span>{cab.luggageCapacity || 2}</span>
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
          
          <div className="text-right flex-shrink-0 pl-2">
            <div className="text-2xl font-bold text-blue-600">
              {isCalculating ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                formatPrice(fare)
              )}
            </div>
            <div className="text-xs text-gray-500">{fareDetails}</div>
          </div>
        </div>

        {cab.amenities && cab.amenities.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {cab.amenities.slice(0, 4).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {cab.amenities.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{cab.amenities.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-blue-500">
            <Star className="w-4 w-4 fill-current" />
            <span className="text-sm font-medium">4.5</span>
            <span className="text-xs text-gray-500">(120+ rides)</span>
          </div>
          
          <Button 
            size="sm" 
            variant={isSelected ? "default" : "outline"}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            disabled={isCalculating}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
