
import React from 'react';
import { BookingFlow } from './BookingFlow';
import { PoolingRide, PoolingBooking } from '@/types/pooling';

interface BookingFlowWithPaymentProps {
  ride: PoolingRide;
  onBookingComplete: (booking: PoolingBooking) => void;
  onCancel: () => void;
}

export function BookingFlowWithPayment({ ride, onBookingComplete, onCancel }: BookingFlowWithPaymentProps) {
  return (
    <BookingFlow 
      ride={ride}
      onBookingComplete={onBookingComplete}
      onCancel={onCancel}
    />
  );
}
