
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock, Users, Star, Car, Phone, Shield, CheckCircle } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';

interface RideDetailsModalProps {
  ride: PoolingRide | null;
  open: boolean;
  onClose: () => void;
  onBook: (ride: PoolingRide) => void;
}

export const RideDetailsModal: React.FC<RideDetailsModalProps> = ({
  ride,
  open,
  onClose,
  onBook
}) => {
  if (!ride) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bus': return '🚌';
      case 'shared-taxi': return '🚕';
      default: return '🚗';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ride Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Provider Info */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarFallback>
                <Car className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getTypeIcon(ride.type)}</span>
                <h3 className="text-xl font-semibold">{ride.providerName}</h3>
                {ride.providerRating && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {ride.providerRating.toFixed(1)}
                  </Badge>
                )}
              </div>
              
              <p className="text-gray-600 capitalize mb-2">{ride.type.replace('-', ' ')}</p>
              
              {ride.totalRides && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  {ride.totalRides} completed rides
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">₹{ride.pricePerSeat}</p>
              <p className="text-sm text-gray-600">per seat</p>
            </div>
          </div>

          {/* Route Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Route Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-medium">From: {ride.fromLocation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span className="font-medium">To: {ride.toLocation}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Departure: {new Date(ride.departureTime).toLocaleString()}</span>
                </div>
                {ride.arrivalTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span>Arrival: {new Date(ride.arrivalTime).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Vehicle Information</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Make & Model:</span>
                <p className="font-medium">{ride.vehicleInfo.make} {ride.vehicleInfo.model}</p>
              </div>
              <div>
                <span className="text-gray-600">Color:</span>
                <p className="font-medium">{ride.vehicleInfo.color}</p>
              </div>
              <div>
                <span className="text-gray-600">Plate Number:</span>
                <p className="font-medium">{ride.vehicleInfo.plateNumber}</p>
              </div>
              <div>
                <span className="text-gray-600">Seats:</span>
                <p className="font-medium">{ride.availableSeats} of {ride.totalSeats} available</p>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {ride.amenities && ride.amenities.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {ride.amenities.map((amenity, index) => (
                  <Badge key={index} variant="outline">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {ride.rules && ride.rules.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Rules & Guidelines
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {ride.rules.map((rule, index) => (
                  <li key={index} className="text-gray-600">{rule}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Route Stops */}
          {ride.route && ride.route.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Route Stops</h4>
              <div className="space-y-2">
                {ride.route.map((stop, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>{stop}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button 
              onClick={() => onBook(ride)} 
              className="flex-1"
              disabled={ride.availableSeats === 0 || ride.status !== 'active'}
            >
              Book This Ride
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
