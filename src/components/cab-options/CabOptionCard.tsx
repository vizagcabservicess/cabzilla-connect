import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Luggage, Zap, Star } from "lucide-react";
import { CabType } from '@/types/cab';

interface CabOptionCardProps {
  cab: CabType;
  onSelect: (cab: CabType) => void;
  isSelected?: boolean;
}

export const CabOptionCard = ({ cab, onSelect, isSelected = false }: CabOptionCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
      isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
    }`} onClick={() => onSelect(cab)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <img
              src={cab.image}
              alt={cab.name}
              className="w-16 h-12 object-cover rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/cars/sedan.png';
              }}
            />
            <div>
              <h3 className="font-semibold text-lg">{cab.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
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
          
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {formatPrice(cab.price)}
            </div>
            <div className="text-xs text-gray-500">Total fare</div>
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
              onSelect(cab);
            }}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
