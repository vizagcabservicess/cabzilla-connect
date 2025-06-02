import React, { useState } from 'react';
import { PoolingRide, PoolingUser } from '@/types/pooling';
import { toast } from 'sonner';
import { poolingAPI } from '@/services/api/poolingAPI';

interface BookingModalProps {
  ride: PoolingRide;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: () => void;
  user: PoolingUser;
}

export function BookingModal({ ride, isOpen, onClose, onBookingComplete, user }: BookingModalProps) {
  const [seats, setSeats] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleBooking = async () => {
    if (seats > ride.availableSeats) {
      toast.error(`Only ${ride.availableSeats} seats available`);
      return;
    }
    setIsLoading(true);
    try {
      await poolingAPI.bookings.create({
        rideId: ride.id,
        userId: user.id,
        passengerName: user.name,
        passengerPhone: user.phone || '',
        passengerEmail: user.email,
        seatsBooked: seats,
        totalAmount: ride.pricePerSeat * seats,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        canCancelFree: true,
      });
      toast.success('Booking request sent successfully!');
      onBookingComplete();
      onClose();
    } catch (error) {
      toast.error('Failed to book ride. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Book Ride</h2>
        <div className="space-y-4">
          <div>
            <p className="font-semibold">Route</p>
            <p>{ride.fromLocation} → {ride.toLocation}</p>
          </div>
          <div>
            <p className="font-semibold">Departure</p>
            <p>{new Date(ride.departureTime).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-semibold">Provider</p>
            <p>{ride.providerName}</p>
          </div>
          <div>
            <p className="font-semibold">Price per seat</p>
            <p>₹{ride.pricePerSeat}</p>
          </div>
          <div>
            <label className="block font-semibold mb-2">Number of Seats</label>
            <input
              type="number"
              min={1}
              max={ride.availableSeats}
              value={seats}
              onChange={(e) => setSeats(Math.min(Number(e.target.value), ride.availableSeats))}
              className="border rounded p-2 w-full"
            />
          </div>
          <div>
            <label className="block font-semibold mb-2">Special Requests (Optional)</label>
            <textarea
              className="border rounded p-2 w-full"
              rows={3}
              placeholder="Any special requests or requirements..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleBooking}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
} 