
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Users, Car, Clock, MapPin } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';
import { format } from 'date-fns';

interface RideCardProps {
  ride: PoolingRide;
  onBook: (ride: PoolingRide) => void;
  onViewDetails: (ride: PoolingRide) => void;
}

export function RideCard({ ride, onBook, onViewDetails }: RideCardProps) {
  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'HH:mm');
  };

  const getRideTypeIcon = () => {
    switch (ride.type) {
      case 'bus':
        return <Car className="h-4 w-4" />;
      case 'car':
        return <Car className="h-4 w-4" />;
      case 'shared-taxi':
        return <Car className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const getRideTypeLabel = () => {
    switch (ride.type) {
      case 'bus':
        return 'Bus';
      case 'car':
        return 'Car Pool';
      case 'shared-taxi':
        return 'Shared Taxi';
      default:
        return 'Ride';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Section - Route & Time */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="flex items-center gap-1">
                {getRideTypeIcon()}
                {getRideTypeLabel()}
              </Badge>
              <Badge variant={ride.availableSeats > 0 ? 'default' : 'secondary'}>
                {ride.availableSeats} seats available
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="font-semibold text-lg">{formatTime(ride.departureTime)}</div>
                <div className="text-sm text-gray-600">{ride.fromLocation}</div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-px bg-gray-300"></div>
                <Clock className="mx-2 h-4 w-4 text-gray-400" />
                <div className="w-8 h-px bg-gray-300"></div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">
                  {ride.arrivalTime ? formatTime(ride.arrivalTime) : '--:--'}
                </div>
                <div className="text-sm text-gray-600">{ride.toLocation}</div>
              </div>
            </div>

            {ride.route && ride.route.length > 0 && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-3 w-3 mr-1" />
                <span>Via: {ride.route.slice(0, 2).join(', ')}</span>
                {ride.route.length > 2 && <span> +{ride.route.length - 2} more</span>}
              </div>
            )}
          </div>

          {/* Center Section - Provider Info */}
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>{ride.providerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{ride.providerName}</div>
              {ride.providerRating && (
                <div className="flex items-center text-sm text-gray-600">
                  <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {ride.providerRating.toFixed(1)}
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Price & Actions */}
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              ₹{ride.pricePerSeat}
            </div>
            <div className="text-sm text-gray-600">per seat</div>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={() => onBook(ride)}
                disabled={ride.availableSeats === 0}
                className="w-full"
              >
                {ride.availableSeats === 0 ? 'Fully Booked' : 'Book Now'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onViewDetails(ride)}
                className="w-full"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>

        {/* Vehicle & Amenities Info */}
        {(ride.vehicleInfo || ride.amenities) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {ride.vehicleInfo.make && (
                <span>{ride.vehicleInfo.make} {ride.vehicleInfo.model}</span>
              )}
              {ride.vehicleInfo.color && (
                <span>• {ride.vehicleInfo.color}</span>
              )}
              {ride.amenities && ride.amenities.length > 0 && (
                <span>• {ride.amenities.join(', ')}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
