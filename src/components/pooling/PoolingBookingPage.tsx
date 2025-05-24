
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { BookingFlow } from './BookingFlow';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { poolingAPI } from '@/services/api/poolingAPI';

const PoolingBookingPage = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();

  const { data: ride, isLoading, error } = useQuery({
    queryKey: ['pooling-ride', rideId],
    queryFn: () => poolingAPI.getRideDetails(Number(rideId)),
    enabled: !!rideId,
  });

  const handleBookingComplete = (bookingData: any) => {
    // Navigate to payment page with booking data
    navigate('/payment', { 
      state: { 
        bookingData,
        bookingType: 'pooling'
      } 
    });
  };

  const handleCancel = () => {
    navigate('/pooling');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading ride details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-red-600">Error loading ride details.</p>
            <Button onClick={handleCancel} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={handleCancel} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
          <h1 className="text-2xl font-bold">Book Your Ride</h1>
        </div>

        <BookingFlow
          ride={ride}
          onBookingComplete={handleBookingComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default PoolingBookingPage;
