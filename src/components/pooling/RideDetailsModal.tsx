
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
import { Star, Users, Clock, MapPin, Phone, Car, CheckCircle } from 'lucide-react';
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

  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'HH:mm');
  };

  const getRideTypeLabel = () => {
    switch (ride.type) {
      case 'bus': return 'Bus';
      case 'car': return 'Car Pool';
      case 'shared-taxi': return 'Shared Taxi';
      default: return 'Ride';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ride Details</span>
            <Badge variant="outline">{getRideTypeLabel()}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Route Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Route Information</h3>
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="font-semibold text-xl">{formatTime(ride.departureTime)}</div>
                <div className="text-gray-600">{ride.fromLocation}</div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-12 h-px bg-gray-300"></div>
                <Clock className="mx-3 h-5 w-5 text-gray-400" />
                <div className="w-12 h-px bg-gray-300"></div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-xl">
                  {ride.arrivalTime ? formatTime(ride.arrivalTime) : '--:--'}
                </div>
                <div className="text-gray-600">{ride.toLocation}</div>
              </div>
            </div>

            {ride.route && ride.route.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Route Stops</h4>
                <div className="flex flex-wrap gap-2">
                  {ride.route.map((stop, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {stop}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Provider Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Provider Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{ride.providerName}</span>
                {ride.providerRating && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-medium">{ride.providerRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                {ride.providerPhone}
              </div>
            </div>
          </div>

          <Separator />

          {/* Vehicle Information */}
          {ride.vehicleInfo && (ride.vehicleInfo.make || ride.vehicleInfo.model) && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Vehicle Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Car className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      {ride.vehicleInfo.make} {ride.vehicleInfo.model}
                    </span>
                  </div>
                  {ride.vehicleInfo.color && (
                    <div className="text-gray-600">Color: {ride.vehicleInfo.color}</div>
                  )}
                  {ride.vehicleInfo.plateNumber && (
                    <div className="text-gray-600">Plate: {ride.vehicleInfo.plateNumber}</div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Amenities */}
          {ride.amenities && ride.amenities.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {ride.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Rules */}
          {ride.rules && ride.rules.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Travel Rules</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {ride.rules.map((rule, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
            </>
          )}

          {/* Pricing & Booking */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">₹{ride.pricePerSeat}</div>
                <div className="text-sm text-gray-600">per seat</div>
              </div>
              <div className="text-right">
                <div className="flex items-center text-green-600">
                  <Users className="h-4 w-4 mr-1" />
                  <span className="font-medium">{ride.availableSeats} seats available</span>
                </div>
                <div className="text-sm text-gray-600">out of {ride.totalSeats} total seats</div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button 
                onClick={() => onBook(ride)} 
                disabled={ride.availableSeats === 0}
                className="flex-1"
              >
                {ride.availableSeats === 0 ? 'Fully Booked' : 'Book This Ride'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
