
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, 
  Clock, 
  Users, 
  Star, 
  Car, 
  Info,
  UserPlus,
  Eye
} from 'lucide-react';
import { PoolingRide } from '@/types/pooling';

interface RideCardProps {
  ride: PoolingRide;
  onBook: (ride: PoolingRide) => void;
  onViewDetails: (ride: PoolingRide) => void;
  isGuest?: boolean;
}

export const RideCard: React.FC<RideCardProps> = ({ 
  ride, 
  onBook, 
  onViewDetails,
  isGuest = false 
}) => {
  const departureTime = new Date(ride.departureTime);
  const isFullyBooked = ride.availableSeats === 0;
  
  const getVehicleTypeIcon = () => {
    switch (ride.type) {
      case 'bus':
        return '🚌';
      case 'shared-taxi':
        return '🚕';
      default:
        return '🚗';
    }
  };

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Provider Info */}
          <div className="flex items-center gap-3 min-w-0 lg:w-48">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                <Car className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{ride.providerName}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{ride.providerRating?.toFixed(1) || 'New'}</span>
                <span>•</span>
                <span>{ride.totalRides || 0} rides</span>
              </div>
            </div>
          </div>

          {/* Route Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getVehicleTypeIcon()}</span>
              <Badge variant="outline" className="text-xs">
                {ride.type.replace('-', ' ').toUpperCase()}
              </Badge>
              <Badge 
                variant={isFullyBooked ? "destructive" : "secondary"}
                className="text-xs"
              >
                {isFullyBooked ? 'FULL' : ride.status.toUpperCase()}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{ride.fromLocation}</span>
                <span>→</span>
                <span className="truncate">{ride.toLocation}</span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{departureTime.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>{ride.availableSeats} of {ride.totalSeats} seats available</span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-600">
                <Car className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {ride.vehicleInfo.make} {ride.vehicleInfo.model}
                </span>
              </div>
            </div>

            {/* Route Stops */}
            {ride.route && ride.route.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  Via: {ride.route.join(' → ')}
                </p>
              </div>
            )}

            {/* Amenities */}
            {ride.amenities && ride.amenities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {ride.amenities.slice(0, 3).map((amenity) => (
                  <Badge key={amenity} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {ride.amenities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{ride.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Price and Actions */}
          <div className="flex flex-col items-end gap-3 lg:w-48">
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                ₹{ride.pricePerSeat}
              </div>
              <p className="text-xs text-gray-500">per seat</p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(ride)}
                className="flex items-center gap-1"
              >
                <Eye className="h-4 w-4" />
                Details
              </Button>
              
              <Button
                onClick={() => onBook(ride)}
                disabled={isFullyBooked}
                className="flex items-center gap-1"
                size="sm"
              >
                {isGuest ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Request
                  </>
                ) : (
                  <>
                    <Car className="h-4 w-4" />
                    Book
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Info for Guests */}
        {isGuest && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How it works:</p>
                  <ol className="text-xs space-y-1">
                    <li>1. Send a request to join this ride</li>
                    <li>2. Wait for provider approval</li>
                    <li>3. Pay securely once approved</li>
                    <li>4. Get contact details and join the ride</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
