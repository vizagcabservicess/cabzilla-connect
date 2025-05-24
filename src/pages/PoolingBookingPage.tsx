
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { BookingFlowWithPayment } from '@/components/pooling/BookingFlowWithPayment';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingBooking } from '@/types/pooling';
import { Loader2 } from 'lucide-react';

export default function PoolingBookingPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const [ride, setRide] = useState<PoolingRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rideId) {
      fetchRideDetails(parseInt(rideId));
    }
  }, [rideId]);

  const fetchRideDetails = async (id: number) => {
    try {
      setLoading(true);
      const rideData = await poolingAPI.getRideDetails(id);
      setRide(rideData);
    } catch (error) {
      console.error('Error fetching ride details:', error);
      setError('Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingComplete = (booking: PoolingBooking) => {
    navigate('/pooling', { 
      state: { 
        message: 'Booking completed successfully!',
        booking 
      }
    });
  };

  const handleCancel = () => {
    navigate('/pooling');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-red-600 mb-4">{error || 'Ride not found'}</p>
          <button 
            onClick={() => navigate('/pooling')}
            className="text-blue-600 hover:underline"
          >
            Back to Pooling
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <BookingFlowWithPayment
          ride={ride}
          onBookingComplete={handleBookingComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
