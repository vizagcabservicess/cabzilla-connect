
import React from 'react';
import { useParams } from 'react-router-dom';

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Booking Details</h1>
      <p className="mb-4">Booking ID: {bookingId}</p>
    </div>
  );
};

export default BookingDetailsPage;
