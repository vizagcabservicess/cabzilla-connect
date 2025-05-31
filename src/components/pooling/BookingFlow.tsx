
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, CreditCard, Calendar, MapPin } from 'lucide-react';
import { PoolingRide, PoolingBooking } from '@/types/pooling';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BookingFlowProps {
  ride: PoolingRide;
  onBookingComplete: (booking: PoolingBooking) => void;
  onCancel: () => void;
}

export function BookingFlow({ ride, onBookingComplete, onCancel }: BookingFlowProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    passengerName: '',
    passengerPhone: '',
    passengerEmail: '',
    seatsBooked: 1,
    specialRequests: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = formData.seatsBooked * ride.pricePerSeat;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBookingSubmit = async () => {
    try {
      setIsProcessing(true);

      const booking: PoolingBooking = {
        id: Date.now(),
        userId: 1, // Mock user ID
        rideId: ride.id,
        passengerName: formData.passengerName,
        passengerPhone: formData.passengerPhone,
        passengerEmail: formData.passengerEmail,
        seatsBooked: formData.seatsBooked,
        totalAmount,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        bookingDate: new Date().toISOString(),
        canCancelFree: true
      };

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success('Booking completed successfully!');
      onBookingComplete(booking);
    } catch (error) {
      toast.error('Failed to complete booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = formData.passengerName && formData.passengerPhone && formData.passengerEmail;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
              <span className="text-sm font-medium">Details</span>
            </div>
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
              <span className="text-sm font-medium">Confirm</span>
            </div>
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
              <span className="text-sm font-medium">Payment</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ride Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ride Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{ride.fromLocation} → {ride.toLocation}</span>
              </div>
              <Badge>{ride.type === 'car' ? 'Car Pool' : ride.type === 'bus' ? 'Bus' : 'Shared Taxi'}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{format(new Date(ride.departureTime), 'PPP p')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Price per seat</span>
              <span className="font-medium">₹{ride.pricePerSeat}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Passenger Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Passenger Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="passengerName">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="passengerName"
                  placeholder="Enter your full name"
                  value={formData.passengerName}
                  onChange={(e) => handleInputChange('passengerName', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="passengerPhone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="passengerPhone"
                  placeholder="+91 9999999999"
                  value={formData.passengerPhone}
                  onChange={(e) => handleInputChange('passengerPhone', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="passengerEmail">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="passengerEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.passengerEmail}
                  onChange={(e) => handleInputChange('passengerEmail', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="seatsBooked">Number of Seats</Label>
              <Input
                id="seatsBooked"
                type="number"
                min="1"
                max={ride.availableSeats}
                value={formData.seatsBooked}
                onChange={(e) => handleInputChange('seatsBooked', parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
              <Textarea
                id="specialRequests"
                placeholder="Any special requirements..."
                value={formData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!isFormValid}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Booking Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Passenger:</span>
                <span className="font-medium">{formData.passengerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span className="font-medium">{formData.passengerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-medium">{formData.passengerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span>Seats:</span>
                <span className="font-medium">{formData.seatsBooked}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleBookingSubmit}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : 'Confirm Booking'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
