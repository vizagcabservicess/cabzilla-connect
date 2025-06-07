
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Users, Star, Car, Bus, UserCheck, IndianRupee } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';

interface EnhancedRideCardProps {
  ride: PoolingRide;
  onRequestRide: (ride: PoolingRide) => void;
  requestedSeats: number;
}

export function EnhancedRideCard({ ride, onRequestRide, requestedSeats }: EnhancedRideCardProps) {
  const getVehicleIcon = () => {
    switch (ride.type) {
      case 'car': return <Car className="h-4 w-4" />;
      case 'bus': return <Bus className="h-4 w-4" />;
      case 'shared-taxi': return <Users className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const getVehicleTypeLabel = () => {
    switch (ride.type) {
      case 'car': return 'Car Pool';
      case 'bus': return 'Bus';
      case 'shared-taxi': return 'Shared Taxi';
      default: return 'Vehicle';
    }
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {getVehicleIcon()}
              {getVehicleTypeLabel()}
            </Badge>
            {ride.providerRating && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {ride.providerRating.toFixed(1)}
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600 flex items-center">
              <IndianRupee className="h-5 w-5" />
              {ride.pricePerSeat}
            </div>
            <div className="text-sm text-gray-500">per seat</div>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2 flex-1">
            <MapPin className="h-4 w-4 text-blue-600" />
            <div>
              <div className="font-semibold text-gray-900">{ride.fromLocation}</div>
              <div className="text-sm text-gray-500">{formatDate(ride.departureTime)}</div>
            </div>
          </div>
          
          <div className="flex-shrink-0 px-3 py-1 bg-gray-100 rounded-full">
            <div className="w-8 h-0.5 bg-gray-400"></div>
          </div>
          
          <div className="flex items-center space-x-2 flex-1">
            <MapPin className="h-4 w-4 text-red-600" />
            <div>
              <div className="font-semibold text-gray-900">{ride.toLocation}</div>
              <div className="text-sm text-gray-500">
                {ride.arrivalTime ? formatDate(ride.arrivalTime) : 'Same day'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 py-3 bg-gray-50 rounded-lg px-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium">Departure</div>
              <div className="text-sm text-gray-600">{formatTime(ride.departureTime)}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium">Available</div>
              <div className="text-sm text-gray-600">{ride.availableSeats} seats</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium">Provider</div>
              <div className="text-sm text-gray-600">{ride.providerName}</div>
            </div>
          </div>
        </div>

        {ride.vehicleInfo && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">Vehicle Details</div>
            <div className="text-sm text-blue-700">
              {ride.vehicleInfo.make} {ride.vehicleInfo.model} • {ride.vehicleInfo.color} • {ride.vehicleInfo.plateNumber}
            </div>
          </div>
        )}

        {ride.amenities && ride.amenities.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Amenities</div>
            <div className="flex flex-wrap gap-1">
              {ride.amenities.map((amenity, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">₹{ride.pricePerSeat * requestedSeats}</span> for {requestedSeats} seat(s)
          </div>
          <Button 
            onClick={() => onRequestRide(ride)}
            disabled={ride.availableSeats < requestedSeats}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {ride.availableSeats < requestedSeats ? 'Not Available' : 'Request Booking'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
