
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Mail, CreditCard, Car } from 'lucide-react';
import { PoolingRide, PoolingBooking } from '@/types/pooling';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

interface BookingFlowProps {
  ride: PoolingRide;
  onBookingComplete: (bookingData: PoolingBooking) => void;
  onCancel: () => void;
}

export function BookingFlow({ ride, onBookingComplete, onCancel }: BookingFlowProps) {
  const { user } = usePoolingAuth();
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    passengerName: user?.name || '',
    passengerPhone: user?.phone || '',
    passengerEmail: user?.email || '',
    seatsBooked: 1,
    requestMessage: ''
  });

  const totalAmount = bookingData.seatsBooked * ride.pricePerSeat;

  const handleNextStep = () => {
    if (step === 1) {
      // Validate passenger details
      if (!bookingData.passengerName || !bookingData.passengerPhone || !bookingData.passengerEmail) {
        toast.error('Please fill in all passenger details');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Complete booking
      handleBookingSubmit();
    }
  };

  const handleBookingSubmit = () => {
    const booking: PoolingBooking = {
      id: Date.now(),
      userId: user?.id || 0,
      rideId: ride.id,
      ...bookingData,
      totalAmount,
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      bookingDate: new Date().toISOString(),
      canCancelFree: true,
      requestStatus: 'pending'
    };

    onBookingComplete(booking);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
            1
          </div>
          <span className="text-sm font-medium">Passenger Details</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
            2
          </div>
          <span className="text-sm font-medium">Review & Confirm</span>
        </div>
      </div>

      {/* Ride Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Car className="h-5 w-5" />
            <span>Ride Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">From</p>
              <p className="font-medium">{ride.fromLocation}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">To</p>
              <p className="font-medium">{ride.toLocation}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Departure</p>
              <p className="font-medium">{new Date(ride.departureTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Provider</p>
              <p className="font-medium">{ride.providerName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Passenger Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Passenger Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={bookingData.passengerName}
                onChange={(e) => setBookingData(prev => ({ ...prev, passengerName: e.target.value }))}
                placeholder="Enter passenger name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={bookingData.passengerPhone}
                  onChange={(e) => setBookingData(prev => ({ ...prev, passengerPhone: e.target.value }))}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={bookingData.passengerEmail}
                  onChange={(e) => setBookingData(prev => ({ ...prev, passengerEmail: e.target.value }))}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="seats">Number of Seats</Label>
              <Select 
                value={bookingData.seatsBooked.toString()} 
                onValueChange={(value) => setBookingData(prev => ({ ...prev, seatsBooked: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(ride.availableSeats, 6) }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'seat' : 'seats'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Message to Provider (Optional)</Label>
              <Textarea
                id="message"
                value={bookingData.requestMessage}
                onChange={(e) => setBookingData(prev => ({ ...prev, requestMessage: e.target.value }))}
                placeholder="Any special requests or information..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review & Confirm */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Review & Confirm</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Passenger Information</h3>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                <p><span className="font-medium">Name:</span> {bookingData.passengerName}</p>
                <p><span className="font-medium">Phone:</span> {bookingData.passengerPhone}</p>
                <p><span className="font-medium">Email:</span> {bookingData.passengerEmail}</p>
                <p><span className="font-medium">Seats:</span> {bookingData.seatsBooked}</p>
                {bookingData.requestMessage && (
                  <p><span className="font-medium">Message:</span> {bookingData.requestMessage}</p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Pricing Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Price per seat</span>
                  <span>₹{ride.pricePerSeat}</span>
                </div>
                <div className="flex justify-between">
                  <span>Number of seats</span>
                  <span>{bookingData.seatsBooked}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total Amount</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Important Notes:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your request will be sent to the provider for approval</li>
                <li>• Payment will be processed only after approval</li>
                <li>• You can cancel free of charge until the provider approves</li>
                <li>• Please be ready 15 minutes before departure time</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
            Back
          </Button>
        )}
        <Button onClick={handleNextStep} className="flex-1">
          {step === 1 ? 'Continue' : 'Send Request'}
        </Button>
      </div>
    </div>
  );
}
