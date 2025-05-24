
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, Clock, Users, MapPin, Phone, Car, Shield } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';
import { format } from 'date-fns';

interface RideDetailsModalProps {
  ride: PoolingRide | null;
  open: boolean;
  onClose: () => void;
  onBook: (ride: PoolingRide) => void;
}

export function RideDetailsModal({ ride, open, onClose, onBook }: RideDetailsModalProps) {
  if (!ride) return null;

  const departureTime = new Date(ride.departureTime);
  const arrivalTime = ride.arrivalTime ? new Date(ride.arrivalTime) : null;

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Ride Details</span>
            <Badge className={getRideTypeColor()}>
              {ride.type === 'shared-taxi' ? 'Shared Taxi' : ride.type === 'car' ? 'Car Pool' : 'Bus'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Route and Time */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{format(departureTime, 'HH:mm')}</p>
                <p className="text-sm text-gray-600">{format(departureTime, 'MMM dd, yyyy')}</p>
                <p className="font-medium">{ride.fromLocation}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <div className="h-0.5 w-20 bg-gray-300"></div>
                <Clock className="h-5 w-5 text-gray-400" />
                <div className="h-0.5 w-20 bg-gray-300"></div>
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {arrivalTime ? format(arrivalTime, 'HH:mm') : '--:--'}
                </p>
                <p className="text-sm text-gray-600">
                  {arrivalTime ? format(arrivalTime, 'MMM dd, yyyy') : 'TBA'}
                </p>
                <p className="font-medium">{ride.toLocation}</p>
              </div>
            </div>
          </div>

          {/* Pricing and Availability */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600">₹{ride.pricePerSeat}</p>
              <p className="text-gray-600">per seat</p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1 mb-1">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{ride.availableSeats} seats available</span>
              </div>
              <p className="text-sm text-gray-600">out of {ride.totalSeats} total</p>
            </div>
          </div>

          <Separator />

          {/* Provider Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Provider Information</span>
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{ride.providerName}</p>
                {ride.providerRating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-medium">{ride.providerRating}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{ride.providerPhone}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center space-x-2">
              <Car className="h-5 w-5" />
              <span>Vehicle Information</span>
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Make & Model</p>
                  <p className="font-medium">
                    {ride.vehicleInfo.make} {ride.vehicleInfo.model}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Color</p>
                  <p className="font-medium">{ride.vehicleInfo.color}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Plate Number</p>
                  <p className="font-medium">{ride.vehicleInfo.plateNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Route Stops */}
          {ride.route && ride.route.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Route Stops</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {ride.route.map((stop, index) => (
                  <Badge key={index} variant="outline">
                    {stop}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {ride.amenities && ride.amenities.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {ride.amenities.map((amenity, index) => (
                  <Badge key={index} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {ride.rules && ride.rules.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Rules & Guidelines</span>
              </h3>
              <ul className="space-y-1">
                {ride.rules.map((rule, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button 
              onClick={() => {
                onBook(ride);
                onClose();
              }} 
              disabled={ride.availableSeats === 0}
              className="flex-1"
            >
              {ride.availableSeats === 0 ? 'Fully Booked' : 'Book This Ride'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
