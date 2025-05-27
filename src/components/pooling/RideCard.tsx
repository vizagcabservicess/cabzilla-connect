
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock, Users, Star, Car, Info } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';

interface RideCardProps {
  ride: PoolingRide;
  onBook: (ride: PoolingRide) => void;
  onViewDetails: (ride: PoolingRide) => void;
}

export const RideCard: React.FC<RideCardProps> = ({ ride, onBook, onViewDetails }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bus': return '🚌';
      case 'shared-taxi': return '🚕';
      default: return '🚗';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'full': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                <Car className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getTypeIcon(ride.type)}</span>
                <h3 className="font-semibold">{ride.providerName}</h3>
                {ride.providerRating && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {ride.providerRating.toFixed(1)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 capitalize">{ride.type.replace('-', ' ')}</p>
            </div>
          </div>

          <Badge className={getStatusColor(ride.status)}>
            {ride.status}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span>{ride.fromLocation} → {ride.toLocation}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>{new Date(ride.departureTime).toLocaleString()}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-gray-500" />
            <span>{ride.availableSeats} of {ride.totalSeats} seats available</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-gray-500" />
            <span>{ride.vehicleInfo.make} {ride.vehicleInfo.model} - {ride.vehicleInfo.color}</span>
          </div>
        </div>

        {ride.amenities && ride.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {ride.amenities.slice(0, 3).map((amenity, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {ride.amenities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{ride.amenities.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              ₹{ride.pricePerSeat}
            </p>
            <p className="text-sm text-gray-600">per seat</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewDetails(ride)}>
              <Info className="h-4 w-4 mr-1" />
              Details
            </Button>
            <Button 
              size="sm" 
              onClick={() => onBook(ride)}
              disabled={ride.availableSeats === 0 || ride.status !== 'active'}
            >
              Book Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
