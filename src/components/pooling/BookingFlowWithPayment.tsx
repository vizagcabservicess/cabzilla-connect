
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide } from '@/types/pooling';
import { Loader2 } from 'lucide-react';

interface BookingFlowWithPaymentProps {
  ride: PoolingRide;
  onBookingComplete: (bookingId: number) => void;
  onCancel: () => void;
}

export const BookingFlowWithPayment: React.FC<BookingFlowWithPaymentProps> = ({
  ride,
  onBookingComplete,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    passengerName: '',
    passengerPhone: '',
    seatsBooked: 1,
    specialRequests: '',
    pickupPoint: '',
    dropPoint: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingData = {
        rideId: ride.id,
        userId: 1, // This should come from auth context
        userName: formData.passengerName,
        userPhone: formData.passengerPhone,
        userEmail: 'user@example.com', // This should come from auth context
        seatsBooked: formData.seatsBooked,
        totalAmount: ride.pricePerSeat * formData.seatsBooked,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        bookingDate: new Date().toISOString(),
        pickupPoint: formData.pickupPoint,
        dropPoint: formData.dropPoint,
        specialRequests: formData.specialRequests,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const booking = await poolingAPI.bookRide(bookingData);
      
      // Create payment order
      await poolingAPI.createPaymentOrder(booking.id);
      
      toast.success('Booking created successfully!');
      onBookingComplete(booking.id);
    } catch (error) {
      toast.error('Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Your Ride with Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passengerName">Full Name</Label>
            <Input
              id="passengerName"
              value={formData.passengerName}
              onChange={(e) => setFormData(prev => ({ ...prev, passengerName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passengerPhone">Phone Number</Label>
            <Input
              id="passengerPhone"
              type="tel"
              value={formData.passengerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, passengerPhone: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seatsBooked">Number of Seats</Label>
            <Input
              id="seatsBooked"
              type="number"
              min="1"
              max={ride.availableSeats}
              value={formData.seatsBooked}
              onChange={(e) => setFormData(prev => ({ ...prev, seatsBooked: parseInt(e.target.value) }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupPoint">Pickup Point</Label>
            <Input
              id="pickupPoint"
              value={formData.pickupPoint}
              onChange={(e) => setFormData(prev => ({ ...prev, pickupPoint: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropPoint">Drop Point</Label>
            <Input
              id="dropPoint"
              value={formData.dropPoint}
              onChange={(e) => setFormData(prev => ({ ...prev, dropPoint: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea
              id="specialRequests"
              value={formData.specialRequests}
              onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-bold">₹{ride.pricePerSeat * formData.seatsBooked}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Book & Pay'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
