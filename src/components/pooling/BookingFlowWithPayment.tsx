
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Clock, MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { PoolingRide, PoolingBooking } from '@/types/pooling';
import { poolingAPI } from '@/services/api/poolingAPI';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BookingFlowWithPaymentProps {
  ride: PoolingRide;
  onBookingComplete: (bookingData: PoolingBooking) => void;
  onCancel: () => void;
}

export function BookingFlowWithPayment({ ride, onBookingComplete, onCancel }: BookingFlowWithPaymentProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState({
    passengerName: '',
    passengerPhone: '',
    passengerEmail: '',
    seatsBooked: 1,
    specialRequests: '',
    agreeToTerms: false
  });
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');

  const totalAmount = bookingData.seatsBooked * ride.pricePerSeat;

  const handleBookingSubmit = async () => {
    if (!bookingData.agreeToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setIsSubmitting(true);
    setPaymentStatus('processing');

    try {
      // Create booking
      const booking = await poolingAPI.bookRide({
        userId: 1, // This would come from auth context
        rideId: ride.id,
        passengerName: bookingData.passengerName,
        passengerPhone: bookingData.passengerPhone,
        passengerEmail: bookingData.passengerEmail,
        seatsBooked: bookingData.seatsBooked,
        totalAmount,
        status: 'pending',
        paymentStatus: 'pending'
      });

      // Create payment order
      const orderData = await poolingAPI.createPaymentOrder(booking.id);

      // Initialize Razorpay payment
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'VizagUp Pooling',
        description: `${ride.fromLocation} to ${ride.toLocation}`,
        handler: async function (response: any) {
          try {
            // Verify payment
            await poolingAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            setPaymentStatus('success');
            toast.success('Payment successful! Booking confirmed.');
            
            setTimeout(() => {
              onBookingComplete({
                ...booking,
                paymentStatus: 'paid',
                status: 'confirmed'
              });
            }, 2000);

          } catch (error) {
            setPaymentStatus('failed');
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: bookingData.passengerName,
          email: bookingData.passengerEmail,
          contact: bookingData.passengerPhone
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setPaymentStatus('failed');
            setIsSubmitting(false);
          }
        }
      };

      // @ts-ignore - Razorpay is loaded externally
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Booking error:', error);
      setPaymentStatus('failed');
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const departureTime = new Date(ride.departureTime);

  if (paymentStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 mb-6">
          Your ride from {ride.fromLocation} to {ride.toLocation} has been booked successfully.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          You will receive a confirmation message on your registered phone number.
        </p>
        <Button onClick={() => onBookingComplete({} as PoolingBooking)}>
          View My Bookings
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="font-medium">Passenger Details</span>
        </div>
        <div className="h-0.5 w-16 bg-gray-300"></div>
        <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="font-medium">Payment</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Passenger Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={bookingData.passengerName}
                      onChange={(e) => setBookingData(prev => ({ ...prev, passengerName: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={bookingData.passengerPhone}
                      onChange={(e) => setBookingData(prev => ({ ...prev, passengerPhone: e.target.value }))}
                      placeholder="+91 9999999999"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={bookingData.passengerEmail}
                    onChange={(e) => setBookingData(prev => ({ ...prev, passengerEmail: e.target.value }))}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seats">Number of Seats</Label>
                  <Select 
                    value={bookingData.seatsBooked.toString()} 
                    onValueChange={(value) => setBookingData(prev => ({ ...prev, seatsBooked: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.min(ride.availableSeats, 6) }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'seat' : 'seats'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requests">Special Requests (Optional)</Label>
                  <Textarea
                    id="requests"
                    value={bookingData.specialRequests}
                    onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))}
                    placeholder="Any special requirements or requests..."
                    rows={3}
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={bookingData.agreeToTerms}
                    onCheckedChange={(checked) => setBookingData(prev => ({ ...prev, agreeToTerms: !!checked }))}
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed">
                    I agree to the terms and conditions, cancellation policy, and understand that payment will be processed upon confirmation.
                  </Label>
                </div>

                <Button 
                  onClick={() => setStep(2)}
                  disabled={!bookingData.passengerName || !bookingData.passengerPhone || !bookingData.passengerEmail || !bookingData.agreeToTerms}
                  className="w-full"
                >
                  Continue to Payment
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Complete Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">Name:</span> {bookingData.passengerName}</p>
                  <p><span className="font-medium">Phone:</span> {bookingData.passengerPhone}</p>
                  <p><span className="font-medium">Email:</span> {bookingData.passengerEmail}</p>
                  <p><span className="font-medium">Seats:</span> {bookingData.seatsBooked}</p>
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back to Details
                  </Button>
                  <Button 
                    onClick={handleBookingSubmit}
                    disabled={isSubmitting || paymentStatus === 'processing'}
                    className="flex-1"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isSubmitting || paymentStatus === 'processing' ? 'Processing...' : `Pay ₹${totalAmount}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ride Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Badge className={
                  ride.type === 'car' ? 'bg-blue-100 text-blue-800' :
                  ride.type === 'bus' ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }>
                  {ride.type === 'shared-taxi' ? 'Shared Taxi' : ride.type === 'car' ? 'Car Pool' : 'Bus'}
                </Badge>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{format(departureTime, 'MMM dd, yyyy • HH:mm')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{ride.fromLocation} → {ride.toLocation}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{ride.providerName}</span>
                    {ride.providerRating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-xs">{ride.providerRating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

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
                  <span className="text-green-600">₹{totalAmount}</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Secure payment via Razorpay
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
