
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Users, MapPin } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';
import { format } from 'date-fns';

interface RideCardProps {
  ride: PoolingRide;
  onBook: (ride: PoolingRide) => void;
  onViewDetails: (ride: PoolingRide) => void;
}

export function RideCard({ ride, onBook, onViewDetails }: RideCardProps) {
  const departureTime = new Date(ride.departureTime);
  const arrivalTime = ride.arrivalTime ? new Date(ride.arrivalTime) : null;

  const getRideTypeIcon = () => {
    switch (ride.type) {
      case 'car':
        return '🚗';
      case 'bus':
        return '🚌';
      case 'shared-taxi':
        return '🚕';
      default:
        return '🚗';
    }
  };

  const getRideTypeColor = () => {
    switch (ride.type) {
      case 'car':
        return 'bg-blue-100 text-blue-800';
      case 'bus':
        return 'bg-green-100 text-green-800';
      case 'shared-taxi':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getRideTypeIcon()}</span>
            <div>
              <Badge className={getRideTypeColor()}>
                {ride.type === 'shared-taxi' ? 'Shared Taxi' : ride.type === 'car' ? 'Car Pool' : 'Bus'}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">
                {ride.vehicleInfo.make} {ride.vehicleInfo.model}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">₹{ride.pricePerSeat}</p>
            <p className="text-sm text-gray-600">per seat</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-lg font-semibold">{format(departureTime, 'HH:mm')}</p>
              <p className="text-sm text-gray-600">{ride.fromLocation}</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <div className="h-0.5 w-16 bg-gray-300"></div>
                <Clock className="h-4 w-4 text-gray-400" />
                <div className="h-0.5 w-16 bg-gray-300"></div>
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">
                {arrivalTime ? format(arrivalTime, 'HH:mm') : '--:--'}
              </p>
              <p className="text-sm text-gray-600">{ride.toLocation}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {ride.availableSeats} of {ride.totalSeats} seats available
              </span>
            </div>
            {ride.providerRating && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{ride.providerRating}</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            by {ride.providerName}
          </div>
        </div>

        {ride.route && ride.route.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-1 mb-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Route:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {ride.route.map((stop, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {stop}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {ride.amenities && ride.amenities.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Amenities:</p>
            <div className="flex flex-wrap gap-1">
              {ride.amenities.map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => onViewDetails(ride)} className="flex-1">
            View Details
          </Button>
          <Button 
            onClick={() => onBook(ride)} 
            disabled={ride.availableSeats === 0}
            className="flex-1"
          >
            {ride.availableSeats === 0 ? 'Fully Booked' : 'Book Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
