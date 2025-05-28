
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Users, MapPin, Car, Bus, User } from 'lucide-react';
import { PoolingRide, RideRequest } from '@/types/pooling';
import { format } from 'date-fns';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

interface EnhancedRideCardProps {
  ride: PoolingRide;
  onRequestSent: (rideId: number, request: Omit<RideRequest, 'id' | 'requestedAt'>) => Promise<void>;
  onViewDetails: (ride: PoolingRide) => void;
}

export function EnhancedRideCard({ ride, onRequestSent, onViewDetails }: EnhancedRideCardProps) {
  const { user, isAuthenticated } = usePoolingAuth();
  const [isRequesting, setIsRequesting] = React.useState(false);

  const getRideTypeIcon = () => {
    switch (ride.type) {
      case 'car': return <Car className="h-5 w-5" />;
      case 'bus': return <Bus className="h-5 w-5" />;
      case 'shared-taxi': return <User className="h-5 w-5" />;
    }
  };

  const getRideTypeColor = () => {
    switch (ride.type) {
      case 'car': return 'bg-blue-100 text-blue-800';
      case 'bus': return 'bg-green-100 text-green-800';
      case 'shared-taxi': return 'bg-purple-100 text-purple-800';
    }
  };

  const getRideTypeName = () => {
    switch (ride.type) {
      case 'car': return 'Car Pool';
      case 'bus': return 'Bus';
      case 'shared-taxi': return 'Shared Taxi';
    }
  };

  const handleRequestRide = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to request a ride');
      return;
    }

    try {
      setIsRequesting(true);
      
      const request: Omit<RideRequest, 'id' | 'requestedAt'> = {
        rideId: ride.id,
        guestId: user.id,
        guestName: user.name,
        guestPhone: user.phone,
        guestEmail: user.email,
        seatsRequested: 1, // Default to 1 seat
        status: 'pending',
        requestMessage: 'I would like to join this ride'
      };

      await onRequestSent(ride.id, request);
    } catch (error) {
      console.error('Failed to send ride request:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const canRequestRide = () => {
    return isAuthenticated && 
           user?.role === 'guest' && 
           ride.availableSeats > 0 && 
           ride.status === 'active' &&
           user.id !== ride.providerId;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
              {getRideTypeIcon()}
            </div>
            <div>
              <Badge className={getRideTypeColor()}>
                {getRideTypeName()}
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

        {/* Route and Time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-lg font-semibold">
                {format(new Date(ride.departureTime), 'HH:mm')}
              </p>
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
                {ride.arrivalTime ? format(new Date(ride.arrivalTime), 'HH:mm') : '--:--'}
              </p>
              <p className="text-sm text-gray-600">{ride.toLocation}</p>
            </div>
          </div>
        </div>

        {/* Provider and Seats Info */}
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
                <span className="text-sm font-medium">{ride.providerRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            by {ride.providerName}
          </div>
        </div>

        {/* Route Stops */}
        {ride.route && ride.route.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-1 mb-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Route:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {ride.route.slice(0, 3).map((stop, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {stop}
                </Badge>
              ))}
              {ride.route.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{ride.route.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Amenities */}
        {ride.amenities && ride.amenities.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Amenities:</p>
            <div className="flex flex-wrap gap-1">
              {ride.amenities.slice(0, 3).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {ride.amenities.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{ride.amenities.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => onViewDetails(ride)} className="flex-1">
            View Details
          </Button>
          {canRequestRide() ? (
            <Button 
              onClick={handleRequestRide} 
              disabled={isRequesting}
              className="flex-1"
            >
              {isRequesting ? 'Requesting...' : 'Request Ride'}
            </Button>
          ) : (
            <Button 
              disabled 
              className="flex-1"
            >
              {ride.availableSeats === 0 ? 'Fully Booked' : 
               !isAuthenticated ? 'Login to Request' :
               user?.role !== 'guest' ? 'Guests Only' :
               user?.id === ride.providerId ? 'Your Ride' : 'Unavailable'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
