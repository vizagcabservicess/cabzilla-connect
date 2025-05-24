
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';
import { format } from 'date-fns';

interface BookingFlowProps {
  ride: PoolingRide;
  onBookingComplete: (bookingData: any) => void;
  onCancel: () => void;
}

export function BookingFlow({ ride, onBookingComplete, onCancel }: BookingFlowProps) {
  const [passengers, setPassengers] = useState(1);
  const [passengerDetails, setPassengerDetails] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const totalAmount = ride.pricePerSeat * passengers;

  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'HH:mm');
  };

  const handleBooking = () => {
    const bookingData = {
      rideId: ride.id,
      passengers,
      passengerDetails,
      totalAmount,
      bookingDate: new Date().toISOString()
    };
    onBookingComplete(bookingData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Ride Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Booking Summary</span>
            <Badge variant="outline">{ride.type === 'car' ? 'Car Pool' : ride.type === 'bus' ? 'Bus' : 'Shared Taxi'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
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
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Provider: {ride.providerName}</span>
            <span className="flex items-center">
              <Phone className="h-3 w-3 mr-1" />
              {ride.providerPhone}
            </span>
          </div>

          {ride.vehicleInfo.make && (
            <div className="text-sm text-gray-600">
              Vehicle: {ride.vehicleInfo.make} {ride.vehicleInfo.model} ({ride.vehicleInfo.color})
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passenger Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Passengers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Number of Passengers</Label>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPassengers(Math.max(1, passengers - 1))}
                disabled={passengers <= 1}
              >
                -
              </Button>
              <span className="w-8 text-center">{passengers}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPassengers(Math.min(ride.availableSeats, passengers + 1))}
                disabled={passengers >= ride.availableSeats}
              >
                +
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Available seats: {ride.availableSeats}
          </div>
        </CardContent>
      </Card>

      {/* Passenger Details */}
      <Card>
        <CardHeader>
          <CardTitle>Passenger Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={passengerDetails.name}
              onChange={(e) => setPassengerDetails(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={passengerDetails.phone}
              onChange={(e) => setPassengerDetails(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={passengerDetails.email}
              onChange={(e) => setPassengerDetails(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
            />
          </div>
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Price per seat</span>
            <span>₹{ride.pricePerSeat}</span>
          </div>
          <div className="flex justify-between">
            <span>Number of passengers</span>
            <span>{passengers}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total Amount</span>
            <span>₹{totalAmount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleBooking} 
          className="flex-1"
          disabled={!passengerDetails.name || !passengerDetails.phone || !passengerDetails.email}
        >
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
