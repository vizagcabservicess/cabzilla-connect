
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Luggage, Wind, Music, Fuel } from 'lucide-react';
import { CabType } from '@/types/cab';

interface CabOptionCardProps {
  cab: CabType;
  onSelect: (cab: CabType) => void;
  isSelected?: boolean;
}

export const CabOptionCard: React.FC<CabOptionCardProps> = ({
  cab,
  onSelect,
  isSelected = false
}) => {
  const handleSelect = () => {
    onSelect(cab);
  };

  const features = [
    { icon: Wind, label: 'AC' },
    { icon: Music, label: 'Music System' },
    { icon: Fuel, label: 'Fuel Included' }
  ];

  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Vehicle Image */}
          <div className="w-24 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {cab.image ? (
              <img 
                src={cab.image} 
                alt={cab.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-xs">No Image</div>
            )}
          </div>

          {/* Vehicle Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{cab.name}</h3>
                <p className="text-sm text-gray-600">{cab.type}</p>
              </div>
              
              {/* Pricing */}
              <div className="text-right">
                {cab.discount && cab.discount > 0 && (
                  <div className="text-xs text-red-500 line-through">
                    ₹{cab.oldPrice || (cab.price + cab.discount)}
                  </div>
                )}
                <div className="text-lg font-bold text-blue-600">
                  ₹{cab.price}
                </div>
                {cab.discount && cab.discount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {cab.discount}% OFF
                  </Badge>
                )}
              </div>
            </div>

            {/* Vehicle Specs */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{cab.capacity} seats</span>
              </div>
              <div className="flex items-center gap-1">
                <Luggage className="h-4 w-4" />
                <span>{cab.luggage} bags</span>
              </div>
              {cab.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{cab.rating}</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="flex items-center gap-3 mb-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                  <feature.icon className="h-3 w-3" />
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <Button 
              onClick={handleSelect}
              className={`w-full ${isSelected ? 'bg-green-600 hover:bg-green-700' : ''}`}
              variant={isSelected ? 'default' : 'outline'}
            >
              {isSelected ? 'Selected' : 'Select Cab'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
