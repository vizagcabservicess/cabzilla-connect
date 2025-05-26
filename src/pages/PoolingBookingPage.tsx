
import React from 'react';
import { useParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';

export default function PoolingBookingPage() {
  const { rideId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Book Ride #{rideId}</h1>
          <p className="text-gray-600">Booking functionality coming soon...</p>
        </div>
      </div>
    </div>
  );
}
