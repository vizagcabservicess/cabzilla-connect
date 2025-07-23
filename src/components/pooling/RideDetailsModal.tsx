import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Car, Bus, User, Star, Clock, Users, MapPin, 
  Shield, Wifi, Music, Coffee, Phone, Mail 
} from 'lucide-react';
import { PoolingRide } from '@/types/pooling';
import { format } from 'date-fns';

interface RideDetailsModalProps {
  ride: PoolingRide | null;
  open: boolean;
  onClose: () => void;
  onBook: (ride: PoolingRide) => void;
}

function safeToFixed(value, digits = 2, fallback = '0.00') {
  const num = Number(value);
  return isNaN(num) ? fallback : num.toFixed(digits);
}

function isValidDateString(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function RideDetailsModal({ ride, open, onClose, onBook }: RideDetailsModalProps) {
  if (!ride) return null;

  const getRideTypeIcon = () => {
    switch (ride.type) {
      case 'car': return <Car className="h-5 w-5" />;
      case 'bus': return <Bus className="h-5 w-5" />;
      case 'shared-taxi': return <User className="h-5 w-5" />;
    }
  };

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return <Wifi className="h-4 w-4" />;
    if (amenityLower.includes('music') || amenityLower.includes('audio')) return <Music className="h-4 w-4" />;
    if (amenityLower.includes('coffee') || amenityLower.includes('refreshment')) return <Coffee className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-base font-semibold">
            {getRideTypeIcon()}
            <span>{ride.fromLocation} → {ride.toLocation}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Departure</p>
              <p className="text-lg font-semibold">
                {isValidDateString(ride.departureTime) ? format(new Date(ride.departureTime), 'MMM dd, yyyy HH:mm') : 'Time not specified'}
              </p>
              <p className="text-gray-600">{ride.fromLocation}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Arrival</p>
              <p className="text-lg font-semibold">
                {isValidDateString(ride.arrivalTime)
                  ? format(new Date(ride.arrivalTime), 'MMM dd, yyyy HH:mm')
                  : 'Time not specified'
                }
              </p>
              <p className="text-gray-600">{ride.toLocation}</p>
            </div>
          </div>

          <Separator />

          {/* Provider Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Provider Information</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{ride.providerName}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{ride.providerPhone}</span>
                </div>
                {ride.providerRating && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{safeToFixed(ride.providerRating, 1, '0.0')}</span>
                    <span className="text-sm text-gray-600">rating</span>
                  </div>
                )}
              </div>
              <Badge variant="outline" className="capitalize">
                {ride.type === 'shared-taxi' ? 'Shared Taxi' : ride.type === 'car' ? 'Car Pool' : 'Bus'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Vehicle Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Vehicle Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Vehicle</p>
                <p>{ride.vehicleInfo.make} {ride.vehicleInfo.model}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Color</p>
                <p>{ride.vehicleInfo.color || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Plate Number</p>
                <p>{ride.vehicleInfo.plateNumber || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Available Seats</p>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{ride.availableSeats} of {ride.totalSeats}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Route */}
          {ride.route && ride.route.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Route Details</h3>
                <div className="flex items-center space-x-1 mb-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Stops along the way:</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {ride.route.map((stop, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{stop}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Amenities */}
          {ride.amenities && ride.amenities.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ride.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {getAmenityIcon(amenity)}
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Rules */}
          {ride.rules && ride.rules.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Ride Rules</h3>
                <ul className="space-y-1">
                  {ride.rules.map((rule, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-sm text-gray-600">•</span>
                      <span className="text-sm">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
            </>
          )}

          {/* Pricing */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Price per seat</p>
                <p className="text-2xl font-bold text-green-600">₹{ride.pricePerSeat}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant={ride.status === 'active' ? 'default' : 'secondary'}>
                  {ride.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button 
              onClick={() => onBook(ride)} 
              disabled={ride.availableSeats === 0 || ride.status !== 'active'}
              className="flex-1"
            >
              {ride.availableSeats === 0 ? 'Fully Booked' : 'Request Ride'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
